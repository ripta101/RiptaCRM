import type {
  ActionLogEntry,
  AddQueueMemberInput,
  AdvanceStageInput,
  AssignCaseInstanceInput,
  CaseInstanceDetail,
  CaseInstanceSummary,
  CaseTypeSummary,
  CaseTypeVersionDetail,
  CaseTypeVersionSummary,
  CreateActionInput,
  CreateCaseInstanceInput,
  CreateCaseTypeInput,
  CreateFieldInput,
  CreateQueueInput,
  CreateStageInput,
  CreateStageTransitionInput,
  FieldDefinition,
  Queue,
  StageDefinition,
  StageTransition,
  UpdateActionInput,
  UpdateFieldInput,
  UpdateQueueInput,
  UpdateStageInput,
  UserSummary,
} from "@riptacrm/shared-types";

const BASE_URL = import.meta.env.VITE_CASE_MANAGEMENT_API_URL ?? "http://localhost:4311";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Case types
export const listCaseTypes = () =>
  request<{ results: CaseTypeSummary[] }>("/api/case-types").then((r) => r.results);
export const createCaseType = (input: CreateCaseTypeInput) =>
  request<CaseTypeSummary>("/api/case-types", { method: "POST", body: JSON.stringify(input) });
export const getCaseType = (id: string) => request<CaseTypeSummary>(`/api/case-types/${id}`);
export const deleteCaseType = (id: string) =>
  request<void>(`/api/case-types/${id}`, { method: "DELETE" });

// Versions
export const listCaseTypeVersions = (caseTypeId: string) =>
  request<{ results: CaseTypeVersionSummary[] }>(`/api/case-types/${caseTypeId}/versions`).then(
    (r) => r.results,
  );
export const getCaseTypeVersion = (versionId: string) =>
  request<CaseTypeVersionDetail>(`/api/case-type-versions/${versionId}`);
export const createDraftVersion = (caseTypeId: string) =>
  request<CaseTypeVersionDetail>(`/api/case-types/${caseTypeId}/versions/draft`, { method: "POST" });
export const publishVersion = (versionId: string) =>
  request<CaseTypeVersionSummary>(`/api/case-type-versions/${versionId}/publish`, { method: "POST" });
export const deleteCaseTypeVersion = (versionId: string) =>
  request<void>(`/api/case-type-versions/${versionId}`, { method: "DELETE" });

// Fields
export const createField = (versionId: string, input: CreateFieldInput) =>
  request<FieldDefinition>(`/api/case-type-versions/${versionId}/fields`, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateField = (fieldId: string, input: UpdateFieldInput) =>
  request<FieldDefinition>(`/api/fields/${fieldId}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteField = (fieldId: string) =>
  request<void>(`/api/fields/${fieldId}`, { method: "DELETE" });

// Stages
export const createStage = (versionId: string, input: CreateStageInput) =>
  request<StageDefinition>(`/api/case-type-versions/${versionId}/stages`, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateStage = (stageId: string, input: UpdateStageInput) =>
  request<StageDefinition>(`/api/stages/${stageId}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteStage = (stageId: string) =>
  request<void>(`/api/stages/${stageId}`, { method: "DELETE" });

// Stage transitions
export const createStageTransition = (stageId: string, input: CreateStageTransitionInput) =>
  request<StageTransition>(`/api/stages/${stageId}/transitions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const deleteStageTransition = (transitionId: string) =>
  request<void>(`/api/stage-transitions/${transitionId}`, { method: "DELETE" });

// Actions
export const createAction = (stageId: string, input: CreateActionInput) =>
  request(`/api/stages/${stageId}/actions`, { method: "POST", body: JSON.stringify(input) });
export const updateAction = (actionId: string, input: UpdateActionInput) =>
  request(`/api/actions/${actionId}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteAction = (actionId: string) =>
  request<void>(`/api/actions/${actionId}`, { method: "DELETE" });

// Case instances
export const createCaseInstance = (input: CreateCaseInstanceInput) =>
  request<CaseInstanceDetail>("/api/case-instances", { method: "POST", body: JSON.stringify(input) });
export const listCaseInstances = (params: Record<string, string | undefined> = {}) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return request<{ results: CaseInstanceSummary[] }>(`/api/case-instances?${qs.toString()}`).then(
    (r) => r.results,
  );
};
export const getCaseInstance = (id: string) => request<CaseInstanceDetail>(`/api/case-instances/${id}`);
export const transitionCaseInstance = (id: string, input: AdvanceStageInput) =>
  request<CaseInstanceDetail>(`/api/case-instances/${id}/transitions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const deleteCaseInstance = (id: string) =>
  request<void>(`/api/case-instances/${id}`, { method: "DELETE" });
export const assignCaseInstance = (id: string, input: AssignCaseInstanceInput) =>
  request<CaseInstanceSummary>(`/api/case-instances/${id}/assignment`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

// Queues
export const listQueues = () => request<{ results: Queue[] }>("/api/queues").then((r) => r.results);
export const getQueue = (id: string) => request<Queue>(`/api/queues/${id}`);
export const createQueue = (input: CreateQueueInput) =>
  request<Queue>("/api/queues", { method: "POST", body: JSON.stringify(input) });
export const updateQueue = (id: string, input: UpdateQueueInput) =>
  request<Queue>(`/api/queues/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteQueue = (id: string) => request<void>(`/api/queues/${id}`, { method: "DELETE" });
export const addQueueMember = (queueId: string, input: AddQueueMemberInput) =>
  request<Queue>(`/api/queues/${queueId}/members`, { method: "POST", body: JSON.stringify(input) });
export const removeQueueMember = (queueId: string, userId: string) =>
  request<void>(`/api/queues/${queueId}/members/${userId}`, { method: "DELETE" });

// Users (for the queue-member picker)
export const listUsers = () => request<{ results: UserSummary[] }>("/api/users").then((r) => r.results);

// Action log
export const listActionLog = (params: Record<string, string | undefined> = {}) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return request<{ results: ActionLogEntry[] }>(`/api/action-log?${qs.toString()}`).then((r) => r.results);
};
