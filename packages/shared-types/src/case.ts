export type FieldType = "TEXT" | "NUMBER" | "DATE" | "SELECT" | "TEXTAREA" | "CHECKBOX";
export type ActionTrigger = "BEFORE_BREACH" | "AT_BREACH" | "AFTER_BREACH";
export type ActionType = "EMAIL";
export type RecipientMode = "CASE_CONTACT" | "STATIC";
export type CaseTypeVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type CaseInstanceStatus = "OPEN" | "CLOSED";

export interface FieldDefinition {
  id: string;
  fieldKey: string;
  name: string;
  fieldType: FieldType;
  required: boolean;
  options: string[] | null;
  displayOrder: number;
}

export interface EmailActionConfig {
  subjectTemplate: string;
  bodyTemplate: string;
  recipientMode: RecipientMode;
  /** Required when recipientMode is "STATIC"; ignored otherwise. */
  recipientValue?: string;
}

export interface ActionDefinition {
  id: string;
  stageId: string;
  trigger: ActionTrigger;
  offsetMinutes: number;
  actionType: ActionType;
  isActive: boolean;
  config: EmailActionConfig;
}

export interface StageTransition {
  id: string;
  fromStageId: string;
  toStageId: string;
}

export interface CreateStageTransitionInput {
  toStageId: string;
}

export interface StageDefinition {
  id: string;
  key: string;
  name: string;
  slaMinutes: number;
  isTerminal: boolean;
  displayOrder: number;
  positionX: number;
  positionY: number;
  queueId: string | null;
  actions: ActionDefinition[];
  allowedNextStages: { id: string; toStageId: string }[];
}

export interface CaseTypeVersionSummary {
  id: string;
  caseTypeId: string;
  versionNumber: number;
  status: CaseTypeVersionStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CaseTypeVersionDetail extends CaseTypeVersionSummary {
  fields: FieldDefinition[];
  stages: StageDefinition[];
}

export interface CaseTypeSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
  publishedVersion: CaseTypeVersionSummary | null;
  draftVersion: CaseTypeVersionSummary | null;
}

export interface CreateCaseTypeInput {
  key: string;
  name: string;
  description?: string;
}

export interface CreateFieldInput {
  fieldKey: string;
  name: string;
  fieldType: FieldType;
  required: boolean;
  options?: string[];
  displayOrder: number;
}

export type UpdateFieldInput = Partial<CreateFieldInput>;

export interface CreateStageInput {
  key: string;
  name: string;
  slaMinutes: number;
  isTerminal?: boolean;
  displayOrder: number;
  positionX?: number;
  positionY?: number;
  queueId?: string;
}

export type UpdateStageInput = Partial<CreateStageInput>;

export interface CreateActionInput {
  trigger: ActionTrigger;
  offsetMinutes: number;
  actionType?: ActionType;
  config: EmailActionConfig;
  isActive?: boolean;
}

export type UpdateActionInput = Partial<CreateActionInput>;

export interface CaseFieldValueInput {
  fieldDefinitionId: string;
  value: string | number | boolean | null;
}

export interface CreateCaseInstanceInput {
  caseTypeId: string;
  customerAccountId?: string;
  assignedToUserId?: string;
  /** The id of the user lodging the case — used only to check queue membership for
   * auto-assign-or-route-to-queue logic. Ignored if assignedToUserId is explicitly set. */
  lodgedByUserId?: string;
  contactEmail?: string;
  fieldValues?: CaseFieldValueInput[];
}

export interface CaseFieldValue {
  fieldDefinitionId: string;
  fieldKey: string;
  name: string;
  value: string | number | boolean | null;
}

export interface CaseStageHistoryEntry {
  id: string;
  stageId: string;
  stageName: string;
  enteredAt: string;
  slaDueAt: string;
  exitedAt: string | null;
  breached: boolean;
}

export interface CaseInstanceSummary {
  id: string;
  caseTypeId: string;
  caseTypeName: string;
  caseTypeVersionId: string;
  currentStageId: string;
  currentStageName: string;
  customerAccountId: string | null;
  assignedToUserId: string | null;
  assignedQueueId: string | null;
  assignedQueueName: string | null;
  contactEmail: string | null;
  status: CaseInstanceStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  slaDueAt: string;
  breached: boolean;
}

export interface CaseInstanceDetail extends CaseInstanceSummary {
  fieldValues: CaseFieldValue[];
  stageHistory: CaseStageHistoryEntry[];
}

export interface AdvanceStageInput {
  toStageId: string;
}

export interface ActionLogEntry {
  id: string;
  caseInstanceId: string;
  stageHistoryId: string;
  actionDefinitionId: string | null;
  trigger: ActionTrigger;
  actionType: ActionType;
  recipient: string;
  subject: string;
  body: string;
  simulated: boolean;
  firedAt: string;
}
