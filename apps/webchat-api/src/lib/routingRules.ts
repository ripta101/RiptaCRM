export interface RoutingRuleLike {
  id: string;
  pattern: string;
  matchType: string; // "EXACT" | "PREFIX"
  priority: number;
  isActive: boolean;
}

// Pure — no Prisma, no fetch. Filters inactive rules, evaluates in priority order (lower
// first), first match wins. Caller falls back to the Site's defaultQueueId when this
// returns null.
export function matchRule<T extends RoutingRuleLike>(rules: T[], pageUrlPath: string): T | null {
  const active = rules.filter((r) => r.isActive).slice().sort((a, b) => a.priority - b.priority);

  for (const rule of active) {
    if (rule.matchType === "EXACT" && pageUrlPath === rule.pattern) return rule;
    if (rule.matchType === "PREFIX" && pageUrlPath.startsWith(rule.pattern)) return rule;
  }

  return null;
}
