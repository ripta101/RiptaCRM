import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { SERVICE_KEY_HEADER, signTestToken } from "../testHelpers";

const app = createApp();

const createdSiteIds: string[] = [];
const createdQueueIds: string[] = [];
const createdConversationIds: string[] = [];
const createdOverrideUserIds: string[] = [];

afterEach(async () => {
  await prisma.message.deleteMany({ where: { conversationId: { in: createdConversationIds } } });
  await prisma.conversation.deleteMany({ where: { id: { in: createdConversationIds.splice(0) } } });
  await prisma.site.deleteMany({ where: { id: { in: createdSiteIds.splice(0) } } });
  await prisma.webChatQueueMember.deleteMany({ where: { queueId: { in: createdQueueIds } } });
  await prisma.webChatQueue.deleteMany({ where: { id: { in: createdQueueIds.splice(0) } } });
  await prisma.agentCapacityOverride.deleteMany({ where: { userId: { in: createdOverrideUserIds.splice(0) } } });
});

async function setupSite() {
  const site = await request(app).post("/api/sites").set(SERVICE_KEY_HEADER).send({ name: `Site ${randomUUID()}` });
  createdSiteIds.push(site.body.id);
  return site.body.id as string;
}

async function setupQueueWithMember(userId: string) {
  const queue = await request(app).post("/api/queues").set(SERVICE_KEY_HEADER).send({ name: `Queue ${randomUUID()}` });
  createdQueueIds.push(queue.body.id);
  await request(app).post(`/api/queues/${queue.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId });
  return queue.body.id as string;
}

async function grantCapacity(userId: string, maxConcurrentChats: number) {
  createdOverrideUserIds.push(userId);
  await request(app).put(`/api/capacity-overrides/${userId}`).set(SERVICE_KEY_HEADER).send({ maxConcurrentChats });
}

async function createConversation(siteId: string, assignedQueueId: string | null = null, assignedToUserId: string | null = null) {
  const conversation = await prisma.conversation.create({
    data: { siteId, pageUrlPath: "/support", assignedQueueId, assignedToUserId },
  });
  createdConversationIds.push(conversation.id);
  return conversation;
}

describe("Admin conversation routes", () => {
  it("lists conversations filtered by status/assignedQueueId/unassigned", async () => {
    const siteId = await setupSite();
    const queueId = await setupQueueWithMember(`user-${randomUUID()}`);
    const unassigned = await createConversation(siteId, queueId);
    await createConversation(siteId, queueId, "user-1");

    const res = await request(app)
      .get(`/api/conversations?assignedQueueId=${queueId}&unassigned=true`)
      .set(SERVICE_KEY_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.results.map((c: { id: string }) => c.id)).toEqual([unassigned.id]);
  });

  it("404s reading an unknown conversation, 200s a known one", async () => {
    const missing = await request(app).get("/api/conversations/does-not-exist").set(SERVICE_KEY_HEADER);
    expect(missing.status).toBe(404);

    const siteId = await setupSite();
    const conversation = await createConversation(siteId);
    const found = await request(app).get(`/api/conversations/${conversation.id}`).set(SERVICE_KEY_HEADER);
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(conversation.id);
    expect(found.body.messages).toEqual([]);
  });

  it("GET /conversations/:id accepts any authenticated user, not just webchat-config", async () => {
    const siteId = await setupSite();
    const conversation = await createConversation(siteId);
    const token = signTestToken([]); // no grants at all, just a valid session
    const res = await request(app).get(`/api/conversations/${conversation.id}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("assigns a conversation to a user", async () => {
    const siteId = await setupSite();
    const conversation = await createConversation(siteId);

    const missingBody = await request(app).post(`/api/conversations/${conversation.id}/assign`).set(SERVICE_KEY_HEADER).send({});
    expect(missingBody.status).toBe(400);

    const res = await request(app)
      .post(`/api/conversations/${conversation.id}/assign`)
      .set(SERVICE_KEY_HEADER)
      .send({ assignedToUserId: "user-1" });
    expect(res.status).toBe(200);
    expect(res.body.assignedToUserId).toBe("user-1");
  });
});

describe("GET /conversations/worklist", () => {
  it("splits results into assigned-to-me (not claimable) and unclaimed-in-my-queues (claimable)", async () => {
    const userId = `user-${randomUUID()}`;
    const siteId = await setupSite();
    const queueId = await setupQueueWithMember(userId);

    const assignedToMe = await createConversation(siteId, queueId, userId);
    const claimableForMe = await createConversation(siteId, queueId, null);
    // Not in my queue at all — should never appear.
    const otherQueueId = await setupQueueWithMember(`user-${randomUUID()}`);
    await createConversation(siteId, otherQueueId, null);

    const res = await request(app).get(`/api/conversations/worklist?userId=${userId}`).set(SERVICE_KEY_HEADER);
    expect(res.status).toBe(200);

    const byId = new Map(res.body.results.map((i: { id: string; claimable: boolean }) => [i.id, i.claimable]));
    expect(byId.get(assignedToMe.id)).toBe(false);
    expect(byId.get(claimableForMe.id)).toBe(true);
    expect(byId.size).toBe(2);
  });

  it("requires a userId query parameter", async () => {
    const res = await request(app).get("/api/conversations/worklist").set(SERVICE_KEY_HEADER);
    expect(res.status).toBe(400);
  });
});

describe("POST /conversations/:id/claim", () => {
  it("claims an unassigned conversation in a queue the caller is a member of", async () => {
    const siteId = await setupSite();
    // signTestToken's sub is hardcoded to "test-user" — the queue membership and capacity
    // grant must be set up for that exact id, not an arbitrary generated one.
    const queueId = await setupQueueWithMember("test-user");
    await grantCapacity("test-user", 2);
    const conversation = await createConversation(siteId, queueId, null);
    const token = signTestToken(["webchat-agent"]);

    const res = await request(app)
      .post(`/api/conversations/${conversation.id}/claim`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.assignedToUserId).toBe("test-user");
  });

  it("403s when the caller isn't a member of the conversation's queue", async () => {
    const siteId = await setupSite();
    const queueId = await setupQueueWithMember(`user-${randomUUID()}`); // "test-user" is NOT a member
    const conversation = await createConversation(siteId, queueId, null);
    const token = signTestToken(["webchat-agent"]);

    const res = await request(app).post(`/api/conversations/${conversation.id}/claim`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("409s when already assigned", async () => {
    const siteId = await setupSite();
    const queueId = await setupQueueWithMember("test-user");
    await grantCapacity("test-user", 2);
    const conversation = await createConversation(siteId, queueId, "someone-else");
    const token = signTestToken(["webchat-agent"]);

    const res = await request(app).post(`/api/conversations/${conversation.id}/claim`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it("409s when the caller is at their concurrent chat capacity", async () => {
    const siteId = await setupSite();
    const queueId = await setupQueueWithMember("test-user");
    await grantCapacity("test-user", 1);
    // Already-open chat consuming the caller's only slot.
    await createConversation(siteId, queueId, "test-user");
    const conversation = await createConversation(siteId, queueId, null);
    const token = signTestToken(["webchat-agent"]);

    const res = await request(app).post(`/api/conversations/${conversation.id}/claim`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it("only one of two concurrent claims succeeds; the loser gets 409", async () => {
    const siteId = await setupSite();
    const queueId = await setupQueueWithMember("test-user");
    await grantCapacity("test-user", 5);
    const conversation = await createConversation(siteId, queueId, null);
    const token = signTestToken(["webchat-agent"]);

    const [first, second] = await Promise.all([
      request(app).post(`/api/conversations/${conversation.id}/claim`).set("Authorization", `Bearer ${token}`),
      request(app).post(`/api/conversations/${conversation.id}/claim`).set("Authorization", `Bearer ${token}`),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);
  });
});

describe("POST /conversations/:id/messages (agent-authored)", () => {
  it("creates an AGENT message and requires a non-empty body", async () => {
    const siteId = await setupSite();
    const conversation = await createConversation(siteId);
    const token = signTestToken(["webchat-agent"]);

    const empty = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ body: "" });
    expect(empty.status).toBe(400);

    const res = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ body: "How can I help?" });
    expect(res.status).toBe(201);
    expect(res.body.senderType).toBe("AGENT");
    expect(res.body.senderUserId).toBe("test-user");
  });
});
