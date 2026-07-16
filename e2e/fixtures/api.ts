/**
 * Thin fetch wrappers against case-management-api, used only for E2E test setup/teardown
 * (creating throwaway fixtures before driving the UI, deleting them afterward) — never
 * to replace the UI interactions the specs are actually meant to exercise.
 */
const BASE_URL = "http://localhost:4311";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status}): ${body?.error ?? "unknown error"}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface ThrowawayCaseType {
  caseTypeId: string;
  draftVersionId: string;
}

/** Creates a throwaway case type with a couple of stages and a transition between them. */
export async function createThrowawayCaseType(keySuffix: string): Promise<ThrowawayCaseType> {
  const caseType = await request<{ id: string; draftVersion: { id: string } }>("/api/case-types", {
    method: "POST",
    body: JSON.stringify({ key: `e2e-${keySuffix}`, name: `E2E ${keySuffix}` }),
  });

  const stageA = await request<{ id: string }>(`/api/case-type-versions/${caseType.draftVersion.id}/stages`, {
    method: "POST",
    body: JSON.stringify({ key: "start", name: "Start", slaMinutes: 60, displayOrder: 0 }),
  });
  const stageB = await request<{ id: string }>(`/api/case-type-versions/${caseType.draftVersion.id}/stages`, {
    method: "POST",
    body: JSON.stringify({ key: "end", name: "End", slaMinutes: 60, isTerminal: true, displayOrder: 1 }),
  });
  await request(`/api/stages/${stageA.id}/transitions`, {
    method: "POST",
    body: JSON.stringify({ toStageId: stageB.id }),
  });

  return { caseTypeId: caseType.id, draftVersionId: caseType.draftVersion.id };
}

export async function deleteCaseType(caseTypeId: string): Promise<void> {
  await request(`/api/case-types/${caseTypeId}`, { method: "DELETE" });
}

export async function publishVersion(versionId: string): Promise<void> {
  await request(`/api/case-type-versions/${versionId}/publish`, { method: "POST" });
}

export interface CaseInstanceRef {
  id: string;
  currentStageId: string;
}

interface FieldDefinitionRef {
  id: string;
  fieldType: string;
  required: boolean;
  options: string[] | null;
}

function placeholderValueFor(field: FieldDefinitionRef): string | number | boolean {
  switch (field.fieldType) {
    case "NUMBER":
      return 1;
    case "CHECKBOX":
      return true;
    case "DATE":
      return new Date().toISOString().slice(0, 10);
    case "SELECT":
      return field.options?.[0] ?? "";
    default: // TEXT, TEXTAREA
      return "E2E test value";
  }
}

/**
 * Creates a case instance against `caseTypeId`'s currently published version, auto-filling
 * every required field with a placeholder value so this works against any case type
 * (e.g. the seeded Complaint, which requires Description + Channel) without each spec
 * having to know that case type's specific field list.
 */
export async function createCaseInstance(caseTypeId: string): Promise<CaseInstanceRef> {
  const caseType = await request<{ publishedVersion: { id: string } | null }>(`/api/case-types/${caseTypeId}`);
  if (!caseType.publishedVersion) {
    throw new Error(`Case type ${caseTypeId} has no published version to create an instance against.`);
  }

  const version = await request<{ fields: FieldDefinitionRef[] }>(
    `/api/case-type-versions/${caseType.publishedVersion.id}`,
  );

  return request<CaseInstanceRef>("/api/case-instances", {
    method: "POST",
    body: JSON.stringify({
      caseTypeId,
      fieldValues: version.fields.map((f) => ({
        fieldDefinitionId: f.id,
        value: placeholderValueFor(f),
      })),
    }),
  });
}

export async function deleteCaseInstance(instanceId: string): Promise<void> {
  await request(`/api/case-instances/${instanceId}`, { method: "DELETE" });
}

export async function backdateCurrentStage(instanceId: string, slaDueAt: Date): Promise<void> {
  await request(`/api/case-instances/${instanceId}/stage-history/current/backdate`, {
    method: "PATCH",
    body: JSON.stringify({ slaDueAt: slaDueAt.toISOString() }),
  });
}

export async function runSchedulerOnce(): Promise<{ checked: number; fired: number }> {
  return request("/api/scheduler/run-once", { method: "POST" });
}
