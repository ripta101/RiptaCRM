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

async function request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) };
  if (init?.body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Case types
export const listCaseTypes = (token?: string | null) =>
  request<{ results: CaseTypeSummary[] }>("/api/case-types", undefined, token).then((r) => r.results);
export const createCaseType = (input: CreateCaseTypeInput, token?: string | null) =>
  request<CaseTypeSummary>(
    "/api/case-types",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
export const getCaseType = (id: string, token?: string | null) =>
  request<CaseTypeSummary>(`/api/case-types/${id}`, undefined, token);
export const deleteCaseType = (id: string, token?: string | null) =>
  request<void>(`/api/case-types/${id}`, { method: "DELETE" }, token);

// Versions
export const listCaseTypeVersions = (caseTypeId: string, token?: string | null) =>
  request<{ results: CaseTypeVersionSummary[] }>(
    `/api/case-types/${caseTypeId}/versions`,
    undefined,
    token,
  ).then((r) => r.results);
export const getCaseTypeVersion = (versionId: string, token?: string | null) =>
  request<CaseTypeVersionDetail>(`/api/case-type-versions/${versionId}`, undefined, token);
export const createDraftVersion = (caseTypeId: string, token?: string | null) =>
  request<CaseTypeVersionDetail>(
    `/api/case-types/${caseTypeId}/versions/draft`,
    { method: "POST" },
    token,
  );
export const publishVersion = (versionId: string, token?: string | null) =>
  request<CaseTypeVersionSummary>(
    `/api/case-type-versions/${versionId}/publish`,
    { method: "POST" },
    token,
  );
export const deleteCaseTypeVersion = (versionId: string, token?: string | null) =>
  request<void>(`/api/case-type-versions/${versionId}`, { method: "DELETE" }, token);

// Fields
export const createField = (versionId: string, input: CreateFieldInput, token?: string | null) =>
  request<FieldDefinition>(
    `/api/case-type-versions/${versionId}/fields`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token,
  );
export const updateField = (fieldId: string, input: UpdateFieldInput, token?: string | null) =>
  request<FieldDefinition>(
    `/api/fields/${fieldId}`,
    { method: "PATCH", body: JSON.stringify(input) },
    token,
  );
export const deleteField = (fieldId: string, token?: string | null) =>
  request<void>(`/api/fields/${fieldId}`, { method: "DELETE" }, token);

// Stages
export const createStage = (versionId: string, input: CreateStageInput, token?: string | null) =>
  request<StageDefinition>(
    `/api/case-type-versions/${versionId}/stages`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token,
  );
export const updateStage = (stageId: string, input: UpdateStageInput, token?: string | null) =>
  request<StageDefinition>(
    `/api/stages/${stageId}`,
    { method: "PATCH", body: JSON.stringify(input) },
    token,
  );
export const deleteStage = (stageId: string, token?: string | null) =>
  request<void>(`/api/stages/${stageId}`, { method: "DELETE" }, token);

// Stage transitions
export const createStageTransition = (
  stageId: string,
  input: CreateStageTransitionInput,
  token?: string | null,
) =>
  request<StageTransition>(
    `/api/stages/${stageId}/transitions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token,
  );
export const deleteStageTransition = (transitionId: string, token?: string | null) =>
  request<void>(`/api/stage-transitions/${transitionId}`, { method: "DELETE" }, token);

// Actions
export const createAction = (stageId: string, input: CreateActionInput, token?: string | null) =>
  request(
    `/api/stages/${stageId}/actions`,
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
export const updateAction = (actionId: string, input: UpdateActionInput, token?: string | null) =>
  request(`/api/actions/${actionId}`, { method: "PATCH", body: JSON.stringify(input) }, token);
export const deleteAction = (actionId: string, token?: string | null) =>
  request<void>(`/api/actions/${actionId}`, { method: "DELETE" }, token);

// Case instances
export const createCaseInstance = (input: CreateCaseInstanceInput, token?: string | null) =>
  request<CaseInstanceDetail>(
    "/api/case-instances",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
export const listCaseInstances = (
  params: Record<string, string | undefined> = {},
  token?: string | null,
) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return request<{ results: CaseInstanceSummary[] }>(
    `/api/case-instances?${qs.toString()}`,
    undefined,
    token,
  ).then((r) => r.results);
};
export const getCaseInstance = (id: string, token?: string | null) =>
  request<CaseInstanceDetail>(`/api/case-instances/${id}`, undefined, token);
export const transitionCaseInstance = (id: string, input: AdvanceStageInput, token?: string | null) =>
  request<CaseInstanceDetail>(
    `/api/case-instances/${id}/transitions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token,
  );
export const deleteCaseInstance = (id: string, token?: string | null) =>
  request<void>(`/api/case-instances/${id}`, { method: "DELETE" }, token);
export const assignCaseInstance = (id: string, input: AssignCaseInstanceInput, token?: string | null) =>
  request<CaseInstanceSummary>(
    `/api/case-instances/${id}/assignment`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
    token,
  );

// Queues
export const listQueues = (token?: string | null) =>
  request<{ results: Queue[] }>("/api/queues", undefined, token).then((r) => r.results);
export const getQueue = (id: string, token?: string | null) =>
  request<Queue>(`/api/queues/${id}`, undefined, token);
export const createQueue = (input: CreateQueueInput, token?: string | null) =>
  request<Queue>("/api/queues", { method: "POST", body: JSON.stringify(input) }, token);
export const updateQueue = (id: string, input: UpdateQueueInput, token?: string | null) =>
  request<Queue>(`/api/queues/${id}`, { method: "PATCH", body: JSON.stringify(input) }, token);
export const deleteQueue = (id: string, token?: string | null) =>
  request<void>(`/api/queues/${id}`, { method: "DELETE" }, token);
export const addQueueMember = (queueId: string, input: AddQueueMemberInput, token?: string | null) =>
  request<Queue>(
    `/api/queues/${queueId}/members`,
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
export const removeQueueMember = (queueId: string, userId: string, token?: string | null) =>
  request<void>(`/api/queues/${queueId}/members/${userId}`, { method: "DELETE" }, token);

// Users (for the queue-member picker)
export const listUsers = (token?: string | null) =>
  request<{ results: UserSummary[] }>("/api/users", undefined, token).then((r) => r.results);

// Action log
export const listActionLog = (
  params: Record<string, string | undefined> = {},
  token?: string | null,
) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return request<{ results: ActionLogEntry[] }>(
    `/api/action-log?${qs.toString()}`,
    undefined,
    token,
  ).then((r) => r.results);
};
