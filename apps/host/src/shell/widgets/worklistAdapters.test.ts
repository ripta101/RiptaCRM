import { describe, expect, it } from "vitest";
import type { CaseInstanceSummary } from "@riptacrm/shared-types";
import { caseToWorklistItem } from "./worklistAdapters";

function caseSummary(overrides: Partial<CaseInstanceSummary> = {}): CaseInstanceSummary {
  return {
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    slaDueAt: "2026-01-02T00:00:00.000Z",
    breached: false,
    ...overrides,
  };
}

describe("caseToWorklistItem", () => {
  it("maps kind, title, subtitle, dueAt, status", () => {
    const item = caseToWorklistItem(caseSummary());
    expect(item.kind).toBe("case");
    expect(item.id).toBe("case-1");
    expect(item.title).toBe("Complaint");
    expect(item.subtitle).toBe("Investigating — ACC-1001");
    expect(item.dueAt).toBe("2026-01-02T00:00:00.000Z");
    expect(item.status).toBe("OPEN");
  });

  it("omits the customer account from the subtitle when null", () => {
    const item = caseToWorklistItem(caseSummary({ customerAccountId: null }));
    expect(item.subtitle).toBe("Investigating");
  });

  it("carries the breached flag through", () => {
    expect(caseToWorklistItem(caseSummary({ breached: true })).breached).toBe(true);
    expect(caseToWorklistItem(caseSummary({ breached: false })).breached).toBe(false);
  });

  it("is never claimable — cases have no click-through worklist action", () => {
    expect(caseToWorklistItem(caseSummary()).claimable).toBe(false);
  });
});
