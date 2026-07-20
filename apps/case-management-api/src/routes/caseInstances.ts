import { Router } from "express";
import type { Prisma } from "../../generated/prisma";
import type { AdvanceStageInput, CreateCaseInstanceInput } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toCaseInstanceDetail, toCaseInstanceSummary, toStoredFieldValue } from "../lib/mappers";

export const caseInstancesRouter = Router();

const SUMMARY_INCLUDE = {
  caseType: true,
  currentStage: true,
  stageHistory: { include: { stage: true } },
  assignedQueue: true,
} as const;

const DETAIL_INCLUDE = {
  ...SUMMARY_INCLUDE,
  fieldValues: { include: { fieldDefinition: true } },
} as const;

caseInstancesRouter.post("/case-instances", async (req, res) => {
  const body = req.body as Partial<CreateCaseInstanceInput>;
  if (!body.caseTypeId) {
    return res.status(400).json({ error: "caseTypeId is required." });
  }

  const caseType = await prisma.caseType.findUnique({
    where: { id: body.caseTypeId },
    include: { versions: true },
  });
  if (!caseType) return res.status(404).json({ error: "Case type not found." });

  const published = caseType.versions.find((v) => v.status === "PUBLISHED");
  if (!published) {
    return res.status(409).json({ error: "This case type has no published version yet." });
  }

  const version = await prisma.caseTypeVersion.findUniqueOrThrow({
    where: { id: published.id },
    include: { fields: true, stages: true },
  });

  const firstStage = version.stages.slice().sort((a, b) => a.displayOrder - b.displayOrder)[0];
  if (!firstStage) {
    return res.status(409).json({ error: "This case type's published version has no stages." });
  }

  const missingRequired = version.fields.filter(
    (f) => f.required && !body.fieldValues?.some((fv) => fv.fieldDefinitionId === f.id && fv.value !== null && fv.value !== ""),
  );
  if (missingRequired.length > 0) {
    return res.status(400).json({
      error: `Missing required field(s): ${missingRequired.map((f) => f.name).join(", ")}`,
    });
  }

  const now = new Date();
  const slaDueAt = new Date(now.getTime() + firstStage.slaMinutes * 60 * 1000);

  // Explicit assignedToUserId (the admin's manual test-instance flow) always wins — queue
  // auto-routing only kicks in for the Lodge-a-Case flow, which sends lodgedByUserId instead.
  let assignedToUserId = body.assignedToUserId?.trim() || null;
  let assignedQueueId: string | null = null;
  if (!assignedToUserId && body.lodgedByUserId?.trim() && firstStage.queueId) {
    const membership = await prisma.queueMember.findUnique({
      where: { queueId_userId: { queueId: firstStage.queueId, userId: body.lodgedByUserId.trim() } },
    });
    if (membership) {
      assignedToUserId = body.lodgedByUserId.trim();
    } else {
      assignedQueueId = firstStage.queueId;
    }
  }

  const instance = await prisma.caseInstance.create({
    data: {
      caseTypeId: caseType.id,
      caseTypeVersionId: version.id,
      currentStageId: firstStage.id,
      customerAccountId: body.customerAccountId?.trim() || null,
      assignedToUserId,
      assignedQueueId,
      contactEmail: body.contactEmail?.trim() || null,
      stageHistory: {
        create: [{ stageId: firstStage.id, enteredAt: now, slaDueAt }],
      },
      fieldValues: {
        create: version.fields.map((f) => ({
          fieldDefinitionId: f.id,
          valueText: toStoredFieldValue(body.fieldValues?.find((fv) => fv.fieldDefinitionId === f.id)?.value ?? null),
        })),
      },
    },
    include: DETAIL_INCLUDE,
  });

  res.status(201).json(toCaseInstanceDetail(instance));
});

caseInstancesRouter.get("/case-instances", async (req, res) => {
  const query = req.query as Record<string, string | undefined>;
  const where: Prisma.CaseInstanceWhereInput = {};
  if (query.customerAccountId) where.customerAccountId = query.customerAccountId;
  if (query.assignedToUserId) where.assignedToUserId = query.assignedToUserId;
  if (query.status) where.status = query.status;
  if (query.caseTypeId) where.caseTypeId = query.caseTypeId;

  const instances = await prisma.caseInstance.findMany({
    where,
    include: SUMMARY_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  res.json({ results: instances.map(toCaseInstanceSummary) });
});

caseInstancesRouter.get("/case-instances/:id", async (req, res) => {
  const instance = await prisma.caseInstance.findUnique({
    where: { id: req.params.id },
    include: DETAIL_INCLUDE,
  });
  if (!instance) return res.status(404).json({ error: "Case instance not found." });
  res.json(toCaseInstanceDetail(instance));
});

caseInstancesRouter.post("/case-instances/:id/transitions", async (req, res) => {
  const body = req.body as Partial<AdvanceStageInput>;
  if (!body.toStageId) return res.status(400).json({ error: "toStageId is required." });

  const instance = await prisma.caseInstance.findUnique({
    where: { id: req.params.id },
    include: { stageHistory: true },
  });
  if (!instance) return res.status(404).json({ error: "Case instance not found." });

  const toStage = await prisma.stageDefinition.findUnique({ where: { id: body.toStageId } });
  if (!toStage || toStage.caseTypeVersionId !== instance.caseTypeVersionId) {
    return res.status(400).json({ error: "toStageId must be a stage belonging to this case's version." });
  }

  const allowed = await prisma.stageTransition.findUnique({
    where: { fromStageId_toStageId: { fromStageId: instance.currentStageId, toStageId: toStage.id } },
  });
  if (!allowed) {
    return res.status(400).json({
      error: "This stage transition is not allowed. Configure it in the Stages & SLA flow diagram first.",
    });
  }

  const currentHistory = instance.stageHistory.find((h) => h.exitedAt === null);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (currentHistory) {
      await tx.caseStageHistory.update({
        where: { id: currentHistory.id },
        data: {
          exitedAt: now,
          breached: currentHistory.breached || now >= currentHistory.slaDueAt,
        },
      });
    }

    await tx.caseStageHistory.create({
      data: {
        caseInstanceId: instance.id,
        stageId: toStage.id,
        enteredAt: now,
        slaDueAt: new Date(now.getTime() + toStage.slaMinutes * 60 * 1000),
      },
    });

    await tx.caseInstance.update({
      where: { id: instance.id },
      data: {
        currentStageId: toStage.id,
        status: toStage.isTerminal ? "CLOSED" : "OPEN",
        closedAt: toStage.isTerminal ? now : null,
      },
    });
  });

  const updated = await prisma.caseInstance.findUniqueOrThrow({
    where: { id: instance.id },
    include: DETAIL_INCLUDE,
  });
  res.json(toCaseInstanceDetail(updated));
});

caseInstancesRouter.patch("/case-instances/:id/stage-history/current/backdate", async (req, res) => {
  const body = req.body as { slaDueAt?: string };
  if (!body.slaDueAt) return res.status(400).json({ error: "slaDueAt is required." });

  const currentHistory = await prisma.caseStageHistory.findFirst({
    where: { caseInstanceId: req.params.id, exitedAt: null },
  });
  if (!currentHistory) return res.status(404).json({ error: "No current stage history found for this case." });

  const updated = await prisma.caseStageHistory.update({
    where: { id: currentHistory.id },
    data: { slaDueAt: new Date(body.slaDueAt) },
  });

  res.json({ id: updated.id, slaDueAt: updated.slaDueAt.toISOString() });
});

caseInstancesRouter.delete("/case-instances/:id", async (req, res) => {
  const instance = await prisma.caseInstance.findUnique({ where: { id: req.params.id } });
  if (!instance) return res.status(404).json({ error: "Case instance not found." });

  await prisma.caseInstance.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
