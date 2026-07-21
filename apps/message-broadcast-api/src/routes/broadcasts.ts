import { Router } from "express";
import type { BroadcastPriority, CreateMessageBroadcastInput, UpdateMessageBroadcastInput } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { priorityFromLabel, toMessageBroadcastSummary } from "../lib/mappers";
import { sanitizeBroadcastHtml } from "../lib/sanitizeBroadcastHtml";
import { isRecordNotFoundError } from "../lib/prismaErrors";
import { requirePermission } from "../lib/requirePermission";

export const broadcastsRouter = Router();

const VALID_PRIORITIES: BroadcastPriority[] = ["LOW", "NORMAL", "HIGH"];
const INCLUDE_TARGET_PROFILES = { targetProfiles: true } as const;

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

broadcastsRouter.get("/broadcasts/active", requirePermission(), async (req, res) => {
  const profileId = req.query.profileId;
  if (typeof profileId !== "string" || !profileId.trim()) {
    return res.status(400).json({ error: "profileId query parameter is required." });
  }

  const now = new Date();
  const broadcasts = await prisma.messageBroadcast.findMany({
    where: {
      startAt: { lte: now },
      endAt: { gte: now },
      canceledAt: null,
      targetProfiles: { some: { profileId } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: INCLUDE_TARGET_PROFILES,
  });
  res.json({ results: broadcasts.map(toMessageBroadcastSummary) });
});

broadcastsRouter.get("/broadcasts", requirePermission("broadcast-config"), async (_req, res) => {
  const broadcasts = await prisma.messageBroadcast.findMany({
    orderBy: { createdAt: "desc" },
    include: INCLUDE_TARGET_PROFILES,
  });
  res.json({ results: broadcasts.map(toMessageBroadcastSummary) });
});

broadcastsRouter.get("/broadcasts/:id", requirePermission("broadcast-config"), async (req, res) => {
  const broadcast = await prisma.messageBroadcast.findUnique({
    where: { id: req.params.id },
    include: INCLUDE_TARGET_PROFILES,
  });
  if (!broadcast) return res.status(404).json({ error: "Broadcast not found." });
  res.json(toMessageBroadcastSummary(broadcast));
});

broadcastsRouter.post("/broadcasts", requirePermission("broadcast-config"), async (req, res) => {
  const body = req.body as Partial<CreateMessageBroadcastInput>;

  if (!body.title?.trim()) {
    return res.status(400).json({ error: "title is required." });
  }
  if (!body.bodyHtml?.trim()) {
    return res.status(400).json({ error: "bodyHtml is required." });
  }
  if (!Array.isArray(body.targetProfileIds) || body.targetProfileIds.length === 0) {
    return res.status(400).json({ error: "targetProfileIds must be a non-empty array." });
  }
  const startAt = parseDate(body.startAt);
  const endAt = parseDate(body.endAt);
  if (!startAt || !endAt) {
    return res.status(400).json({ error: "startAt and endAt must be valid dates." });
  }
  if (startAt >= endAt) {
    return res.status(400).json({ error: "startAt must be before endAt." });
  }
  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
    return res.status(400).json({ error: `priority must be one of ${VALID_PRIORITIES.join(", ")}.` });
  }

  const broadcast = await prisma.messageBroadcast.create({
    data: {
      title: body.title.trim(),
      bodyHtml: sanitizeBroadcastHtml(body.bodyHtml),
      priority: priorityFromLabel(body.priority),
      startAt,
      endAt,
      createdByUserId: body.createdByUserId ?? null,
      targetProfiles: { create: body.targetProfileIds.map((profileId) => ({ profileId })) },
    },
    include: INCLUDE_TARGET_PROFILES,
  });
  res.status(201).json(toMessageBroadcastSummary(broadcast));
});

broadcastsRouter.patch("/broadcasts/:id", requirePermission("broadcast-config"), async (req, res) => {
  const existing = await prisma.messageBroadcast.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Broadcast not found." });

  const body = req.body as Partial<UpdateMessageBroadcastInput>;

  if (body.title !== undefined && !body.title.trim()) {
    return res.status(400).json({ error: "title cannot be empty." });
  }
  if (body.bodyHtml !== undefined && !body.bodyHtml.trim()) {
    return res.status(400).json({ error: "bodyHtml cannot be empty." });
  }
  if (body.targetProfileIds !== undefined) {
    if (!Array.isArray(body.targetProfileIds) || body.targetProfileIds.length === 0) {
      return res.status(400).json({ error: "targetProfileIds must be a non-empty array." });
    }
  }

  let startAt = existing.startAt;
  let endAt = existing.endAt;
  if (body.startAt !== undefined) {
    const parsed = parseDate(body.startAt);
    if (!parsed) return res.status(400).json({ error: "startAt must be a valid date." });
    startAt = parsed;
  }
  if (body.endAt !== undefined) {
    const parsed = parseDate(body.endAt);
    if (!parsed) return res.status(400).json({ error: "endAt must be a valid date." });
    endAt = parsed;
  }
  if (startAt >= endAt) {
    return res.status(400).json({ error: "startAt must be before endAt." });
  }
  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
    return res.status(400).json({ error: `priority must be one of ${VALID_PRIORITIES.join(", ")}.` });
  }

  const broadcast = await prisma.$transaction(async (tx) => {
    if (body.targetProfileIds) {
      await tx.messageBroadcastTargetProfile.deleteMany({ where: { broadcastId: existing.id } });
      await tx.messageBroadcastTargetProfile.createMany({
        data: body.targetProfileIds.map((profileId) => ({ broadcastId: existing.id, profileId })),
      });
    }
    return tx.messageBroadcast.update({
      where: { id: existing.id },
      data: {
        title: body.title?.trim(),
        bodyHtml: body.bodyHtml ? sanitizeBroadcastHtml(body.bodyHtml) : undefined,
        priority: body.priority !== undefined ? priorityFromLabel(body.priority) : undefined,
        startAt,
        endAt,
      },
      include: INCLUDE_TARGET_PROFILES,
    });
  });
  res.json(toMessageBroadcastSummary(broadcast));
});

broadcastsRouter.post("/broadcasts/:id/cancel", requirePermission("broadcast-config"), async (req, res) => {
  const existing = await prisma.messageBroadcast.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Broadcast not found." });

  if (existing.canceledAt) {
    const current = await prisma.messageBroadcast.findUniqueOrThrow({
      where: { id: existing.id },
      include: INCLUDE_TARGET_PROFILES,
    });
    return res.json(toMessageBroadcastSummary(current));
  }

  const now = new Date();
  const broadcast = await prisma.messageBroadcast.update({
    where: { id: existing.id },
    data: {
      canceledAt: now,
      endAt: existing.endAt > now ? now : existing.endAt,
    },
    include: INCLUDE_TARGET_PROFILES,
  });
  res.json(toMessageBroadcastSummary(broadcast));
});

broadcastsRouter.delete("/broadcasts/:id", requirePermission("broadcast-config"), async (req, res) => {
  try {
    await prisma.messageBroadcast.delete({ where: { id: req.params.id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});
