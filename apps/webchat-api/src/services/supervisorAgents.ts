import { prisma } from "../db";

export interface AgentCounts {
  activeInteractionCount: number;
  answeredCount: number;
}

// Two groupBy queries total, regardless of how many candidate agents there are — avoids
// per-agent count() calls (routeConversation.ts's per-candidate currentOpenLoad() calls are
// fine at routing-time scale, one candidate set per new chat, but wouldn't be for a full
// dashboard roster). Returns every candidate with 0/0 defaults so nobody with zero
// conversations is silently omitted from the map.
export async function countAgentInteractions(
  candidateUserIds: string[],
  closedFrom: Date,
  closedTo: Date,
): Promise<Map<string, AgentCounts>> {
  const result = new Map<string, AgentCounts>();
  if (candidateUserIds.length === 0) return result;
  for (const id of candidateUserIds) result.set(id, { activeInteractionCount: 0, answeredCount: 0 });

  const [active, answered] = await Promise.all([
    prisma.conversation.groupBy({
      by: ["assignedToUserId"],
      where: { assignedToUserId: { in: candidateUserIds }, status: "OPEN" },
      _count: { _all: true },
    }),
    prisma.conversation.groupBy({
      by: ["assignedToUserId"],
      where: { assignedToUserId: { in: candidateUserIds }, status: "CLOSED", closedAt: { gte: closedFrom, lte: closedTo } },
      _count: { _all: true },
    }),
  ]);

  for (const row of active) {
    if (row.assignedToUserId) result.get(row.assignedToUserId)!.activeInteractionCount = row._count._all;
  }
  for (const row of answered) {
    if (row.assignedToUserId) result.get(row.assignedToUserId)!.answeredCount = row._count._all;
  }
  return result;
}
