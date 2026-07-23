import { Router } from "express";
import type { CreatePreChatFieldInput, FieldType, UpdatePreChatFieldInput } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toPreChatField } from "../lib/mappers";
import { isRecordNotFoundError, isUniqueConstraintError } from "../lib/prismaErrors";
import { requirePermission } from "../lib/requirePermission";

export const preChatFieldsRouter = Router();

const VALID_FIELD_TYPES: FieldType[] = ["TEXT", "NUMBER", "DATE", "SELECT", "TEXTAREA", "CHECKBOX"];

preChatFieldsRouter.get("/prechat-fields", requirePermission("webchat-config"), async (req, res) => {
  const siteId = typeof req.query.siteId === "string" ? req.query.siteId : undefined;
  const fields = await prisma.preChatField.findMany({
    where: siteId ? { siteId } : undefined,
    orderBy: [{ siteId: "asc" }, { displayOrder: "asc" }],
  });
  res.json({ results: fields.map(toPreChatField) });
});

preChatFieldsRouter.post("/prechat-fields", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as Partial<CreatePreChatFieldInput>;
  if (!body.siteId?.trim()) return res.status(400).json({ error: "siteId is required." });
  if (!body.fieldKey?.trim()) return res.status(400).json({ error: "fieldKey is required." });
  if (!body.label?.trim()) return res.status(400).json({ error: "label is required." });
  if (!body.fieldType || !VALID_FIELD_TYPES.includes(body.fieldType)) {
    return res.status(400).json({ error: `fieldType must be one of ${VALID_FIELD_TYPES.join(", ")}.` });
  }

  try {
    const field = await prisma.preChatField.create({
      data: {
        siteId: body.siteId,
        fieldKey: body.fieldKey.trim(),
        label: body.label.trim(),
        fieldType: body.fieldType,
        required: body.required ?? false,
        optionsJson: body.options ? JSON.stringify(body.options) : null,
        displayOrder: body.displayOrder ?? 0,
      },
    });
    res.status(201).json(toPreChatField(field));
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: `A field with key "${body.fieldKey}" already exists on this site.` });
    }
    throw err;
  }
});

preChatFieldsRouter.get("/prechat-fields/:id", requirePermission("webchat-config"), async (req, res) => {
  const field = await prisma.preChatField.findUnique({ where: { id: req.params.id } });
  if (!field) return res.status(404).json({ error: "Pre-chat field not found." });
  res.json(toPreChatField(field));
});

preChatFieldsRouter.patch("/prechat-fields/:id", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as Partial<UpdatePreChatFieldInput>;
  if (body.fieldKey !== undefined && !body.fieldKey.trim()) {
    return res.status(400).json({ error: "fieldKey cannot be empty." });
  }
  if (body.label !== undefined && !body.label.trim()) {
    return res.status(400).json({ error: "label cannot be empty." });
  }
  if (body.fieldType !== undefined && !VALID_FIELD_TYPES.includes(body.fieldType)) {
    return res.status(400).json({ error: `fieldType must be one of ${VALID_FIELD_TYPES.join(", ")}.` });
  }

  try {
    const field = await prisma.preChatField.update({
      where: { id: req.params.id },
      data: {
        fieldKey: body.fieldKey?.trim(),
        label: body.label?.trim(),
        fieldType: body.fieldType,
        required: body.required,
        optionsJson: body.options !== undefined ? JSON.stringify(body.options) : undefined,
        displayOrder: body.displayOrder,
      },
    });
    res.json(toPreChatField(field));
  } catch (err) {
    if (isRecordNotFoundError(err)) return res.status(404).json({ error: "Pre-chat field not found." });
    throw err;
  }
});

preChatFieldsRouter.delete("/prechat-fields/:id", requirePermission("webchat-config"), async (req, res) => {
  try {
    await prisma.preChatField.delete({ where: { id: req.params.id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    // already gone — DELETE is idempotent
  }
  res.status(204).end();
});
