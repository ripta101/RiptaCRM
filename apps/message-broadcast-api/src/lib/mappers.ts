import type { BroadcastPriority, MessageBroadcastSummary } from "@riptacrm/shared-types";
import type { MessageBroadcast, MessageBroadcastTargetRole } from "../../generated/prisma";

const PRIORITY_LABELS: Record<number, BroadcastPriority> = { 1: "LOW", 2: "NORMAL", 3: "HIGH" };
const PRIORITY_WEIGHTS: Record<BroadcastPriority, number> = { LOW: 1, NORMAL: 2, HIGH: 3 };

export function priorityToLabel(value: number): BroadcastPriority | null {
  return PRIORITY_LABELS[value] ?? null;
}

export function priorityFromLabel(label?: BroadcastPriority): number {
  return label ? PRIORITY_WEIGHTS[label] : 0;
}

type MessageBroadcastWithTargetRoles = MessageBroadcast & { targetRoles: MessageBroadcastTargetRole[] };

export function toMessageBroadcastSummary(b: MessageBroadcastWithTargetRoles): MessageBroadcastSummary {
  return {
    id: b.id,
    title: b.title,
    bodyHtml: b.bodyHtml,
    priority: priorityToLabel(b.priority),
    targetRoles: b.targetRoles.map((r) => r.role),
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    canceledAt: b.canceledAt ? b.canceledAt.toISOString() : null,
    createdByUserId: b.createdByUserId,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
