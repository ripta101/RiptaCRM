import type { CaseInstanceSummary } from "@riptacrm/shared-types";

const BASE_URL = import.meta.env.VITE_CASE_MANAGEMENT_API_URL ?? "http://localhost:4311";

export async function listOpenCasesAssignedTo(userId: string): Promise<CaseInstanceSummary[]> {
  const qs = new URLSearchParams({ assignedToUserId: userId, status: "OPEN" });
  const res = await fetch(`${BASE_URL}/api/case-instances?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to load open cases (${res.status})`);
  }
  const data: { results: CaseInstanceSummary[] } = await res.json();
  return data.results;
}
