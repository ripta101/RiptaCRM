import { Router } from "express";
import type { CreateRoutingRuleInput, RoutingRuleMatchType, UpdateRoutingRuleInput } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toRoutingRule } from "../lib/mappers";
import { isRecordNotFoundError } from "../lib/prismaErrors";
import { requirePermission } from "../lib/requirePermission";

export const routingRulesRouter = Router();

const VALID_MATCH_TYPES: RoutingRuleMatchType[] = ["EXACT", "PREFIX"];

routingRulesRouter.get("/routing-rules", requirePermission("webchat-config"), async (req, res) => {
  const siteId = typeof req.query.siteId === "string" ? req.query.siteId : undefined;
  const rules = await prisma.routingRule.findMany({
    where: siteId ? { siteId } : undefined,
    orderBy: [{ siteId: "asc" }, { priority: "asc" }],
  });
  res.json({ results: rules.map(toRoutingRule) });
});

routingRulesRouter.post("/routing-rules", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as Partial<CreateRoutingRuleInput>;
  if (!body.siteId?.trim()) return res.status(400).json({ error: "siteId is required." });
  if (!body.pattern?.trim()) return res.status(400).json({ error: "pattern is required." });
  if (body.matchType !== undefined && !VALID_MATCH_TYPES.includes(body.matchType)) {
    return res.status(400).json({ error: `matchType must be one of ${VALID_MATCH_TYPES.join(", ")}.` });
  }
  if (!body.autoReplyText?.trim()) return res.status(400).json({ error: "autoReplyText is required." });
  if (!body.targetQueueId?.trim()) return res.status(400).json({ error: "targetQueueId is required." });

  const rule = await prisma.routingRule.create({
    data: {
      siteId: body.siteId,
      pattern: body.pattern.trim(),
      matchType: body.matchType ?? "PREFIX",
      priority: body.priority ?? 0,
      autoReplyText: body.autoReplyText.trim(),
      targetQueueId: body.targetQueueId,
      isActive: body.isActive ?? true,
    },
  });
  res.status(201).json(toRoutingRule(rule));
});

routingRulesRouter.get("/routing-rules/:id", requirePermission("webchat-config"), async (req, res) => {
  const rule = await prisma.routingRule.findUnique({ where: { id: req.params.id } });
  if (!rule) return res.status(404).json({ error: "Routing rule not found." });
  res.json(toRoutingRule(rule));
});

routingRulesRouter.patch("/routing-rules/:id", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as Partial<UpdateRoutingRuleInput>;
  if (body.pattern !== undefined && !body.pattern.trim()) {
    return res.status(400).json({ error: "pattern cannot be empty." });
  }
  if (body.matchType !== undefined && !VALID_MATCH_TYPES.includes(body.matchType)) {
    return res.status(400).json({ error: `matchType must be one of ${VALID_MATCH_TYPES.join(", ")}.` });
  }
  if (body.autoReplyText !== undefined && !body.autoReplyText.trim()) {
    return res.status(400).json({ error: "autoReplyText cannot be empty." });
  }

  try {
    const rule = await prisma.routingRule.update({
      where: { id: req.params.id },
      data: {
        pattern: body.pattern?.trim(),
        matchType: body.matchType,
        priority: body.priority,
        autoReplyText: body.autoReplyText?.trim(),
        targetQueueId: body.targetQueueId,
        isActive: body.isActive,
      },
    });
    res.json(toRoutingRule(rule));
  } catch (err) {
    if (isRecordNotFoundError(err)) return res.status(404).json({ error: "Routing rule not found." });
    throw err;
  }
});

routingRulesRouter.delete("/routing-rules/:id", requirePermission("webchat-config"), async (req, res) => {
  try {
    await prisma.routingRule.delete({ where: { id: req.params.id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});
