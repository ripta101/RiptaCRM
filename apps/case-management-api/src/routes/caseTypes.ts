import { Router } from "express";
import type {
  CreateActionInput,
  CreateCaseTypeInput,
  CreateFieldInput,
  CreateStageInput,
  UpdateActionInput,
  UpdateFieldInput,
  UpdateStageInput,
} from "@riptacrm/shared-types";
import { prisma } from "../db";
import {
  toCaseTypeSummary,
  toCaseTypeVersionDetail,
  toCaseTypeVersionSummary,
} from "../lib/mappers";
import { isUniqueConstraintError } from "../lib/prismaErrors";

export const caseTypesRouter = Router();

const VERSION_DETAIL_INCLUDE = {
  fields: true,
  stages: { include: { actions: true } },
} as const;

caseTypesRouter.get("/case-types", async (_req, res) => {
  const caseTypes = await prisma.caseType.findMany({
    include: { versions: true },
    orderBy: { name: "asc" },
  });
  res.json({ results: caseTypes.map(toCaseTypeSummary) });
});

caseTypesRouter.post("/case-types", async (req, res) => {
  const body = req.body as Partial<CreateCaseTypeInput>;
  if (!body.key?.trim() || !body.name?.trim()) {
    return res.status(400).json({ error: "key and name are required." });
  }

  try {
    const caseType = await prisma.caseType.create({
      data: {
        key: body.key.trim(),
        name: body.name.trim(),
        description: body.description?.trim() || null,
        versions: {
          create: [{ versionNumber: 1, status: "DRAFT" }],
        },
      },
      include: { versions: true },
    });
    res.status(201).json(toCaseTypeSummary(caseType));
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: `A case type with key "${body.key}" already exists.` });
    }
    throw err;
  }
});

caseTypesRouter.get("/case-types/:id", async (req, res) => {
  const caseType = await prisma.caseType.findUnique({
    where: { id: req.params.id },
    include: { versions: true },
  });
  if (!caseType) return res.status(404).json({ error: "Case type not found." });
  res.json(toCaseTypeSummary(caseType));
});

caseTypesRouter.delete("/case-types/:id", async (req, res) => {
  const instanceCount = await prisma.caseInstance.count({ where: { caseTypeId: req.params.id } });
  if (instanceCount > 0) {
    return res.status(409).json({ error: "Cannot delete a case type that has case instances." });
  }
  await prisma.caseType.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

caseTypesRouter.get("/case-types/:id/versions", async (req, res) => {
  const versions = await prisma.caseTypeVersion.findMany({
    where: { caseTypeId: req.params.id },
    orderBy: { versionNumber: "desc" },
  });
  res.json({ results: versions.map(toCaseTypeVersionSummary) });
});

caseTypesRouter.post("/case-types/:id/versions/draft", async (req, res) => {
  const caseType = await prisma.caseType.findUnique({
    where: { id: req.params.id },
    include: { versions: true },
  });
  if (!caseType) return res.status(404).json({ error: "Case type not found." });

  if (caseType.versions.some((v) => v.status === "DRAFT")) {
    return res.status(409).json({ error: "A draft version already exists for this case type." });
  }

  const published = caseType.versions.find((v) => v.status === "PUBLISHED");
  if (!published) {
    return res.status(409).json({ error: "No published version exists to clone from." });
  }

  const publishedDetail = await prisma.caseTypeVersion.findUniqueOrThrow({
    where: { id: published.id },
    include: VERSION_DETAIL_INCLUDE,
  });

  const maxVersionNumber = Math.max(...caseType.versions.map((v) => v.versionNumber));

  const draft = await prisma.caseTypeVersion.create({
    data: {
      caseTypeId: caseType.id,
      versionNumber: maxVersionNumber + 1,
      status: "DRAFT",
      fields: {
        create: publishedDetail.fields.map((f) => ({
          fieldKey: f.fieldKey,
          name: f.name,
          fieldType: f.fieldType,
          required: f.required,
          optionsJson: f.optionsJson,
          displayOrder: f.displayOrder,
        })),
      },
      stages: {
        create: publishedDetail.stages.map((s) => ({
          key: s.key,
          name: s.name,
          slaMinutes: s.slaMinutes,
          isTerminal: s.isTerminal,
          displayOrder: s.displayOrder,
          actions: {
            create: s.actions.map((a) => ({
              trigger: a.trigger,
              offsetMinutes: a.offsetMinutes,
              actionType: a.actionType,
              configJson: a.configJson,
              isActive: a.isActive,
            })),
          },
        })),
      },
    },
    include: VERSION_DETAIL_INCLUDE,
  });

  res.status(201).json(toCaseTypeVersionDetail(draft));
});

caseTypesRouter.get("/case-type-versions/:versionId", async (req, res) => {
  const version = await prisma.caseTypeVersion.findUnique({
    where: { id: req.params.versionId },
    include: VERSION_DETAIL_INCLUDE,
  });
  if (!version) return res.status(404).json({ error: "Case type version not found." });
  res.json(toCaseTypeVersionDetail(version));
});

caseTypesRouter.post("/case-type-versions/:versionId/publish", async (req, res) => {
  const version = await prisma.caseTypeVersion.findUnique({
    where: { id: req.params.versionId },
    include: { stages: true },
  });
  if (!version) return res.status(404).json({ error: "Case type version not found." });
  if (version.status !== "DRAFT") {
    return res.status(409).json({ error: "Only a draft version can be published." });
  }
  if (version.stages.length === 0) {
    return res.status(409).json({ error: "A version needs at least one stage before it can be published." });
  }

  const published = await prisma.$transaction(async (tx) => {
    await tx.caseTypeVersion.updateMany({
      where: { caseTypeId: version.caseTypeId, status: "PUBLISHED" },
      data: { status: "ARCHIVED" },
    });
    return tx.caseTypeVersion.update({
      where: { id: version.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  });

  res.json(toCaseTypeVersionSummary(published));
});

async function requireDraftVersionForField(fieldId: string) {
  const field = await prisma.fieldDefinition.findUnique({
    where: { id: fieldId },
    include: { caseTypeVersion: true },
  });
  if (!field) return { error: res404() };
  if (field.caseTypeVersion.status !== "DRAFT") {
    return { error: { status: 409, body: { error: "Only fields on a draft version can be modified." } } };
  }
  return { field };
}

function res404() {
  return { status: 404, body: { error: "Not found." } };
}

caseTypesRouter.post("/case-type-versions/:versionId/fields", async (req, res) => {
  const version = await prisma.caseTypeVersion.findUnique({ where: { id: req.params.versionId } });
  if (!version) return res.status(404).json({ error: "Case type version not found." });
  if (version.status !== "DRAFT") {
    return res.status(409).json({ error: "Fields can only be added to a draft version." });
  }

  const body = req.body as Partial<CreateFieldInput>;
  if (!body.fieldKey?.trim() || !body.name?.trim() || !body.fieldType) {
    return res.status(400).json({ error: "fieldKey, name, and fieldType are required." });
  }

  try {
    const field = await prisma.fieldDefinition.create({
      data: {
        caseTypeVersionId: version.id,
        fieldKey: body.fieldKey.trim(),
        name: body.name.trim(),
        fieldType: body.fieldType,
        required: body.required ?? false,
        optionsJson: body.options ? JSON.stringify(body.options) : null,
        displayOrder: body.displayOrder ?? 0,
      },
    });
    res.status(201).json({
      id: field.id,
      fieldKey: field.fieldKey,
      name: field.name,
      fieldType: field.fieldType,
      required: field.required,
      options: field.optionsJson ? JSON.parse(field.optionsJson) : null,
      displayOrder: field.displayOrder,
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: `A field with key "${body.fieldKey}" already exists on this version.` });
    }
    throw err;
  }
});

caseTypesRouter.patch("/fields/:fieldId", async (req, res) => {
  const guard = await requireDraftVersionForField(req.params.fieldId);
  if (guard.error) return res.status(guard.error.status).json(guard.error.body);

  const body = req.body as Partial<UpdateFieldInput>;
  const field = await prisma.fieldDefinition.update({
    where: { id: req.params.fieldId },
    data: {
      name: body.name?.trim(),
      fieldType: body.fieldType,
      required: body.required,
      optionsJson: body.options !== undefined ? JSON.stringify(body.options) : undefined,
      displayOrder: body.displayOrder,
    },
  });
  res.json({
    id: field.id,
    fieldKey: field.fieldKey,
    name: field.name,
    fieldType: field.fieldType,
    required: field.required,
    options: field.optionsJson ? JSON.parse(field.optionsJson) : null,
    displayOrder: field.displayOrder,
  });
});

caseTypesRouter.delete("/fields/:fieldId", async (req, res) => {
  const guard = await requireDraftVersionForField(req.params.fieldId);
  if (guard.error) return res.status(guard.error.status).json(guard.error.body);

  await prisma.fieldDefinition.delete({ where: { id: req.params.fieldId } });
  res.status(204).end();
});

async function requireDraftVersionForStage(stageId: string) {
  const stage = await prisma.stageDefinition.findUnique({
    where: { id: stageId },
    include: { caseTypeVersion: true },
  });
  if (!stage) return { error: res404() };
  if (stage.caseTypeVersion.status !== "DRAFT") {
    return { error: { status: 409, body: { error: "Only stages on a draft version can be modified." } } };
  }
  return { stage };
}

caseTypesRouter.post("/case-type-versions/:versionId/stages", async (req, res) => {
  const version = await prisma.caseTypeVersion.findUnique({ where: { id: req.params.versionId } });
  if (!version) return res.status(404).json({ error: "Case type version not found." });
  if (version.status !== "DRAFT") {
    return res.status(409).json({ error: "Stages can only be added to a draft version." });
  }

  const body = req.body as Partial<CreateStageInput>;
  if (!body.key?.trim() || !body.name?.trim() || body.slaMinutes === undefined) {
    return res.status(400).json({ error: "key, name, and slaMinutes are required." });
  }

  try {
    const stage = await prisma.stageDefinition.create({
      data: {
        caseTypeVersionId: version.id,
        key: body.key.trim(),
        name: body.name.trim(),
        slaMinutes: body.slaMinutes,
        isTerminal: body.isTerminal ?? false,
        displayOrder: body.displayOrder ?? 0,
      },
      include: { actions: true },
    });
    res.status(201).json({
      id: stage.id,
      key: stage.key,
      name: stage.name,
      slaMinutes: stage.slaMinutes,
      isTerminal: stage.isTerminal,
      displayOrder: stage.displayOrder,
      actions: [],
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: `A stage with key "${body.key}" already exists on this version.` });
    }
    throw err;
  }
});

caseTypesRouter.patch("/stages/:stageId", async (req, res) => {
  const guard = await requireDraftVersionForStage(req.params.stageId);
  if (guard.error) return res.status(guard.error.status).json(guard.error.body);

  const body = req.body as Partial<UpdateStageInput>;
  const stage = await prisma.stageDefinition.update({
    where: { id: req.params.stageId },
    data: {
      name: body.name?.trim(),
      slaMinutes: body.slaMinutes,
      isTerminal: body.isTerminal,
      displayOrder: body.displayOrder,
    },
    include: { actions: true },
  });
  res.json({
    id: stage.id,
    key: stage.key,
    name: stage.name,
    slaMinutes: stage.slaMinutes,
    isTerminal: stage.isTerminal,
    displayOrder: stage.displayOrder,
  });
});

caseTypesRouter.delete("/stages/:stageId", async (req, res) => {
  const guard = await requireDraftVersionForStage(req.params.stageId);
  if (guard.error) return res.status(guard.error.status).json(guard.error.body);

  const instanceCount = await prisma.caseInstance.count({ where: { currentStageId: req.params.stageId } });
  if (instanceCount > 0) {
    return res.status(409).json({ error: "Cannot delete a stage that a case is currently in." });
  }

  await prisma.stageDefinition.delete({ where: { id: req.params.stageId } });
  res.status(204).end();
});

caseTypesRouter.post("/stages/:stageId/actions", async (req, res) => {
  const guard = await requireDraftVersionForStage(req.params.stageId);
  if (guard.error) return res.status(guard.error.status).json(guard.error.body);

  const body = req.body as Partial<CreateActionInput>;
  if (!body.trigger || !body.config) {
    return res.status(400).json({ error: "trigger and config are required." });
  }

  const action = await prisma.actionDefinition.create({
    data: {
      stageId: req.params.stageId,
      trigger: body.trigger,
      offsetMinutes: body.offsetMinutes ?? 0,
      actionType: body.actionType ?? "EMAIL",
      configJson: JSON.stringify(body.config),
      isActive: body.isActive ?? true,
    },
  });
  res.status(201).json({
    id: action.id,
    stageId: action.stageId,
    trigger: action.trigger,
    offsetMinutes: action.offsetMinutes,
    actionType: action.actionType,
    isActive: action.isActive,
    config: JSON.parse(action.configJson),
  });
});

async function requireDraftVersionForAction(actionId: string) {
  const action = await prisma.actionDefinition.findUnique({
    where: { id: actionId },
    include: { stage: { include: { caseTypeVersion: true } } },
  });
  if (!action) return { error: res404() };
  if (action.stage.caseTypeVersion.status !== "DRAFT") {
    return { error: { status: 409, body: { error: "Only actions on a draft version can be modified." } } };
  }
  return { action };
}

caseTypesRouter.patch("/actions/:actionId", async (req, res) => {
  const guard = await requireDraftVersionForAction(req.params.actionId);
  if (guard.error) return res.status(guard.error.status).json(guard.error.body);

  const body = req.body as Partial<UpdateActionInput>;
  const action = await prisma.actionDefinition.update({
    where: { id: req.params.actionId },
    data: {
      trigger: body.trigger,
      offsetMinutes: body.offsetMinutes,
      actionType: body.actionType,
      configJson: body.config !== undefined ? JSON.stringify(body.config) : undefined,
      isActive: body.isActive,
    },
  });
  res.json({
    id: action.id,
    stageId: action.stageId,
    trigger: action.trigger,
    offsetMinutes: action.offsetMinutes,
    actionType: action.actionType,
    isActive: action.isActive,
    config: JSON.parse(action.configJson),
  });
});

caseTypesRouter.delete("/actions/:actionId", async (req, res) => {
  const guard = await requireDraftVersionForAction(req.params.actionId);
  if (guard.error) return res.status(guard.error.status).json(guard.error.body);

  await prisma.actionDefinition.delete({ where: { id: req.params.actionId } });
  res.status(204).end();
});
