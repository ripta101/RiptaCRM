export interface AssignmentCandidate {
  userId: string;
  currentLoad: number;
  effectiveCapacity: number;
  // Most recent time this candidate was assigned a conversation in this queue, or null if
  // never — the round-robin ranking signal. null sorts first (most overdue).
  lastAssignedAt: Date | null;
}

// Pure — no Prisma, no fetch. Filters candidates already at/over capacity (a hard ceiling,
// unchanged), then picks whichever eligible candidate has gone longest without being
// assigned a chat — round-robin by recency, not by current load, so a high-capacity agent
// doesn't keep getting picked over one who simply hasn't had a turn yet. Ties (including
// "both never assigned") are broken by array order, i.e. whatever order the caller passed
// candidates in — e.g. queue-membership order. Returns null if nobody has spare capacity
// right now, meaning the conversation stays queued/unassigned.
export function pickAssignee(candidates: AssignmentCandidate[]): string | null {
  const eligible = candidates.filter((c) => c.currentLoad < c.effectiveCapacity);
  if (eligible.length === 0) return null;

  return eligible.reduce((longestWaiting, c) => {
    if (longestWaiting.lastAssignedAt === null) return longestWaiting;
    if (c.lastAssignedAt === null) return c;
    return c.lastAssignedAt < longestWaiting.lastAssignedAt ? c : longestWaiting;
  }).userId;
}
