import type {
  Profile as PrismaProfile,
  ProfileNavItem as PrismaProfileNavItem,
  ProfileUser as PrismaProfileUser,
} from "../../generated/prisma";
import type { DashboardType, Profile } from "@riptacrm/shared-types";

type ProfileWithRelations = PrismaProfile & {
  navItems: PrismaProfileNavItem[];
  members: PrismaProfileUser[];
};

export function toProfile(p: ProfileWithRelations): Profile {
  return {
    id: p.id,
    name: p.name,
    isProtected: p.isProtected,
    dashboardType: p.dashboardType as DashboardType,
    canStartInteractions: p.canStartInteractions,
    navItemIds: p.navItems.map((n) => n.navItemId),
    memberUserIds: p.members.map((m) => m.userId),
    archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
