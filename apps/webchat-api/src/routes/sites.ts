import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { CreateSiteInput, UpdateSiteInput } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toSite } from "../lib/mappers";
import { isRecordNotFoundError, isUniqueConstraintError } from "../lib/prismaErrors";
import { requirePermission } from "../lib/requirePermission";

export const sitesRouter = Router();

function generateSiteKey(): string {
  return randomUUID().replace(/-/g, "");
}

sitesRouter.get("/sites", requirePermission("webchat-config"), async (_req, res) => {
  const sites = await prisma.site.findMany({ orderBy: { name: "asc" } });
  res.json({ results: sites.map(toSite) });
});

sitesRouter.post("/sites", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as Partial<CreateSiteInput>;
  if (!body.name?.trim()) {
    return res.status(400).json({ error: "name is required." });
  }

  const site = await prisma.site.create({
    data: {
      name: body.name.trim(),
      siteKey: generateSiteKey(),
      allowedOrigins: body.allowedOrigins?.trim() || null,
      defaultQueueId: body.defaultQueueId ?? null,
    },
  });
  res.status(201).json(toSite(site));
});

sitesRouter.get("/sites/:id", requirePermission("webchat-config"), async (req, res) => {
  const site = await prisma.site.findUnique({ where: { id: req.params.id } });
  if (!site) return res.status(404).json({ error: "Site not found." });
  res.json(toSite(site));
});

sitesRouter.patch("/sites/:id", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as Partial<UpdateSiteInput>;
  if (body.name !== undefined && !body.name.trim()) {
    return res.status(400).json({ error: "name cannot be empty." });
  }

  try {
    const site = await prisma.site.update({
      where: { id: req.params.id },
      data: {
        name: body.name?.trim(),
        allowedOrigins: body.allowedOrigins === undefined ? undefined : body.allowedOrigins?.trim() || null,
        defaultQueueId: body.defaultQueueId,
        isActive: body.isActive,
      },
    });
    res.json(toSite(site));
  } catch (err) {
    if (isRecordNotFoundError(err)) return res.status(404).json({ error: "Site not found." });
    throw err;
  }
});

sitesRouter.delete("/sites/:id", requirePermission("webchat-config"), async (req, res) => {
  try {
    await prisma.site.delete({ where: { id: req.params.id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});

sitesRouter.post("/sites/:id/regenerate-key", requirePermission("webchat-config"), async (req, res) => {
  try {
    const site = await prisma.site.update({
      where: { id: req.params.id },
      data: { siteKey: generateSiteKey() },
    });
    res.json(toSite(site));
  } catch (err) {
    if (isRecordNotFoundError(err)) return res.status(404).json({ error: "Site not found." });
    if (isUniqueConstraintError(err)) {
      // Astronomically unlikely (a fresh random key colliding), but keep the route honest.
      return res.status(409).json({ error: "Failed to generate a unique site key. Try again." });
    }
    throw err;
  }
});
