import { Router } from "express";
import type { Prisma } from "../../generated/prisma";
import { prisma } from "../db";
import { toActionLogEntry } from "../lib/mappers";
import { requirePermission } from "../lib/requirePermission";

export const actionLogRouter = Router();

actionLogRouter.get("/action-log", requirePermission("case-management-config"), async (req, res) => {
  const query = req.query as Record<string, string | undefined>;
  const where: Prisma.ActionLogEntryWhereInput = {};

  if (query.caseInstanceId) where.caseInstanceId = query.caseInstanceId;
  if (query.caseTypeId) where.stageHistory = { caseInstance: { caseTypeId: query.caseTypeId } };
  if (query.from || query.to) {
    where.firedAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }

  const entries = await prisma.actionLogEntry.findMany({
    where,
    orderBy: { firedAt: "desc" },
  });

  res.json({ results: entries.map(toActionLogEntry) });
});
