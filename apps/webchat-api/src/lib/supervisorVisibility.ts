// Pure — no Prisma, no fetch. Union: an agent is visible to a supervisor if they're a
// member of ANY of the supervisor's granted queues OR ANY of the supervisor's granted
// profiles — each grant independently expands visibility, not an intersection.
export function resolveVisibleUserIds(
  queueMemberUserIds: string[],
  supervisedProfiles: { memberUserIds: string[] }[],
): string[] {
  const set = new Set(queueMemberUserIds);
  for (const p of supervisedProfiles) {
    for (const id of p.memberUserIds) set.add(id);
  }
  return [...set];
}
