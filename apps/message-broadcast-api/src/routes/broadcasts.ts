import { Router } from "express";
import { ALL_USER_ROLES } from "@riptacrm/shared-types";
import type { BroadcastPriority, CreateMessageBroadcastInput, UpdateMessageBroadcastInput } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { priorityFromLabel, toMessageBroadcastSummary } from "../lib/mappers";
import { sanitizeBroadcastHtml } from "../lib/sanitizeBroadcastHtml";
import { isRecordNotFoundError } from "../lib/prismaErrors";

export const broadcastsRouter = Router();

const VALID_PRIORITIES: BroadcastPriority[] = ["LOW", "NORMAL", "HIGH"];
const INCLUDE_TARGET_ROLES = { targetRoles: true } as const;

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

broadcastsRouter.get("/broadcasts/active", async (req, res) => {
  const role = req.query.role;
  if (typeof role !== "string" || !role.trim()) {
    return res.status(400).json({ error: "role query parameter is required." });
  }

  const now = new Date();
  const broadcasts = await prisma.messageBroadcast.findMany({
    where: {
      startAt: { lte: now },
      endAt: { gte: now },
      canceledAt: null,
      targetRoles: { some: { role } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: INCLUDE_TARGET_ROLES,
  });
  res.json({ results: broadcasts.map(toMessageBroadcastSummary) });
});

broadcastsRouter.get("/broadcasts", async (_req, res) => {
  const broadcasts = await prisma.messageBroadcast.findMany({
    orderBy: { createdAt: "desc" },
    include: INCLUDE_TARGET_ROLES,
  });
  res.json({ results: broadcasts.map(toMessageBroadcastSummary) });
});

broadcastsRouter.get("/broadcasts/:id", async (req, res) => {
  const broadcast = await prisma.messageBroadcast.findUnique({
    where: { id: req.params.id },
    include: INCLUDE_TARGET_ROLES,
  });
  if (!broadcast) return res.status(404).json({ error: "Broadcast not found." });
  res.json(toMessageBroadcastSummary(broadcast));
});

broadcastsRouter.post("/broadcasts", async (req, res) => {
  const body = req.body as Partial<CreateMessageBroadcastInput>;

  if (!body.title?.trim()) {
    return res.status(400).json({ error: "title is required." });
  }
  if (!body.bodyHtml?.trim()) {
    return res.status(400).json({ error: "bodyHtml is required." });
  }
  if (!Array.isArray(body.targetRoles) || body.targetRoles.length === 0) {
    return res.status(400).json({ error: "targetRoles must be a non-empty array." });
  }
  const unknownRole = body.targetRoles.find((r) => !ALL_USER_ROLES.includes(r as (typeof ALL_USER_ROLES)[number]));
  if (unknownRole) {
    return res.status(400).json({ error: `Unknown target role "${unknownRole}".` });
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
      targetRoles: { create: body.targetRoles.map((role) => ({ role })) },
    },
    include: INCLUDE_TARGET_ROLES,
  });
  res.status(201).json(toMessageBroadcastSummary(broadcast));
});

broadcastsRouter.patch("/broadcasts/:id", async (req, res) => {
  const existing = await prisma.messageBroadcast.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Broadcast not found." });

  const body = req.body as Partial<UpdateMessageBroadcastInput>;

  if (body.title !== undefined && !body.title.trim()) {
    return res.status(400).json({ error: "title cannot be empty." });
  }
  if (body.bodyHtml !== undefined && !body.bodyHtml.trim()) {
    return res.status(400).json({ error: "bodyHtml cannot be empty." });
  }
  if (body.targetRoles !== undefined) {
    if (!Array.isArray(body.targetRoles) || body.targetRoles.length === 0) {
      return res.status(400).json({ error: "targetRoles must be a non-empty array." });
    }
    const unknownRole = body.targetRoles.find((r) => !ALL_USER_ROLES.includes(r as (typeof ALL_USER_ROLES)[number]));
    if (unknownRole) {
      return res.status(400).json({ error: `Unknown target role "${unknownRole}".` });
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
    if (body.targetRoles) {
      await tx.messageBroadcastTargetRole.deleteMany({ where: { broadcastId: existing.id } });
      await tx.messageBroadcastTargetRole.createMany({
        data: body.targetRoles.map((role) => ({ broadcastId: existing.id, role })),
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
      include: INCLUDE_TARGET_ROLES,
    });
  });
  res.json(toMessageBroadcastSummary(broadcast));
});

broadcastsRouter.post("/broadcasts/:id/cancel", async (req, res) => {
  const existing = await prisma.messageBroadcast.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Broadcast not found." });

  if (existing.canceledAt) {
    const current = await prisma.messageBroadcast.findUniqueOrThrow({
      where: { id: existing.id },
      include: INCLUDE_TARGET_ROLES,
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
    include: INCLUDE_TARGET_ROLES,
  });
  res.json(toMessageBroadcastSummary(broadcast));
});

broadcastsRouter.delete("/broadcasts/:id", async (req, res) => {
  try {
    await prisma.messageBroadcast.delete({ where: { id: req.params.id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});
