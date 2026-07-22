import { Router } from "express";
import { PROTECTED_PROFILE_REQUIRED_NAV_ITEM_ID } from "@riptacrm/shared-types";
import type { AddProfileMemberInput, CreateProfileInput, DashboardType, UpdateProfileInput } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toProfile } from "../lib/mappers";
import { isRecordNotFoundError, isUniqueConstraintError } from "../lib/prismaErrors";
import { requirePermission } from "../lib/requirePermission";

export const profilesRouter = Router();

const WITH_RELATIONS = { navItems: true, members: true } as const;
const VALID_DASHBOARD_TYPES: DashboardType[] = ["frontline", "admin"];

profilesRouter.get("/profiles", requirePermission("access-management-config"), async (req, res) => {
  const where: Record<string, unknown> = {};
  if (req.query.includeArchived !== "true") where.archivedAt = null;
  if (typeof req.query.userId === "string" && req.query.userId.trim()) {
    where.members = { some: { userId: req.query.userId.trim() } };
  }

  const profiles = await prisma.profile.findMany({ where, include: WITH_RELATIONS, orderBy: { name: "asc" } });
  res.json({ results: await Promise.all(profiles.map(toProfile)) });
});

// Called by webchat-api to resolve an agent's default concurrent-chat capacity when they
// have no per-agent AgentCapacityOverride. A user can hold multiple non-archived profiles —
// take the most permissive (max), since a backend has no way to know which one is "active"
// for a given routing decision the way a live session would.
profilesRouter.get("/profiles/default-webchat-capacity", requirePermission(), async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  if (!userId) {
    return res.status(400).json({ error: "userId query parameter is required." });
  }

  const profiles = await prisma.profile.findMany({
    where: { archivedAt: null, members: { some: { userId } } },
    select: { maxConcurrentChats: true },
  });

  const maxConcurrentChats = profiles.length > 0 ? Math.max(...profiles.map((p) => p.maxConcurrentChats)) : null;
  res.json({ maxConcurrentChats });
});

profilesRouter.post("/profiles", requirePermission("access-management-config"), async (req, res) => {
  const body = req.body as Partial<CreateProfileInput>;
  if (!body.name?.trim()) {
    return res.status(400).json({ error: "name is required." });
  }
  if (!body.dashboardType || !VALID_DASHBOARD_TYPES.includes(body.dashboardType)) {
    return res.status(400).json({ error: `dashboardType must be one of ${VALID_DASHBOARD_TYPES.join(", ")}.` });
  }
  if (body.maxConcurrentChats !== undefined && (!Number.isInteger(body.maxConcurrentChats) || body.maxConcurrentChats < 0)) {
    return res.status(400).json({ error: "maxConcurrentChats must be a non-negative integer." });
  }

  try {
    const profile = await prisma.profile.create({
      data: {
        name: body.name.trim(),
        dashboardType: body.dashboardType,
        canStartInteractions: body.canStartInteractions ?? false,
        maxConcurrentChats: body.maxConcurrentChats,
      },
      include: WITH_RELATIONS,
    });
    res.status(201).json(await toProfile(profile));
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: `A profile named "${body.name}" already exists.` });
    }
    throw err;
  }
});

profilesRouter.get("/profiles/:id", requirePermission("access-management-config"), async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.params.id }, include: WITH_RELATIONS });
  if (!profile) return res.status(404).json({ error: "Profile not found." });
  res.json(await toProfile(profile));
});

profilesRouter.patch("/profiles/:id", requirePermission("access-management-config"), async (req, res) => {
  const existing = await prisma.profile.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Profile not found." });

  const body = req.body as Partial<UpdateProfileInput>;
  if (body.name !== undefined && !body.name.trim()) {
    return res.status(400).json({ error: "name cannot be empty." });
  }
  if (body.dashboardType !== undefined && !VALID_DASHBOARD_TYPES.includes(body.dashboardType)) {
    return res.status(400).json({ error: `dashboardType must be one of ${VALID_DASHBOARD_TYPES.join(", ")}.` });
  }
  if (body.maxConcurrentChats !== undefined && (!Number.isInteger(body.maxConcurrentChats) || body.maxConcurrentChats < 0)) {
    return res.status(400).json({ error: "maxConcurrentChats must be a non-negative integer." });
  }
  if (body.navItemIds !== undefined) {
    if (!Array.isArray(body.navItemIds)) {
      return res.status(400).json({ error: "navItemIds must be an array." });
    }
    if (existing.isProtected && !body.navItemIds.includes(PROTECTED_PROFILE_REQUIRED_NAV_ITEM_ID)) {
      return res.status(400).json({
        error: "This profile is protected and must always grant access to Access Management.",
      });
    }
  }

  try {
    const profile = await prisma.$transaction(async (tx) => {
      if (body.navItemIds) {
        await tx.profileNavItem.deleteMany({ where: { profileId: existing.id } });
        await tx.profileNavItem.createMany({
          data: body.navItemIds!.map((navItemId) => ({ profileId: existing.id, navItemId })),
        });
      }
      return tx.profile.update({
        where: { id: existing.id },
        data: {
          name: body.name?.trim(),
          dashboardType: body.dashboardType,
          canStartInteractions: body.canStartInteractions,
          maxConcurrentChats: body.maxConcurrentChats,
        },
        include: WITH_RELATIONS,
      });
    });
    res.json(await toProfile(profile));
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: `A profile named "${body.name}" already exists.` });
    }
    throw err;
  }
});

profilesRouter.delete("/profiles/:id", requirePermission("access-management-config"), async (req, res) => {
  const existing = await prisma.profile.findUnique({ where: { id: req.params.id }, include: WITH_RELATIONS });
  if (!existing) return res.status(204).end(); // already gone — DELETE is idempotent

  if (existing.isProtected) {
    return res.status(400).json({ error: "This profile is protected and cannot be deleted." });
  }
  if (existing.members.length > 0) {
    return res.status(409).json({ error: "Unassign all members before deleting this profile." });
  }

  await prisma.profile.delete({ where: { id: existing.id } });
  res.status(204).end();
});

profilesRouter.post("/profiles/:id/archive", requirePermission("access-management-config"), async (req, res) => {
  const existing = await prisma.profile.findUnique({ where: { id: req.params.id }, include: WITH_RELATIONS });
  if (!existing) return res.status(404).json({ error: "Profile not found." });

  if (existing.archivedAt) {
    return res.json(await toProfile(existing));
  }
  if (existing.isProtected) {
    return res.status(400).json({ error: "This profile is protected and cannot be archived." });
  }
  if (existing.members.length > 0) {
    return res.status(409).json({ error: "Unassign all members before archiving this profile." });
  }

  const profile = await prisma.profile.update({
    where: { id: existing.id },
    data: { archivedAt: new Date() },
    include: WITH_RELATIONS,
  });
  res.json(await toProfile(profile));
});

profilesRouter.post("/profiles/:id/members", requirePermission("access-management-config"), async (req, res) => {
  const body = req.body as Partial<AddProfileMemberInput>;
  if (!body.userId?.trim()) {
    return res.status(400).json({ error: "userId is required." });
  }

  const profile = await prisma.profile.findUnique({ where: { id: req.params.id } });
  if (!profile) return res.status(404).json({ error: "Profile not found." });

  try {
    await prisma.profileUser.create({
      data: { profileId: profile.id, userId: body.userId.trim() },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: "User is already assigned to this profile." });
    }
    throw err;
  }

  const updated = await prisma.profile.findUniqueOrThrow({ where: { id: profile.id }, include: WITH_RELATIONS });
  res.status(201).json(await toProfile(updated));
});

profilesRouter.delete("/profiles/:id/members/:userId", requirePermission("access-management-config"), async (req, res) => {
  try {
    await prisma.profileUser.delete({
      where: { profileId_userId: { profileId: req.params.id, userId: req.params.userId } },
    });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});
