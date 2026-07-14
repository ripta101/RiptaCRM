import type { Customer, InteractionHistory } from "../../generated/prisma";
import type {
  CaseInstanceSummary,
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

function toInteractionHistoryEntry(i: InteractionHistory): InteractionHistoryEntry {
  return {
    id: i.id,
    channel: i.channel as InteractionHistoryEntry["channel"],
    summary: i.summary,
    occurredAt: i.occurredAt.toISOString(),
  };
}

export function toCustomerDetail(
  customer: Customer & { interactions: InteractionHistory[] },
  cases: CaseInstanceSummary[],
): CustomerDetail {
  return {
    ...toCustomerSummary(customer),
    cases,
    interactions: customer.interactions.map(toInteractionHistoryEntry),
  };
}
