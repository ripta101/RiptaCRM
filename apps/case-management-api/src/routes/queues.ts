import { Router } from "express";
import type { AddQueueMemberInput, CreateQueueInput, UpdateQueueInput } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toQueue } from "../lib/mappers";
import { isRecordNotFoundError, isUniqueConstraintError } from "../lib/prismaErrors";

export const queuesRouter = Router();

const WITH_MEMBERS = { members: true } as const;

queuesRouter.get("/queues", async (_req, res) => {
  const queues = await prisma.queue.findMany({ include: WITH_MEMBERS, orderBy: { name: "asc" } });
  res.json({ results: queues.map(toQueue) });
});

queuesRouter.post("/queues", async (req, res) => {
  const body = req.body as Partial<CreateQueueInput>;
  if (!body.name?.trim()) {
    return res.status(400).json({ error: "name is required." });
  }

  try {
    const queue = await prisma.queue.create({
      data: { name: body.name.trim() },
      include: WITH_MEMBERS,
    });
    res.status(201).json(toQueue(queue));
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: `A queue named "${body.name}" already exists.` });
    }
    throw err;
  }
});

queuesRouter.get("/queues/:id", async (req, res) => {
  const queue = await prisma.queue.findUnique({ where: { id: req.params.id }, include: WITH_MEMBERS });
  if (!queue) return res.status(404).json({ error: "Queue not found." });
  res.json(toQueue(queue));
});

queuesRouter.patch("/queues/:id", async (req, res) => {
  const body = req.body as Partial<UpdateQueueInput>;
  if (body.name !== undefined && !body.name.trim()) {
    return res.status(400).json({ error: "name cannot be empty." });
  }

  try {
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: { name: body.name?.trim() },
      include: WITH_MEMBERS,
    });
    res.json(toQueue(queue));
  } catch (err) {
    if (isRecordNotFoundError(err)) return res.status(404).json({ error: "Queue not found." });
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: `A queue named "${body.name}" already exists.` });
    }
    throw err;
  }
});

queuesRouter.delete("/queues/:id", async (req, res) => {
  try {
    await prisma.queue.delete({ where: { id: req.params.id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});

queuesRouter.post("/queues/:id/members", async (req, res) => {
  const body = req.body as Partial<AddQueueMemberInput>;
  if (!body.userId?.trim()) {
    return res.status(400).json({ error: "userId is required." });
  }

  const queue = await prisma.queue.findUnique({ where: { id: req.params.id } });
  if (!queue) return res.status(404).json({ error: "Queue not found." });

  try {
    await prisma.queueMember.create({
      data: { queueId: queue.id, userId: body.userId.trim() },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: "User is already a member of this queue." });
    }
    throw err;
  }

  const updated = await prisma.queue.findUniqueOrThrow({ where: { id: queue.id }, include: WITH_MEMBERS });
  res.status(201).json(toQueue(updated));
});

queuesRouter.delete("/queues/:id/members/:userId", async (req, res) => {
  try {
    await prisma.queueMember.delete({
      where: { queueId_userId: { queueId: req.params.id, userId: req.params.userId } },
    });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});
