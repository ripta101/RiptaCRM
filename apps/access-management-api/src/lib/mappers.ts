import type {
  MenuItem as PrismaMenuItem,
  Profile as PrismaProfile,
  ProfileNavItem as PrismaProfileNavItem,
  ProfileUser as PrismaProfileUser,
} from "../../generated/prisma";
import { ALL_NAV_ITEMS } from "@riptacrm/shared-types";
import type { CustomMenuItem, DashboardType, MenuItemDisplayType, Profile } from "@riptacrm/shared-types";
import { prisma } from "../db";

const BUILT_IN_NAV_ITEM_IDS = new Set(ALL_NAV_ITEMS.map((item) => item.id));

type ProfileWithRelations = PrismaProfile & {
  navItems: PrismaProfileNavItem[];
  members: PrismaProfileUser[];
};

export function toCustomMenuItem(m: PrismaMenuItem): CustomMenuItem {
  return {
    id: m.id,
    label: m.label,
    displayType: m.displayType as MenuItemDisplayType,
    iframeUrl: m.iframeUrl,
    remoteEntryUrl: m.remoteEntryUrl,
    remoteName: m.remoteName,
    exposedModule: m.exposedModule,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

// Custom menu items aren't in the compile-time nav-item registry, so a Profile's response
// resolves the granted-but-unknown ids into full objects here — the only way a caller
// (auth-api's login flow, the Access Management MFE) can know their label/type/url.
export async function toProfile(p: ProfileWithRelations): Promise<Profile> {
  const navItemIds = p.navItems.map((n) => n.navItemId);
  const customIds = navItemIds.filter((id) => !BUILT_IN_NAV_ITEM_IDS.has(id));
  const customMenuItems = customIds.length
    ? (await prisma.menuItem.findMany({ where: { id: { in: customIds } } })).map(toCustomMenuItem)
    : [];

  return {
    id: p.id,
    name: p.name,
    isProtected: p.isProtected,
    dashboardType: p.dashboardType as DashboardType,
    canStartInteractions: p.canStartInteractions,
    navItemIds,
    customMenuItems,
    memberUserIds: p.members.map((m) => m.userId),
    archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
