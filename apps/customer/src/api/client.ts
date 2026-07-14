import type {
  CustomerDetail,
  CustomerSearchParams,
  CustomerSearchResponse,
  CustomerSummary,
} from "@riptacrm/shared-types";

const BASE_URL = import.meta.env.VITE_CUSTOMER_API_URL ?? "http://localhost:4310";

export async function searchCustomers(params: CustomerSearchParams): Promise<CustomerSummary[]> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }

  const res = await fetch(`${BASE_URL}/api/customers/search?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Search failed (${res.status})`);
  }

  const data: CustomerSearchResponse = await res.json();
  return data.results;
}

export async function getCustomerById(id: string): Promise<CustomerDetail> {
  const res = await fetch(`${BASE_URL}/api/customers/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to load customer (${res.status})`);
  }
  return res.json();
}
