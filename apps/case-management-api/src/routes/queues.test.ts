import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { SERVICE_KEY_HEADER } from "../testHelpers";

const app = createApp();

const createdQueueIds: string[] = [];

afterEach(async () => {
  await prisma.queue.deleteMany({ where: { id: { in: createdQueueIds.splice(0) } } });
});

async function createQueue(name = `Queue ${randomUUID()}`) {
  const res = await request(app).post("/api/queues").set(SERVICE_KEY_HEADER).send({ name });
  createdQueueIds.push(res.body.id);
  return res;
}

describe("Queue CRUD", () => {
  it("creates, renames, and deletes a queue", async () => {
    const name = `Billing ${randomUUID()}`;
    const created = await createQueue(name);
    expect(created.status).toBe(201);
    expect(created.body.name).toBe(name);
    expect(created.body.memberUserIds).toEqual([]);

    const renamed = await request(app).patch(`/api/queues/${created.body.id}`).set(SERVICE_KEY_HEADER).send({ name: `${name} (renamed)` });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe(`${name} (renamed)`);

    const deleted = await request(app).delete(`/api/queues/${created.body.id}`).set(SERVICE_KEY_HEADER);
    expect(deleted.status).toBe(204);
    const deletedAgain = await request(app).delete(`/api/queues/${created.body.id}`).set(SERVICE_KEY_HEADER);
    expect(deletedAgain.status).toBe(204); // idempotent
  });

  it("rejects a duplicate queue name with 409", async () => {
    const name = `Duplicate ${randomUUID()}`;
    await createQueue(name);
    const second = await request(app).post("/api/queues").set(SERVICE_KEY_HEADER).send({ name });
    expect(second.status).toBe(409);
  });

  it("requires a non-empty name", async () => {
    const res = await request(app).post("/api/queues").set(SERVICE_KEY_HEADER).send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("deleting a queue un-assigns it from any stages instead of blocking", async () => {
    const queue = await createQueue();
    const caseType = await prisma.caseType.create({
      data: {
        key: `test-queue-delete-${randomUUID()}`,
        name: "Test",
        versions: {
          create: {
            versionNumber: 1,
            status: "DRAFT",
            stages: { create: [{ key: "s", name: "S", slaMinutes: 60, displayOrder: 0, queueId: queue.body.id }] },
          },
        },
      },
      include: { versions: { include: { stages: true } } },
    });
    const stageId = caseType.versions[0].stages[0].id;

    try {
      const deleted = await request(app).delete(`/api/queues/${queue.body.id}`).set(SERVICE_KEY_HEADER);
      expect(deleted.status).toBe(204);

      const stage = await prisma.stageDefinition.findUniqueOrThrow({ where: { id: stageId } });
      expect(stage.queueId).toBeNull();
    } finally {
      await prisma.caseType.delete({ where: { id: caseType.id } });
    }
  });
});

describe("Queue membership", () => {
  it("adds and removes a member", async () => {
    const queue = await createQueue();

    const added = await request(app).post(`/api/queues/${queue.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId: "user-1" });
    expect(added.status).toBe(201);
    expect(added.body.memberUserIds).toEqual(["user-1"]);

    const removed = await request(app).delete(`/api/queues/${queue.body.id}/members/user-1`).set(SERVICE_KEY_HEADER);
    expect(removed.status).toBe(204);
    const removedAgain = await request(app).delete(`/api/queues/${queue.body.id}/members/user-1`).set(SERVICE_KEY_HEADER);
    expect(removedAgain.status).toBe(204); // idempotent

    const final = await request(app).get(`/api/queues/${queue.body.id}`).set(SERVICE_KEY_HEADER);
    expect(final.body.memberUserIds).toEqual([]);
  });

  it("rejects adding the same member twice with 409", async () => {
    const queue = await createQueue();
    await request(app).post(`/api/queues/${queue.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId: "user-1" });
    const second = await request(app).post(`/api/queues/${queue.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId: "user-1" });
    expect(second.status).toBe(409);
  });

  it("404s when adding a member to a queue that doesn't exist", async () => {
    const res = await request(app).post("/api/queues/does-not-exist/members").set(SERVICE_KEY_HEADER).send({ userId: "user-1" });
    expect(res.status).toBe(404);
  });
});
