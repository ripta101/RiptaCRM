import type {
  CaseInstanceDetail,
  CaseTypeSummary,
  CaseTypeVersionDetail,
  CreateCaseInstanceInput,
  CreateCustomerInput,
  CustomerDetail,
  CustomerSearchParams,
  CustomerSearchResponse,
  CustomerSummary,
} from "@riptacrm/shared-types";

const BASE_URL = import.meta.env.VITE_CUSTOMER_API_URL ?? "http://localhost:4310";

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

export async function searchCustomers(
  params: CustomerSearchParams,
  token?: string | null,
): Promise<CustomerSummary[]> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const data = await request<CustomerSearchResponse>(`/api/customers/search?${qs.toString()}`, undefined, token);
  return data.results;
}

export const getCustomerById = (id: string, token?: string | null) =>
  request<CustomerDetail>(`/api/customers/${id}`, undefined, token);

export const createCustomer = (input: CreateCustomerInput, token?: string | null) =>
  request<CustomerDetail>("/api/customers", { method: "POST", body: JSON.stringify(input) }, token);

// Case lodging (proxied server-to-server by customer-api to case-management-api)
export const listLodgeableCaseTypes = (token?: string | null) =>
  request<{ results: CaseTypeSummary[] }>("/api/lodgeable-case-types", undefined, token).then((r) => r.results);
export const getCaseTypeVersion = (versionId: string, token?: string | null) =>
  request<CaseTypeVersionDetail>(`/api/case-type-versions/${versionId}`, undefined, token);
export const createCaseInstance = (input: CreateCaseInstanceInput, token?: string | null) =>
  request<CaseInstanceDetail>("/api/case-instances", { method: "POST", body: JSON.stringify(input) }, token);
