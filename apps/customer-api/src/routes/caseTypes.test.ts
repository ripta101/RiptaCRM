import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";

const app = createApp();

function mockFetchOnce(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/lodgeable-case-types", () => {
  it("filters to active case types with a published version", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { id: "ct-1", key: "a", name: "A", isActive: true, publishedVersion: { id: "v1" }, draftVersion: null },
          { id: "ct-2", key: "b", name: "B", isActive: true, publishedVersion: null, draftVersion: { id: "v2" } },
          { id: "ct-3", key: "c", name: "C", isActive: false, publishedVersion: { id: "v3" }, draftVersion: null },
        ],
      }),
    });

    const res = await request(app).get("/api/lodgeable-case-types");
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].id).toBe("ct-1");
  });

  it("fails soft to an empty list when case-management-api is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("connect ECONNREFUSED")),
    );

    const res = await request(app).get("/api/lodgeable-case-types");
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });
});

describe("GET /api/case-type-versions/:versionId", () => {
  it("relays a successful upstream response", async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ id: "v1", fields: [], stages: [] }) });

    const res = await request(app).get("/api/case-type-versions/v1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "v1", fields: [], stages: [] });
  });

  it("relays an upstream error rather than failing soft", async () => {
    mockFetchOnce({ ok: false, status: 404, json: async () => ({ error: "Case type version not found." }) });

    const res = await request(app).get("/api/case-type-versions/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe("POST /api/case-instances (proxy)", () => {
  it("relays a successful creation", async () => {
    mockFetchOnce({ ok: true, status: 201, json: async () => ({ id: "case-1", assignedToUserId: "user-1" }) });

    const res = await request(app).post("/api/case-instances").send({ caseTypeId: "ct-1" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("case-1");
  });

  it("relays an upstream validation error rather than failing soft", async () => {
    mockFetchOnce({ ok: false, status: 400, json: async () => ({ error: "Missing required field(s): Description" }) });

    const res = await request(app).post("/api/case-instances").send({ caseTypeId: "ct-1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing required/i);
  });
});
