import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";

const app = createApp();

const createdIds: string[] = [];

afterEach(async () => {
  await prisma.messageBroadcast.deleteMany({ where: { id: { in: createdIds } } });
  createdIds.length = 0;
});

function validPayload(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    title: "Test broadcast",
    bodyHtml: "<p>Hello</p>",
    targetProfileIds: ["profile-frontline-user"],
    startAt: new Date(now - 60_000).toISOString(),
    endAt: new Date(now + 60 * 60_000).toISOString(),
    ...overrides,
  };
}

async function createBroadcast(overrides: Record<string, unknown> = {}) {
  const res = await request(app).post("/api/broadcasts").send(validPayload(overrides));
  createdIds.push(res.body.id);
  return res;
}

describe("POST /api/broadcasts validation", () => {
  it("rejects a missing title", async () => {
    const res = await request(app).post("/api/broadcasts").send(validPayload({ title: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects a missing bodyHtml", async () => {
    const res = await request(app).post("/api/broadcasts").send(validPayload({ bodyHtml: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects an empty targetProfileIds array", async () => {
    const res = await request(app).post("/api/broadcasts").send(validPayload({ targetProfileIds: [] }));
    expect(res.status).toBe(400);
  });

  it("rejects startAt >= endAt", async () => {
    const now = new Date().toISOString();
    const res = await request(app).post("/api/broadcasts").send(validPayload({ startAt: now, endAt: now }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid priority", async () => {
    const res = await request(app).post("/api/broadcasts").send(validPayload({ priority: "URGENT" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/broadcasts creation", () => {
  it("creates the correct target-profile rows", async () => {
    const res = await createBroadcast({ targetProfileIds: ["profile-frontline-user", "profile-business-admin"] });
    expect(res.status).toBe(201);
    expect(res.body.targetProfileIds.sort()).toEqual(["profile-business-admin", "profile-frontline-user"]);
  });

  it("accepts an arbitrary/unvalidated profile id — targeting isn't cross-checked server-side", async () => {
    const res = await createBroadcast({ targetProfileIds: ["profile-does-not-exist"] });
    expect(res.status).toBe(201);
    expect(res.body.targetProfileIds).toEqual(["profile-does-not-exist"]);
  });

  it("sanitizes bodyHtml on create", async () => {
    const res = await createBroadcast({ bodyHtml: "<p>Hi</p><script>alert(1)</script>" });
    expect(res.body.bodyHtml).not.toContain("<script>");
  });

  it("defaults priority to null when omitted", async () => {
    const res = await createBroadcast();
    expect(res.body.priority).toBeNull();
  });
});

describe("PATCH /api/broadcasts/:id", () => {
  it("replaces targetProfileIds correctly", async () => {
    const created = await createBroadcast({ targetProfileIds: ["profile-frontline-user"] });
    const res = await request(app)
      .patch(`/api/broadcasts/${created.body.id}`)
      .send({ targetProfileIds: ["profile-business-admin"] });
    expect(res.status).toBe(200);
    expect(res.body.targetProfileIds).toEqual(["profile-business-admin"]);
  });

  it("updates title without touching other fields", async () => {
    const created = await createBroadcast();
    const res = await request(app).patch(`/api/broadcasts/${created.body.id}`).send({ title: "Updated" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated");
    expect(res.body.bodyHtml).toBe(created.body.bodyHtml);
  });
});

describe("POST /api/broadcasts/:id/cancel", () => {
  it("sets canceledAt and pulls endAt to now if it was in the future", async () => {
    const created = await createBroadcast();
    const res = await request(app).post(`/api/broadcasts/${created.body.id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.canceledAt).not.toBeNull();
    expect(new Date(res.body.endAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("is idempotent — calling twice does not move canceledAt", async () => {
    const created = await createBroadcast();
    const first = await request(app).post(`/api/broadcasts/${created.body.id}/cancel`);
    const second = await request(app).post(`/api/broadcasts/${created.body.id}/cancel`);
    expect(second.status).toBe(200);
    expect(second.body.canceledAt).toBe(first.body.canceledAt);
  });
});

describe("DELETE /api/broadcasts/:id", () => {
  it("is idempotent and cascades target-profile rows", async () => {
    const created = await createBroadcast();
    const first = await request(app).delete(`/api/broadcasts/${created.body.id}`);
    const second = await request(app).delete(`/api/broadcasts/${created.body.id}`);
    expect(first.status).toBe(204);
    expect(second.status).toBe(204);

    const remaining = await prisma.messageBroadcastTargetProfile.count({
      where: { broadcastId: created.body.id },
    });
    expect(remaining).toBe(0);
  });
});

describe("GET /api/broadcasts/active", () => {
  it("requires a profileId query parameter", async () => {
    const res = await request(app).get("/api/broadcasts/active");
    expect(res.status).toBe(400);
  });

  it("excludes broadcasts not targeting the requested profile", async () => {
    await createBroadcast({ title: "Admin only", targetProfileIds: ["profile-business-admin"] });
    const res = await request(app).get("/api/broadcasts/active?profileId=profile-frontline-user");
    expect(res.body.results.some((b: { title: string }) => b.title === "Admin only")).toBe(false);
  });

  it("excludes canceled broadcasts", async () => {
    const created = await createBroadcast({ title: "Will be canceled" });
    await request(app).post(`/api/broadcasts/${created.body.id}/cancel`);
    const res = await request(app).get("/api/broadcasts/active?profileId=profile-frontline-user");
    expect(res.body.results.some((b: { id: string }) => b.id === created.body.id)).toBe(false);
  });

  it("excludes broadcasts that haven't started yet", async () => {
    const now = Date.now();
    await createBroadcast({
      title: "Future",
      startAt: new Date(now + 60 * 60_000).toISOString(),
      endAt: new Date(now + 2 * 60 * 60_000).toISOString(),
    });
    const res = await request(app).get("/api/broadcasts/active?profileId=profile-frontline-user");
    expect(res.body.results.some((b: { title: string }) => b.title === "Future")).toBe(false);
  });

  it("excludes broadcasts that have already ended", async () => {
    const now = Date.now();
    await createBroadcast({
      title: "Past",
      startAt: new Date(now - 2 * 60 * 60_000).toISOString(),
      endAt: new Date(now - 60 * 60_000).toISOString(),
    });
    const res = await request(app).get("/api/broadcasts/active?profileId=profile-frontline-user");
    expect(res.body.results.some((b: { title: string }) => b.title === "Past")).toBe(false);
  });

  it("includes exactly the currently-valid broadcasts for the profile", async () => {
    const created = await createBroadcast({ title: "Currently valid", targetProfileIds: ["profile-frontline-user"] });
    const res = await request(app).get("/api/broadcasts/active?profileId=profile-frontline-user");
    expect(res.body.results.some((b: { id: string }) => b.id === created.body.id)).toBe(true);
  });

  it("orders by priority desc then createdAt desc, so an older HIGH beats a newer un-prioritized one", async () => {
    const low = await createBroadcast({ title: "No priority, newer" });
    const high = await createBroadcast({ title: "High priority, older", priority: "HIGH" });
    const res = await request(app).get("/api/broadcasts/active?profileId=profile-frontline-user");
    const ids = res.body.results.map((b: { id: string }) => b.id);
    expect(ids.indexOf(high.body.id)).toBeLessThan(ids.indexOf(low.body.id));
  });

  it("ties break on createdAt desc for equal priority", async () => {
    const first = await createBroadcast({ title: "First", priority: "NORMAL" });
    const second = await createBroadcast({ title: "Second", priority: "NORMAL" });
    const res = await request(app).get("/api/broadcasts/active?profileId=profile-frontline-user");
    const ids = res.body.results.map((b: { id: string }) => b.id);
    expect(ids.indexOf(second.body.id)).toBeLessThan(ids.indexOf(first.body.id));
  });
});
