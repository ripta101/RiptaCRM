import { describe, expect, it } from "vitest";
import { toCustomerDetail, toCustomerSummary } from "./mappers";

function makeCustomer(overrides: Partial<Parameters<typeof toCustomerSummary>[0]> = {}) {
  return {
    id: "cust-1",
    firstName: "Ripta",
    lastName: "Ramelan",
    phone: "0477707254",
    dateOfBirth: new Date("1990-05-05T00:00:00.000Z"),
    email: "ripta.ramelan@gmail.com",
    accountId: "ACC-1001",
    companyName: "Ripta Consulting",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("toCustomerSummary", () => {
  it("formats dateOfBirth as a plain YYYY-MM-DD string, dropping the time component", () => {
    const summary = toCustomerSummary(makeCustomer());
    expect(summary.dateOfBirth).toBe("1990-05-05");
  });

  it("passes through nullable fields unchanged", () => {
    const summary = toCustomerSummary(makeCustomer({ email: null, companyName: null }));
    expect(summary.email).toBeNull();
    expect(summary.companyName).toBeNull();
  });
});

describe("toCustomerDetail", () => {
  it("merges the caller-supplied open cases and maps interactions", () => {
    const customer = makeCustomer();
    const detail = toCustomerDetail(
      {
        ...customer,
        interactions: [
          {
            id: "int-1",
            customerId: customer.id,
            channel: "phone",
            summary: "Called about card replacement.",
            occurredAt: new Date("2026-07-10T09:10:00.000Z"),
          },
        ],
      },
      [
        {
          id: "case-1",
          caseTypeId: "ct-1",
          caseTypeName: "Complaint",
          caseTypeVersionId: "ctv-1",
          currentStageId: "stage-1",
          currentStageName: "Investigating",
          customerAccountId: "ACC-1001",
          assignedToUserId: "user-1",
          assignedQueueId: null,
          assignedQueueName: null,
          contactEmail: null,
          status: "OPEN",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          closedAt: null,
          slaDueAt: new Date().toISOString(),
          breached: false,
        },
      ],
    );

    expect(detail.cases).toHaveLength(1);
    expect(detail.cases[0].caseTypeName).toBe("Complaint");
    expect(detail.interactions).toHaveLength(1);
    expect(detail.interactions[0].summary).toBe("Called about card replacement.");
    expect(detail.accountId).toBe("ACC-1001");
  });

  it("returns an empty cases array when none are supplied", () => {
    const customer = makeCustomer();
    const detail = toCustomerDetail({ ...customer, interactions: [] }, []);
    expect(detail.cases).toEqual([]);
  });
});
