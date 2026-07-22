import { describe, expect, it } from "vitest";
import { matchRule, type RoutingRuleLike } from "./routingRules";

function rule(overrides: Partial<RoutingRuleLike> = {}): RoutingRuleLike {
  return {
    id: "rule-1",
    pattern: "/support",
    matchType: "PREFIX",
    priority: 0,
    isActive: true,
    ...overrides,
  };
}

describe("matchRule", () => {
  it("matches EXACT only on an identical path", () => {
    const rules = [rule({ id: "r1", pattern: "/pricing", matchType: "EXACT" })];
    expect(matchRule(rules, "/pricing")?.id).toBe("r1");
    expect(matchRule(rules, "/pricing/enterprise")).toBeNull();
  });

  it("matches PREFIX on any path starting with the pattern", () => {
    const rules = [rule({ id: "r1", pattern: "/support", matchType: "PREFIX" })];
    expect(matchRule(rules, "/support")?.id).toBe("r1");
    expect(matchRule(rules, "/support/billing")?.id).toBe("r1");
    expect(matchRule(rules, "/other")).toBeNull();
  });

  it("evaluates rules in priority order, lower first, and returns the first match", () => {
    const rules = [
      rule({ id: "low-priority", pattern: "/", matchType: "PREFIX", priority: 10 }),
      rule({ id: "high-priority", pattern: "/support", matchType: "PREFIX", priority: 0 }),
    ];
    expect(matchRule(rules, "/support/billing")?.id).toBe("high-priority");
  });

  it("skips inactive rules even if they would otherwise match", () => {
    const rules = [rule({ id: "inactive", pattern: "/support", isActive: false })];
    expect(matchRule(rules, "/support")).toBeNull();
  });

  it("returns null when nothing matches, letting the caller fall back to the site default", () => {
    const rules = [rule({ pattern: "/support" })];
    expect(matchRule(rules, "/pricing")).toBeNull();
  });
});
