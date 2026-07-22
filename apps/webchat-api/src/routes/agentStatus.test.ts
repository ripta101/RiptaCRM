import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { SERVICE_KEY_HEADER, signTestToken } from "../testHelpers";

const app = createApp();

const createdOptionIds: string[] = [];
const createdStatusUserIds: string[] = [];

afterEach(async () => {
  await prisma.agentStatus.deleteMany({ where: { userId: { in: createdStatusUserIds.splice(0) } } });
  await prisma.agentStatusOption.deleteMany({ where: { id: { in: createdOptionIds.splice(0) } } });
});

async function createOption(overrides: { label?: string; isAvailableForChats?: boolean } = {}) {
  const res = await request(app)
    .post("/api/agent-status-options")
    .set(SERVICE_KEY_HEADER)
    .send({ label: overrides.label ?? `Status ${randomUUID()}`, isAvailableForChats: overrides.isAvailableForChats ?? false });
  createdOptionIds.push(res.body.id);
  return res.body as { id: string; label: string; isAvailableForChats: boolean };
}

describe("Agent status options (admin)", () => {
  it("creates, lists, updates, and idempotently deletes an option", async () => {
    const created = await createOption({ label: `Available ${randomUUID()}`, isAvailableForChats: true });
    expect(created.isAvailableForChats).toBe(true);

    const list = await request(app).get("/api/agent-status-options").set(SERVICE_KEY_HEADER);
    expect(list.body.results.map((o: { id: string }) => o.id)).toContain(created.id);

    const updated = await request(app)
      .patch(`/api/agent-status-options/${created.id}`)
      .set(SERVICE_KEY_HEADER)
      .send({ isAvailableForChats: false });
    expect(updated.status).toBe(200);
    expect(updated.body.isAvailableForChats).toBe(false);

    const deleted = await request(app).delete(`/api/agent-status-options/${created.id}`).set(SERVICE_KEY_HEADER);
    expect(deleted.status).toBe(204);
    const deletedAgain = await request(app).delete(`/api/agent-status-options/${created.id}`).set(SERVICE_KEY_HEADER);
    expect(deletedAgain.status).toBe(204);
    createdOptionIds.splice(0); // already gone
  });

  it("rejects an empty label and a duplicate label", async () => {
    const empty = await request(app).post("/api/agent-status-options").set(SERVICE_KEY_HEADER).send({ label: "  " });
    expect(empty.status).toBe(400);

    const label = `Duplicate ${randomUUID()}`;
    await createOption({ label });
    const dupe = await request(app).post("/api/agent-status-options").set(SERVICE_KEY_HEADER).send({ label });
    expect(dupe.status).toBe(409);
  });

  it("404s updating an unknown option", async () => {
    const res = await request(app)
      .patch("/api/agent-status-options/does-not-exist")
      .set(SERVICE_KEY_HEADER)
      .send({ isAvailableForChats: true });
    expect(res.status).toBe(404);
  });

  it("clears (SetNull) an agent's status rather than leaving it dangling when their option is deleted", async () => {
    const option = await createOption({ isAvailableForChats: true });
    const userId = `user-${randomUUID()}`;
    createdStatusUserIds.push(userId);
    await prisma.agentStatus.create({ data: { userId, optionId: option.id } });

    const deleted = await request(app).delete(`/api/agent-status-options/${option.id}`).set(SERVICE_KEY_HEADER);
    expect(deleted.status).toBe(204);
    createdOptionIds.splice(0);

    const status = await prisma.agentStatus.findUnique({ where: { userId } });
    expect(status?.optionId).toBeNull();
  });
});

describe("Self agent status", () => {
  it("returns null before any status has ever been set", async () => {
    const token = signTestToken(["webchat-agent"]);
    const res = await request(app).get("/api/agent-status/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("sets and reads back the caller's own status", async () => {
    const option = await createOption({ isAvailableForChats: true });
    const token = signTestToken(["webchat-agent"]);

    const set = await request(app)
      .put("/api/agent-status/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ optionId: option.id });
    expect(set.status).toBe(200);
    expect(set.body.optionId).toBe(option.id);
    createdStatusUserIds.push("test-user"); // signTestToken's hardcoded sub

    const get = await request(app).get("/api/agent-status/me").set("Authorization", `Bearer ${token}`);
    expect(get.body.optionId).toBe(option.id);
  });

  it("clears the caller's status back to unset with optionId: null", async () => {
    const option = await createOption({ isAvailableForChats: true });
    const token = signTestToken(["webchat-agent"]);
    await request(app).put("/api/agent-status/me").set("Authorization", `Bearer ${token}`).send({ optionId: option.id });
    createdStatusUserIds.push("test-user");

    const cleared = await request(app).put("/api/agent-status/me").set("Authorization", `Bearer ${token}`).send({ optionId: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.optionId).toBeNull();
  });

  it("rejects an unknown optionId", async () => {
    const token = signTestToken(["webchat-agent"]);
    const res = await request(app)
      .put("/api/agent-status/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ optionId: "not-a-real-option" });
    expect(res.status).toBe(400);
  });
});

describe("PUT /agent-status/:userId (admin escape hatch)", () => {
  it("sets an arbitrary user's status by id, distinct from the caller's own /me status", async () => {
    const option = await createOption({ isAvailableForChats: true });
    const otherUserId = `user-${randomUUID()}`;
    createdStatusUserIds.push(otherUserId);

    const res = await request(app)
      .put(`/api/agent-status/${otherUserId}`)
      .set(SERVICE_KEY_HEADER)
      .send({ optionId: option.id });
    expect(res.status).toBe(200);
    expect(res.body.optionId).toBe(option.id);

    // "me" must still resolve to the /me route, not fall through to :userId="me".
    const token = signTestToken(["webchat-agent"]);
    const me = await request(app).get("/api/agent-status/me").set("Authorization", `Bearer ${token}`);
    expect(me.body).toBeNull();
  });
});
