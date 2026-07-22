import { Router } from "express";
import type { AddWebChatQueueMemberInput, CreateWebChatQueueInput, UpdateWebChatQueueInput } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toWebChatQueue } from "../lib/mappers";
import { isRecordNotFoundError, isUniqueConstraintError } from "../lib/prismaErrors";
import { requirePermission } from "../lib/requirePermission";

export const queuesRouter = Router();

const WITH_MEMBERS = { members: true } as const;

queuesRouter.get("/queues", requirePermission("webchat-config"), async (_req, res) => {
  const queues = await prisma.webChatQueue.findMany({ include: WITH_MEMBERS, orderBy: { name: "asc" } });
  res.json({ results: queues.map(toWebChatQueue) });
});

queuesRouter.post("/queues", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as Partial<CreateWebChatQueueInput>;
  if (!body.name?.trim()) {
    return res.status(400).json({ error: "name is required." });
  }

  try {
    const queue = await prisma.webChatQueue.create({
      data: { name: body.name.trim() },
      include: WITH_MEMBERS,
    });
    res.status(201).json(toWebChatQueue(queue));
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: `A queue named "${body.name}" already exists.` });
    }
    throw err;
  }
});

queuesRouter.get("/queues/:id", requirePermission("webchat-config"), async (req, res) => {
  const queue = await prisma.webChatQueue.findUnique({ where: { id: req.params.id }, include: WITH_MEMBERS });
  if (!queue) return res.status(404).json({ error: "Queue not found." });
  res.json(toWebChatQueue(queue));
});

queuesRouter.patch("/queues/:id", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as Partial<UpdateWebChatQueueInput>;
  if (body.name !== undefined && !body.name.trim()) {
    return res.status(400).json({ error: "name cannot be empty." });
  }

  try {
    const queue = await prisma.webChatQueue.update({
      where: { id: req.params.id },
      data: { name: body.name?.trim(), autoPopup: body.autoPopup },
      include: WITH_MEMBERS,
    });
    res.json(toWebChatQueue(queue));
  } catch (err) {
    if (isRecordNotFoundError(err)) return res.status(404).json({ error: "Queue not found." });
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: `A queue named "${body.name}" already exists.` });
    }
    throw err;
  }
});

queuesRouter.delete("/queues/:id", requirePermission("webchat-config"), async (req, res) => {
  try {
    await prisma.webChatQueue.delete({ where: { id: req.params.id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});

queuesRouter.post("/queues/:id/members", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as Partial<AddWebChatQueueMemberInput>;
  if (!body.userId?.trim()) {
    return res.status(400).json({ error: "userId is required." });
  }

  const queue = await prisma.webChatQueue.findUnique({ where: { id: req.params.id } });
  if (!queue) return res.status(404).json({ error: "Queue not found." });

  try {
    await prisma.webChatQueueMember.create({
      data: { queueId: queue.id, userId: body.userId.trim() },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: "User is already a member of this queue." });
    }
    throw err;
  }

  const updated = await prisma.webChatQueue.findUniqueOrThrow({ where: { id: queue.id }, include: WITH_MEMBERS });
  res.status(201).json(toWebChatQueue(updated));
});

queuesRouter.delete("/queues/:id/members/:userId", requirePermission("webchat-config"), async (req, res) => {
  try {
    await prisma.webChatQueueMember.delete({
      where: { queueId_userId: { queueId: req.params.id, userId: req.params.userId } },
    });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});
