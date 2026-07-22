export type WorklistItemKind = "case" | "webchat";

// A single item in the frontline Worklist tab — cases and webchat conversations map onto
// this shape so WorklistTable can render both generically. Kind-specific fields (e.g. a
// case's stage name, a chat's page path) get folded into title/subtitle at the source.
export interface WorklistItem {
  id: string;
  kind: WorklistItemKind;
  title: string;
  subtitle: string | null;
  dueAt: string | null;
  breached: boolean;
  status: string;
  // false = already assigned to the requesting user, just needs opening. true = unclaimed
  // but in a queue the requesting user is a member of — offer a "Claim" action instead.
  claimable: boolean;
  // Webchat-only: whether this item's queue is configured to screen-pop. Always false for
  // "case" items. Lets a client catch up on a chat that was assigned while the agent's
  // socket wasn't connected to receive the real-time "chat:assigned" event — see
  // apps/host/src/webchat/AgentStatusSelector.tsx.
  autoPopup: boolean;
}
