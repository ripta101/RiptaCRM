import type { CaseInstanceSummary, WorklistItem } from "@riptacrm/shared-types";

export function caseToWorklistItem(c: CaseInstanceSummary): WorklistItem {
  return {
    id: c.id,
    kind: "case",
    title: c.caseTypeName,
    subtitle: `${c.currentStageName}${c.customerAccountId ? ` — ${c.customerAccountId}` : ""}`,
    dueAt: c.slaDueAt,
    breached: c.breached,
    status: c.status,
    // Cases have no click-through yet (per README — "read-only for now") — never claimable,
    // matching WorklistTable's existing case-row behavior before this generalization.
    claimable: false,
    // Screen-pop is a webchat-only concept — cases never auto-pop.
    autoPopup: false,
  };
}
