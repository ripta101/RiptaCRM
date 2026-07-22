import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { SERVICE_KEY_HEADER } from "../testHelpers";

const app = createApp();

const createdSiteIds: string[] = [];
const createdQueueIds: string[] = [];

afterEach(async () => {
  await prisma.routingRule.deleteMany({ where: { siteId: { in: createdSiteIds } } });
  await prisma.site.deleteMany({ where: { id: { in: createdSiteIds.splice(0) } } });
  await prisma.webChatQueue.deleteMany({ where: { id: { in: createdQueueIds.splice(0) } } });
});

async function setupSiteAndQueue() {
  const site = await request(app).post("/api/sites").set(SERVICE_KEY_HEADER).send({ name: `Site ${randomUUID()}` });
  createdSiteIds.push(site.body.id);
  const queue = await request(app).post("/api/queues").set(SERVICE_KEY_HEADER).send({ name: `Queue ${randomUUID()}` });
  createdQueueIds.push(queue.body.id);
  return { siteId: site.body.id as string, queueId: queue.body.id as string };
}

describe("Routing rule CRUD", () => {
  it("creates a rule, applies its priority/matchType defaults, and lists it by siteId", async () => {
    const { siteId, queueId } = await setupSiteAndQueue();

    const created = await request(app)
      .post("/api/routing-rules")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, pattern: "/support", autoReplyText: "Hi from Support", targetQueueId: queueId });
    expect(created.status).toBe(201);
    expect(created.body.matchType).toBe("PREFIX");
    expect(created.body.priority).toBe(0);
    expect(created.body.isActive).toBe(true);

    const list = await request(app).get(`/api/routing-rules?siteId=${siteId}`).set(SERVICE_KEY_HEADER);
    expect(list.status).toBe(200);
    expect(list.body.results.map((r: { id: string }) => r.id)).toContain(created.body.id);
  });

  it("requires pattern, autoReplyText, and targetQueueId", async () => {
    const { siteId, queueId } = await setupSiteAndQueue();
    const missingPattern = await request(app)
      .post("/api/routing-rules")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, autoReplyText: "Hi", targetQueueId: queueId });
    expect(missingPattern.status).toBe(400);

    const missingReply = await request(app)
      .post("/api/routing-rules")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, pattern: "/x", targetQueueId: queueId });
    expect(missingReply.status).toBe(400);
  });

  it("rejects an invalid matchType", async () => {
    const { siteId, queueId } = await setupSiteAndQueue();
    const res = await request(app)
      .post("/api/routing-rules")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, pattern: "/x", matchType: "REGEX", autoReplyText: "Hi", targetQueueId: queueId });
    expect(res.status).toBe(400);
  });

  it("updates and deletes a rule", async () => {
    const { siteId, queueId } = await setupSiteAndQueue();
    const created = await request(app)
      .post("/api/routing-rules")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, pattern: "/x", autoReplyText: "Hi", targetQueueId: queueId });

    const updated = await request(app)
      .patch(`/api/routing-rules/${created.body.id}`)
      .set(SERVICE_KEY_HEADER)
      .send({ priority: 5, isActive: false });
    expect(updated.status).toBe(200);
    expect(updated.body.priority).toBe(5);
    expect(updated.body.isActive).toBe(false);

    const deleted = await request(app).delete(`/api/routing-rules/${created.body.id}`).set(SERVICE_KEY_HEADER);
    expect(deleted.status).toBe(204);
    const deletedAgain = await request(app).delete(`/api/routing-rules/${created.body.id}`).set(SERVICE_KEY_HEADER);
    expect(deletedAgain.status).toBe(204); // idempotent
  });
});
