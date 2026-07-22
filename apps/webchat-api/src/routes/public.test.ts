import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { SERVICE_KEY_HEADER } from "../testHelpers";

const app = createApp();

const createdSiteIds: string[] = [];
const createdQueueIds: string[] = [];
const createdConversationIds: string[] = [];
const createdStatusUserIds: string[] = [];
const createdStatusOptionIds: string[] = [];

afterEach(async () => {
  await prisma.message.deleteMany({ where: { conversationId: { in: createdConversationIds } } });
  await prisma.conversation.deleteMany({ where: { id: { in: createdConversationIds.splice(0) } } });
  await prisma.routingRule.deleteMany({ where: { siteId: { in: createdSiteIds } } });
  await prisma.site.deleteMany({ where: { id: { in: createdSiteIds.splice(0) } } });
  await prisma.webChatQueue.deleteMany({ where: { id: { in: createdQueueIds.splice(0) } } });
  await prisma.agentStatus.deleteMany({ where: { userId: { in: createdStatusUserIds.splice(0) } } });
  await prisma.agentStatusOption.deleteMany({ where: { id: { in: createdStatusOptionIds.splice(0) } } });
});

// Auto-assignment now requires a candidate to have a status marked isAvailableForChats
// (see services/routeConversation.ts) — a throwaway option per test, not seed data.
async function grantAvailableStatus(userId: string) {
  const option = await prisma.agentStatusOption.create({
    data: { label: `Available ${randomUUID()}`, isAvailableForChats: true },
  });
  createdStatusOptionIds.push(option.id);
  await prisma.agentStatus.create({ data: { userId, optionId: option.id } });
  createdStatusUserIds.push(userId);
}

async function setupSiteWithRule(overrides: { allowedOrigins?: string } = {}) {
  const queue = await request(app).post("/api/queues").set(SERVICE_KEY_HEADER).send({ name: `Queue ${randomUUID()}` });
  createdQueueIds.push(queue.body.id);

  const site = await request(app)
    .post("/api/sites")
    .set(SERVICE_KEY_HEADER)
    .send({ name: `Site ${randomUUID()}`, defaultQueueId: queue.body.id, ...overrides });
  createdSiteIds.push(site.body.id);

  await request(app)
    .post("/api/routing-rules")
    .set(SERVICE_KEY_HEADER)
    .send({
      siteId: site.body.id,
      pattern: "/support",
      matchType: "PREFIX",
      autoReplyText: "Thanks for reaching Support!",
      targetQueueId: queue.body.id,
    });

  return { siteKey: site.body.siteKey as string, siteId: site.body.id as string, queueId: queue.body.id as string };
}

describe("POST /api/public/conversations", () => {
  it("404s for an unknown siteKey", async () => {
    const res = await request(app).post("/api/public/conversations").send({ siteKey: "not-a-real-key", pageUrlPath: "/" });
    expect(res.status).toBe(404);
  });

  it("requires pageUrlPath", async () => {
    const { siteKey } = await setupSiteWithRule();
    const res = await request(app).post("/api/public/conversations").send({ siteKey });
    expect(res.status).toBe(400);
  });

  it("starts a conversation, matches the routing rule, and writes its autoReplyText as a SYSTEM message", async () => {
    const { siteKey, queueId } = await setupSiteWithRule();

    const res = await request(app).post("/api/public/conversations").send({ siteKey, pageUrlPath: "/support/billing" });
    expect(res.status).toBe(201);
    createdConversationIds.push(res.body.id);

    expect(res.body.assignedQueueId).toBe(queueId);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0]).toMatchObject({ senderType: "SYSTEM", body: "Thanks for reaching Support!" });
  });

  it("falls back to the site's defaultQueueId when no rule matches", async () => {
    const { siteKey, queueId } = await setupSiteWithRule();

    const res = await request(app).post("/api/public/conversations").send({ siteKey, pageUrlPath: "/nowhere-matched" });
    expect(res.status).toBe(201);
    createdConversationIds.push(res.body.id);
    expect(res.body.assignedQueueId).toBe(queueId);
    expect(res.body.messages).toHaveLength(0); // no rule matched, so no autoReplyText to write
  });

  it("resumes an existing open conversation instead of creating a new one", async () => {
    const { siteKey } = await setupSiteWithRule();
    const first = await request(app).post("/api/public/conversations").send({ siteKey, pageUrlPath: "/support" });
    createdConversationIds.push(first.body.id);

    const resumed = await request(app)
      .post("/api/public/conversations")
      .send({ siteKey, conversationId: first.body.id, pageUrlPath: "/support" });
    expect(resumed.status).toBe(200);
    expect(resumed.body.id).toBe(first.body.id);
  });

  it("starts a fresh conversation when given an unknown/foreign conversationId, rather than erroring", async () => {
    const { siteKey } = await setupSiteWithRule();
    const res = await request(app)
      .post("/api/public/conversations")
      .send({ siteKey, conversationId: "not-a-real-conversation", pageUrlPath: "/support" });
    expect(res.status).toBe(201);
    createdConversationIds.push(res.body.id);
    expect(res.body.id).not.toBe("not-a-real-conversation");
  });
});

describe("POST /api/public/conversations/:id/messages", () => {
  it("creates a VISITOR message", async () => {
    const { siteKey } = await setupSiteWithRule();
    const conversation = await request(app).post("/api/public/conversations").send({ siteKey, pageUrlPath: "/support" });
    createdConversationIds.push(conversation.body.id);

    const res = await request(app)
      .post(`/api/public/conversations/${conversation.body.id}/messages`)
      .send({ siteKey, body: "Hi, I need help" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ senderType: "VISITOR", body: "Hi, I need help" });
  });

  it("404s with the wrong siteKey for the conversation", async () => {
    const { siteKey } = await setupSiteWithRule();
    const other = await setupSiteWithRule();
    const conversation = await request(app).post("/api/public/conversations").send({ siteKey, pageUrlPath: "/support" });
    createdConversationIds.push(conversation.body.id);

    const res = await request(app)
      .post(`/api/public/conversations/${conversation.body.id}/messages`)
      .send({ siteKey: other.siteKey, body: "Hi" });
    expect(res.status).toBe(404);
  });

  it("409s on a closed conversation", async () => {
    const { siteKey } = await setupSiteWithRule();
    const conversation = await request(app).post("/api/public/conversations").send({ siteKey, pageUrlPath: "/support" });
    createdConversationIds.push(conversation.body.id);
    await prisma.conversation.update({ where: { id: conversation.body.id }, data: { status: "CLOSED" } });

    const res = await request(app)
      .post(`/api/public/conversations/${conversation.body.id}/messages`)
      .send({ siteKey, body: "Still there?" });
    expect(res.status).toBe(409);
  });
});

describe("GET /api/public/conversations/:id", () => {
  it("returns the conversation with its messages for the right siteKey", async () => {
    const { siteKey } = await setupSiteWithRule();
    const conversation = await request(app).post("/api/public/conversations").send({ siteKey, pageUrlPath: "/support" });
    createdConversationIds.push(conversation.body.id);

    const res = await request(app).get(`/api/public/conversations/${conversation.body.id}?siteKey=${siteKey}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(conversation.body.id);
  });

  it("404s for a mismatched siteKey", async () => {
    const { siteKey } = await setupSiteWithRule();
    const conversation = await request(app).post("/api/public/conversations").send({ siteKey, pageUrlPath: "/support" });
    createdConversationIds.push(conversation.body.id);

    const res = await request(app).get(`/api/public/conversations/${conversation.body.id}?siteKey=wrong-key`);
    expect(res.status).toBe(404);
  });
});

describe("Public CORS origin validation", () => {
  it("reflects the request Origin when the site has no allowedOrigins restriction", async () => {
    const { siteKey } = await setupSiteWithRule();
    const res = await request(app)
      .post("/api/public/conversations")
      .set("Origin", "https://totally-arbitrary-customer-site.example")
      .send({ siteKey, pageUrlPath: "/support" });
    createdConversationIds.push(res.body.id);
    expect(res.headers["access-control-allow-origin"]).toBe("https://totally-arbitrary-customer-site.example");
  });

  it("does not allow an origin outside the site's configured allowedOrigins", async () => {
    const { siteKey } = await setupSiteWithRule({ allowedOrigins: "https://trusted.example" });
    const res = await request(app)
      .post("/api/public/conversations")
      .set("Origin", "https://not-trusted.example")
      .send({ siteKey, pageUrlPath: "/support" });
    if (res.body?.id) createdConversationIds.push(res.body.id);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows an origin that IS in the site's configured allowedOrigins", async () => {
    const { siteKey } = await setupSiteWithRule({ allowedOrigins: "https://trusted.example" });
    const res = await request(app)
      .post("/api/public/conversations")
      .set("Origin", "https://trusted.example")
      .send({ siteKey, pageUrlPath: "/support" });
    createdConversationIds.push(res.body.id);
    expect(res.headers["access-control-allow-origin"]).toBe("https://trusted.example");
  });
});

describe("Auto-assignment fairness (round-robin + status gating)", () => {
  it("distributes consecutive conversations round-robin across available members, not by spare capacity", async () => {
    const { siteKey, queueId } = await setupSiteWithRule();
    const highCapacity = `user-${randomUUID()}`;
    const lowCapacity = `user-${randomUUID()}`;
    await request(app).post(`/api/queues/${queueId}/members`).set(SERVICE_KEY_HEADER).send({ userId: highCapacity });
    await request(app).post(`/api/queues/${queueId}/members`).set(SERVICE_KEY_HEADER).send({ userId: lowCapacity });
    await request(app).put(`/api/capacity-overrides/${highCapacity}`).set(SERVICE_KEY_HEADER).send({ maxConcurrentChats: 5 });
    await request(app).put(`/api/capacity-overrides/${lowCapacity}`).set(SERVICE_KEY_HEADER).send({ maxConcurrentChats: 1 });
    await grantAvailableStatus(highCapacity);
    await grantAvailableStatus(lowCapacity);

    const first = await request(app).post("/api/public/conversations").send({ siteKey, pageUrlPath: "/support" });
    createdConversationIds.push(first.body.id);
    const second = await request(app).post("/api/public/conversations").send({ siteKey, pageUrlPath: "/support" });
    createdConversationIds.push(second.body.id);

    // The reported real-world case: the high-capacity member getting the first chat must
    // not make them "sticky" for the second one too — the never-yet-assigned member (even
    // with far less capacity) goes next.
    expect(second.body.assignedToUserId).not.toBe(first.body.assignedToUserId);
    expect([highCapacity, lowCapacity]).toContain(first.body.assignedToUserId);
    expect([highCapacity, lowCapacity]).toContain(second.body.assignedToUserId);
  });

  it("skips a queue member without an available status, even though they have spare capacity", async () => {
    const { siteKey, queueId } = await setupSiteWithRule();
    const notReady = `user-${randomUUID()}`;
    const ready = `user-${randomUUID()}`;
    await request(app).post(`/api/queues/${queueId}/members`).set(SERVICE_KEY_HEADER).send({ userId: notReady });
    await request(app).post(`/api/queues/${queueId}/members`).set(SERVICE_KEY_HEADER).send({ userId: ready });
    await request(app).put(`/api/capacity-overrides/${notReady}`).set(SERVICE_KEY_HEADER).send({ maxConcurrentChats: 5 });
    await request(app).put(`/api/capacity-overrides/${ready}`).set(SERVICE_KEY_HEADER).send({ maxConcurrentChats: 5 });
    // notReady is deliberately left with no AgentStatus row at all.
    await grantAvailableStatus(ready);

    const res = await request(app).post("/api/public/conversations").send({ siteKey, pageUrlPath: "/support" });
    createdConversationIds.push(res.body.id);
    expect(res.body.assignedToUserId).toBe(ready);
  });
});
