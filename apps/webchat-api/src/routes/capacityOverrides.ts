import { Router } from "express";
import { prisma } from "../db";
import { toAgentCapacityOverride } from "../lib/mappers";
import { isRecordNotFoundError } from "../lib/prismaErrors";
import { requirePermission } from "../lib/requirePermission";

export const capacityOverridesRouter = Router();

capacityOverridesRouter.get("/capacity-overrides", requirePermission("webchat-config"), async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const overrides = await prisma.agentCapacityOverride.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { userId: "asc" },
  });
  res.json({ results: overrides.map(toAgentCapacityOverride) });
});

capacityOverridesRouter.put("/capacity-overrides/:userId", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as { maxConcurrentChats?: unknown };
  if (!Number.isInteger(body.maxConcurrentChats) || (body.maxConcurrentChats as number) < 0) {
    return res.status(400).json({ error: "maxConcurrentChats must be a non-negative integer." });
  }

  const override = await prisma.agentCapacityOverride.upsert({
    where: { userId: req.params.userId },
    create: { userId: req.params.userId, maxConcurrentChats: body.maxConcurrentChats as number },
    update: { maxConcurrentChats: body.maxConcurrentChats as number },
  });
  res.json(toAgentCapacityOverride(override));
});

capacityOverridesRouter.delete("/capacity-overrides/:userId", requirePermission("webchat-config"), async (req, res) => {
  try {
    await prisma.agentCapacityOverride.delete({ where: { userId: req.params.userId } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});
