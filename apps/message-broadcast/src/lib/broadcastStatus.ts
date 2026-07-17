import type { MessageBroadcastSummary } from "@riptacrm/shared-types";

export type BroadcastStatus = "Scheduled" | "Active" | "Expired" | "Canceled";

export function getBroadcastStatus(b: MessageBroadcastSummary, now: Date = new Date()): BroadcastStatus {
  if (b.canceledAt) return "Canceled";
  if (now < new Date(b.startAt)) return "Scheduled";
  if (now > new Date(b.endAt)) return "Expired";
  return "Active";
}
