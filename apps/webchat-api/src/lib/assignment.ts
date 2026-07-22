export interface AssignmentCandidate {
  userId: string;
  currentLoad: number;
  effectiveCapacity: number;
}

// Pure — no Prisma, no fetch. Filters candidates already at/over capacity, then picks the
// least-loaded remaining one (ties broken by array order, i.e. whatever order the caller
// passed candidates in — e.g. queue-membership order). Returns null if nobody has spare
// capacity right now, meaning the conversation stays queued/unassigned.
export function pickAssignee(candidates: AssignmentCandidate[]): string | null {
  const eligible = candidates.filter((c) => c.currentLoad < c.effectiveCapacity);
  if (eligible.length === 0) return null;

  return eligible.reduce((least, c) => (c.currentLoad < least.currentLoad ? c : least)).userId;
}
