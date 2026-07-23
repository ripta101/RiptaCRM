import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { signTestToken } from "../testHelpers";

const app = createApp();

describe("GET /supervisor/agents", () => {
  it("401s with no token", async () => {
    const res = await request(app).get("/api/supervisor/agents?closedFrom=2026-01-01&closedTo=2026-01-02");
    expect(res.status).toBe(401);
  });

  it("403s without the webchat-supervisor grant", async () => {
    const token = signTestToken(["webchat-agent"], { profileId: "profile-1" });
    const res = await request(app)
      .get("/api/supervisor/agents?closedFrom=2026-01-01&closedTo=2026-01-02")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("400s when closedFrom/closedTo are missing or invalid", async () => {
    const token = signTestToken(["webchat-supervisor"], { profileId: "profile-1" });

    const missing = await request(app).get("/api/supervisor/agents").set("Authorization", `Bearer ${token}`);
    expect(missing.status).toBe(400);

    const invalid = await request(app)
      .get("/api/supervisor/agents?closedFrom=not-a-date&closedTo=2026-01-02")
      .set("Authorization", `Bearer ${token}`);
    expect(invalid.status).toBe(400);
  });

  // access-management-api isn't running during `pnpm test` — this deterministically exercises
  // resolveSupervisorScope's fail-soft branch (empty scope/results, not a 500), the same
  // vitest-coverable ceiling routeConversation.ts's resolveEffectiveCapacity already has for
  // its own access-management-api call, since nothing in this codebase mocks fetch.
  it("degrades to an empty scope and results when access-management-api is unreachable", async () => {
    const token = signTestToken(["webchat-supervisor"], { profileId: "profile-1" });
    const res = await request(app)
      .get("/api/supervisor/agents?closedFrom=2026-01-01&closedTo=2026-01-02")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ scope: { queues: [], profiles: [] }, results: [] });
  });

  it("401s when the token carries no profileId claim", async () => {
    const token = signTestToken(["webchat-supervisor"]); // no extraClaims — no profileId
    const res = await request(app)
      .get("/api/supervisor/agents?closedFrom=2026-01-01&closedTo=2026-01-02")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
