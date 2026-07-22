import { Router } from "express";
import type { CreateAgentStatusOptionInput, UpdateAgentStatusOptionInput } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toAgentStatus, toAgentStatusOption } from "../lib/mappers";
import { isRecordNotFoundError, isUniqueConstraintError } from "../lib/prismaErrors";
import { requirePermission } from "../lib/requirePermission";
import { extractUserId } from "./conversations";

export const agentStatusRouter = Router();

// Non-sensitive config data — any authenticated user can read the option list, since both
// the agent's own status picker (TopBar) and the admin editor need it.
agentStatusRouter.get("/agent-status-options", requirePermission(), async (_req, res) => {
  const options = await prisma.agentStatusOption.findMany({ orderBy: { label: "asc" } });
  res.json({ results: options.map(toAgentStatusOption) });
});

agentStatusRouter.post("/agent-status-options", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as Partial<CreateAgentStatusOptionInput>;
  if (!body.label?.trim()) return res.status(400).json({ error: "label is required." });

  try {
    const option = await prisma.agentStatusOption.create({
      data: { label: body.label.trim(), isAvailableForChats: body.isAvailableForChats ?? false },
    });
    res.status(201).json(toAgentStatusOption(option));
  } catch (err) {
    if (isUniqueConstraintError(err)) return res.status(409).json({ error: "A status with that label already exists." });
    throw err;
  }
});

agentStatusRouter.patch("/agent-status-options/:id", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as Partial<UpdateAgentStatusOptionInput>;
  if (body.label !== undefined && !body.label.trim()) {
    return res.status(400).json({ error: "label cannot be empty." });
  }

  try {
    const option = await prisma.agentStatusOption.update({
      where: { id: req.params.id },
      data: { label: body.label?.trim(), isAvailableForChats: body.isAvailableForChats },
    });
    res.json(toAgentStatusOption(option));
  } catch (err) {
    if (isRecordNotFoundError(err)) return res.status(404).json({ error: "Status not found." });
    if (isUniqueConstraintError(err)) return res.status(409).json({ error: "A status with that label already exists." });
    throw err;
  }
});

// Idempotent, same as every other delete route here. Any agent currently using this option
// (AgentStatus.optionId) is SetNull'd back to "no status set" by the schema's onDelete —
// not left dangling on a deleted option.
agentStatusRouter.delete("/agent-status-options/:id", requirePermission("webchat-config"), async (req, res) => {
  try {
    await prisma.agentStatusOption.delete({ where: { id: req.params.id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
  }
  res.status(204).end();
});

agentStatusRouter.get("/agent-status/me", requirePermission("webchat-agent"), async (req, res) => {
  const userId = extractUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "Authentication required." });

  const status = await prisma.agentStatus.findUnique({ where: { userId } });
  res.json(status ? toAgentStatus(status) : null);
});

agentStatusRouter.put("/agent-status/me", requirePermission("webchat-agent"), async (req, res) => {
  const userId = extractUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "Authentication required." });

  const body = req.body as { optionId?: string | null };
  if (body.optionId !== undefined && body.optionId !== null) {
    const option = await prisma.agentStatusOption.findUnique({ where: { id: body.optionId } });
    if (!option) return res.status(400).json({ error: "Unknown status option." });
  }

  const status = await prisma.agentStatus.upsert({
    where: { userId },
    create: { userId, optionId: body.optionId ?? null },
    update: { optionId: body.optionId ?? null },
  });
  res.json(toAgentStatus(status));
});

// Admin/service-to-service escape hatch for setting an arbitrary agent's status directly
// (e.g. ops troubleshooting, or e2e test setup for a *different* logged-in user than the
// one driving the browser) — mirrors capacity-overrides' upsert-by-userId shape. Distinct
// from /agent-status/me above, which only ever acts on the calling token's own sub. Must be
// registered AFTER the /me routes — Express would otherwise match "me" as this route's
// :userId param first, since it's declared with the same method+prefix.
agentStatusRouter.put("/agent-status/:userId", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as { optionId?: string | null };
  if (body.optionId !== undefined && body.optionId !== null) {
    const option = await prisma.agentStatusOption.findUnique({ where: { id: body.optionId } });
    if (!option) return res.status(400).json({ error: "Unknown status option." });
  }

  const status = await prisma.agentStatus.upsert({
    where: { userId: req.params.userId },
    create: { userId: req.params.userId, optionId: body.optionId ?? null },
    update: { optionId: body.optionId ?? null },
  });
  res.json(toAgentStatus(status));
});
