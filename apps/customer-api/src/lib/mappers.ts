import type { Case, Customer, InteractionHistory } from "@prisma/client";
import type {
  CaseSummary,
  CustomerDetail,
  CustomerSummary,
  InteractionHistoryEntry,
} from "@riptacrm/shared-types";

export function toCustomerSummary(customer: Customer): CustomerSummary {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    dateOfBirth: customer.dateOfBirth.toISOString().slice(0, 10),
    email: customer.email,
    accountId: customer.accountId,
    companyName: customer.companyName,
  };
}

function toCaseSummary(c: Case): CaseSummary {
  return {
    id: c.id,
    subject: c.subject,
    status: c.status as CaseSummary["status"],
    priority: (c.priority as CaseSummary["priority"]) ?? null,
    openedAt: c.openedAt.toISOString(),
  };
}

function toInteractionHistoryEntry(i: InteractionHistory): InteractionHistoryEntry {
  return {
    id: i.id,
    channel: i.channel as InteractionHistoryEntry["channel"],
    summary: i.summary,
    occurredAt: i.occurredAt.toISOString(),
  };
}

export function toCustomerDetail(
  customer: Customer & { cases: Case[]; interactions: InteractionHistory[] },
): CustomerDetail {
  return {
    ...toCustomerSummary(customer),
    cases: customer.cases.map(toCaseSummary),
    interactions: customer.interactions.map(toInteractionHistoryEntry),
  };
}
