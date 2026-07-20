import type {
  ActionDefinition as PrismaActionDefinition,
  ActionLogEntry as PrismaActionLogEntry,
  CaseFieldValue as PrismaCaseFieldValue,
  CaseInstance as PrismaCaseInstance,
  CaseStageHistory as PrismaCaseStageHistory,
  CaseType as PrismaCaseType,
  CaseTypeVersion as PrismaCaseTypeVersion,
  FieldDefinition as PrismaFieldDefinition,
  Queue as PrismaQueue,
  QueueMember as PrismaQueueMember,
  StageDefinition as PrismaStageDefinition,
  StageTransition as PrismaStageTransition,
} from "../../generated/prisma";
import type {
  ActionDefinition,
  ActionLogEntry,
  CaseFieldValue,
  CaseInstanceDetail,
  CaseInstanceSummary,
  CaseStageHistoryEntry,
  CaseTypeSummary,
  CaseTypeVersionDetail,
  CaseTypeVersionSummary,
  EmailActionConfig,
  FieldDefinition,
  Queue,
  StageDefinition,
} from "@riptacrm/shared-types";

export function toFieldDefinition(f: PrismaFieldDefinition): FieldDefinition {
  return {
    id: f.id,
    fieldKey: f.fieldKey,
    name: f.name,
    fieldType: f.fieldType as FieldDefinition["fieldType"],
    required: f.required,
    options: f.optionsJson ? (JSON.parse(f.optionsJson) as string[]) : null,
    displayOrder: f.displayOrder,
  };
}

export function toActionDefinition(a: PrismaActionDefinition): ActionDefinition {
  return {
    id: a.id,
    stageId: a.stageId,
    trigger: a.trigger as ActionDefinition["trigger"],
    offsetMinutes: a.offsetMinutes,
    actionType: a.actionType as ActionDefinition["actionType"],
    isActive: a.isActive,
    config: JSON.parse(a.configJson) as EmailActionConfig,
  };
}

export function toStageDefinition(
  s: PrismaStageDefinition & { actions: PrismaActionDefinition[]; transitionsFrom: PrismaStageTransition[] },
): StageDefinition {
  return {
    id: s.id,
    key: s.key,
    name: s.name,
    slaMinutes: s.slaMinutes,
    isTerminal: s.isTerminal,
    displayOrder: s.displayOrder,
    positionX: s.positionX,
    positionY: s.positionY,
    queueId: s.queueId,
    actions: s.actions.map(toActionDefinition),
    allowedNextStages: s.transitionsFrom.map((t) => ({ id: t.id, toStageId: t.toStageId })),
  };
}

export function toCaseTypeVersionSummary(v: PrismaCaseTypeVersion): CaseTypeVersionSummary {
  return {
    id: v.id,
    caseTypeId: v.caseTypeId,
    versionNumber: v.versionNumber,
    status: v.status as CaseTypeVersionSummary["status"],
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
  };
}

export function toCaseTypeVersionDetail(
  v: PrismaCaseTypeVersion & {
    fields: PrismaFieldDefinition[];
    stages: (PrismaStageDefinition & { actions: PrismaActionDefinition[]; transitionsFrom: PrismaStageTransition[] })[];
  },
): CaseTypeVersionDetail {
  return {
    ...toCaseTypeVersionSummary(v),
    fields: v.fields
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(toFieldDefinition),
    stages: v.stages
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(toStageDefinition),
  };
}

export function toCaseTypeSummary(
  caseType: PrismaCaseType & { versions: PrismaCaseTypeVersion[] },
): CaseTypeSummary {
  const published = caseType.versions.find((v) => v.status === "PUBLISHED") ?? null;
  const draft = caseType.versions.find((v) => v.status === "DRAFT") ?? null;

  return {
    id: caseType.id,
    key: caseType.key,
    name: caseType.name,
    description: caseType.description,
    isActive: caseType.isActive,
    publishedVersion: published ? toCaseTypeVersionSummary(published) : null,
    draftVersion: draft ? toCaseTypeVersionSummary(draft) : null,
  };
}

type CaseInstanceWithRelations = PrismaCaseInstance & {
  caseType: PrismaCaseType;
  currentStage: PrismaStageDefinition;
  stageHistory: (PrismaCaseStageHistory & { stage: PrismaStageDefinition })[];
  assignedQueue: PrismaQueue | null;
};

function currentStageHistory(instance: CaseInstanceWithRelations) {
  return instance.stageHistory.find((h) => h.exitedAt === null) ?? instance.stageHistory[0];
}

export function toCaseInstanceSummary(instance: CaseInstanceWithRelations): CaseInstanceSummary {
  const current = currentStageHistory(instance);

  return {
    id: instance.id,
    caseTypeId: instance.caseTypeId,
    caseTypeName: instance.caseType.name,
    caseTypeVersionId: instance.caseTypeVersionId,
    currentStageId: instance.currentStageId,
    currentStageName: instance.currentStage.name,
    customerAccountId: instance.customerAccountId,
    assignedToUserId: instance.assignedToUserId,
    assignedQueueId: instance.assignedQueueId,
    assignedQueueName: instance.assignedQueue?.name ?? null,
    contactEmail: instance.contactEmail,
    status: instance.status as CaseInstanceSummary["status"],
    createdAt: instance.createdAt.toISOString(),
    updatedAt: instance.updatedAt.toISOString(),
    closedAt: instance.closedAt ? instance.closedAt.toISOString() : null,
    slaDueAt: current.slaDueAt.toISOString(),
    breached: current.breached,
  };
}

function toCaseStageHistoryEntry(
  h: PrismaCaseStageHistory & { stage: PrismaStageDefinition },
): CaseStageHistoryEntry {
  return {
    id: h.id,
    stageId: h.stageId,
    stageName: h.stage.name,
    enteredAt: h.enteredAt.toISOString(),
    slaDueAt: h.slaDueAt.toISOString(),
    exitedAt: h.exitedAt ? h.exitedAt.toISOString() : null,
    breached: h.breached,
  };
}

export function toCaseInstanceDetail(
  instance: CaseInstanceWithRelations & {
    fieldValues: (PrismaCaseFieldValue & { fieldDefinition: PrismaFieldDefinition })[];
  },
): CaseInstanceDetail {
  return {
    ...toCaseInstanceSummary(instance),
    fieldValues: instance.fieldValues.map((v) => toCaseFieldValue(v)),
    stageHistory: instance.stageHistory
      .slice()
      .sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime())
      .map(toCaseStageHistoryEntry),
  };
}

function toCaseFieldValue(
  v: PrismaCaseFieldValue & { fieldDefinition: PrismaFieldDefinition },
): CaseFieldValue {
  return {
    fieldDefinitionId: v.fieldDefinitionId,
    fieldKey: v.fieldDefinition.fieldKey,
    name: v.fieldDefinition.name,
    value: coerceFieldValue(v.valueText, v.fieldDefinition.fieldType as FieldDefinition["fieldType"]),
  };
}

export function coerceFieldValue(
  valueText: string | null,
  fieldType: FieldDefinition["fieldType"],
): string | number | boolean | null {
  if (valueText === null) return null;
  if (fieldType === "NUMBER") return Number(valueText);
  if (fieldType === "CHECKBOX") return valueText === "true";
  return valueText;
}

export function toStoredFieldValue(value: string | number | boolean | null): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

export function toQueue(q: PrismaQueue & { members: PrismaQueueMember[] }): Queue {
  return {
    id: q.id,
    name: q.name,
    memberUserIds: q.members.map((m) => m.userId),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

export function toActionLogEntry(entry: PrismaActionLogEntry): ActionLogEntry {
  return {
    id: entry.id,
    caseInstanceId: entry.caseInstanceId,
    stageHistoryId: entry.stageHistoryId,
    actionDefinitionId: entry.actionDefinitionId,
    trigger: entry.trigger as ActionLogEntry["trigger"],
    actionType: entry.actionType as ActionLogEntry["actionType"],
    recipient: entry.recipient,
    subject: entry.subject,
    body: entry.body,
    simulated: entry.simulated,
    firedAt: entry.firedAt.toISOString(),
  };
}
