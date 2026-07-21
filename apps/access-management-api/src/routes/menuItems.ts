import { Router } from "express";
import type { CreateMenuItemInput, MenuItemDisplayType, UpdateMenuItemInput } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toCustomMenuItem } from "../lib/mappers";
import { isRecordNotFoundError } from "../lib/prismaErrors";

export const menuItemsRouter = Router();

const VALID_DISPLAY_TYPES: MenuItemDisplayType[] = ["IFRAME", "MFE"];

function validationError(body: Partial<CreateMenuItemInput | UpdateMenuItemInput>, displayType: MenuItemDisplayType): string | null {
  if (displayType === "IFRAME" && !body.iframeUrl?.trim()) {
    return "iframeUrl is required when displayType is IFRAME.";
  }
  if (displayType === "MFE" && (!body.remoteEntryUrl?.trim() || !body.remoteName?.trim() || !body.exposedModule?.trim())) {
    return "remoteEntryUrl, remoteName, and exposedModule are all required when displayType is MFE.";
  }
  return null;
}

menuItemsRouter.get("/menu-items", async (_req, res) => {
  const items = await prisma.menuItem.findMany({ orderBy: { label: "asc" } });
  res.json({ results: items.map(toCustomMenuItem) });
});

menuItemsRouter.post("/menu-items", async (req, res) => {
  const body = req.body as Partial<CreateMenuItemInput>;
  if (!body.label?.trim()) {
    return res.status(400).json({ error: "label is required." });
  }
  if (!body.displayType || !VALID_DISPLAY_TYPES.includes(body.displayType)) {
    return res.status(400).json({ error: `displayType must be one of ${VALID_DISPLAY_TYPES.join(", ")}.` });
  }
  const error = validationError(body, body.displayType);
  if (error) return res.status(400).json({ error });

  const item = await prisma.menuItem.create({
    data: {
      label: body.label.trim(),
      displayType: body.displayType,
      iframeUrl: body.displayType === "IFRAME" ? body.iframeUrl!.trim() : null,
      remoteEntryUrl: body.displayType === "MFE" ? body.remoteEntryUrl!.trim() : null,
      remoteName: body.displayType === "MFE" ? body.remoteName!.trim() : null,
      exposedModule: body.displayType === "MFE" ? body.exposedModule!.trim() : null,
    },
  });
  res.status(201).json(toCustomMenuItem(item));
});

menuItemsRouter.get("/menu-items/:id", async (req, res) => {
  const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "Menu item not found." });
  res.json(toCustomMenuItem(item));
});

menuItemsRouter.patch("/menu-items/:id", async (req, res) => {
  const existing = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Menu item not found." });

  const body = req.body as Partial<UpdateMenuItemInput>;
  if (body.label !== undefined && !body.label.trim()) {
    return res.status(400).json({ error: "label cannot be empty." });
  }
  const displayType = body.displayType ?? (existing.displayType as MenuItemDisplayType);
  if (body.displayType !== undefined && !VALID_DISPLAY_TYPES.includes(body.displayType)) {
    return res.status(400).json({ error: `displayType must be one of ${VALID_DISPLAY_TYPES.join(", ")}.` });
  }
  const mergedForValidation = {
    iframeUrl: body.iframeUrl ?? existing.iframeUrl ?? undefined,
    remoteEntryUrl: body.remoteEntryUrl ?? existing.remoteEntryUrl ?? undefined,
    remoteName: body.remoteName ?? existing.remoteName ?? undefined,
    exposedModule: body.exposedModule ?? existing.exposedModule ?? undefined,
  };
  const error = validationError(mergedForValidation, displayType);
  if (error) return res.status(400).json({ error });

  const item = await prisma.menuItem.update({
    where: { id: existing.id },
    data: {
      label: body.label?.trim(),
      displayType,
      iframeUrl: displayType === "IFRAME" ? mergedForValidation.iframeUrl!.trim() : null,
      remoteEntryUrl: displayType === "MFE" ? mergedForValidation.remoteEntryUrl!.trim() : null,
      remoteName: displayType === "MFE" ? mergedForValidation.remoteName!.trim() : null,
      exposedModule: displayType === "MFE" ? mergedForValidation.exposedModule!.trim() : null,
    },
  });
  res.json(toCustomMenuItem(item));
});

menuItemsRouter.delete("/menu-items/:id", async (req, res) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});
