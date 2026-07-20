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

export async function searchCustomers(params: CustomerSearchParams): Promise<CustomerSummary[]> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const data = await request<CustomerSearchResponse>(`/api/customers/search?${qs.toString()}`);
  return data.results;
}

export const getCustomerById = (id: string) => request<CustomerDetail>(`/api/customers/${id}`);

export const createCustomer = (input: CreateCustomerInput) =>
  request<CustomerDetail>("/api/customers", { method: "POST", body: JSON.stringify(input) });

// Case lodging (proxied server-to-server by customer-api to case-management-api)
export const listLodgeableCaseTypes = () =>
  request<{ results: CaseTypeSummary[] }>("/api/lodgeable-case-types").then((r) => r.results);
export const getCaseTypeVersion = (versionId: string) =>
  request<CaseTypeVersionDetail>(`/api/case-type-versions/${versionId}`);
export const createCaseInstance = (input: CreateCaseInstanceInput) =>
  request<CaseInstanceDetail>("/api/case-instances", { method: "POST", body: JSON.stringify(input) });
