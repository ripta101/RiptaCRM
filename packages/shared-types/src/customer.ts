import type { CaseInstanceSummary } from "./case";

export interface CustomerSearchParams {
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** ISO date string, e.g. "1990-05-05" — matched as an exact calendar day. */
  dateOfBirth?: string;
  email?: string;
  accountId?: string;
  companyName?: string;
}

export interface CustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  email: string | null;
  accountId: string;
  companyName: string | null;
}

export type InteractionChannel = "phone" | "email" | "webchat" | "in-person";

export interface InteractionHistoryEntry {
  id: string;
  channel: InteractionChannel;
  summary: string;
  occurredAt: string;
}

export interface CustomerDetail extends CustomerSummary {
  /** Open cases for this customer, sourced live from the Case Management module. */
  cases: CaseInstanceSummary[];
  interactions: InteractionHistoryEntry[];
}

export interface CustomerSearchResponse {
  results: CustomerSummary[];
}

export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  phone: string;
  /** ISO date string, e.g. "1990-05-05". */
  dateOfBirth: string;
  email?: string;
  companyName?: string;
}
