import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { SERVICE_KEY_HEADER } from "../testHelpers";

const app = createApp();

const createdUserIds: string[] = [];

afterEach(async () => {
  await prisma.agentCapacityOverride.deleteMany({ where: { userId: { in: createdUserIds.splice(0) } } });
});

describe("Agent capacity overrides", () => {
  it("upserts (create then update) and reads back an override", async () => {
    const userId = `user-${randomUUID()}`;
    createdUserIds.push(userId);

    const created = await request(app)
      .put(`/api/capacity-overrides/${userId}`)
      .set(SERVICE_KEY_HEADER)
      .send({ maxConcurrentChats: 5 });
    expect(created.status).toBe(200);
    expect(created.body).toEqual({ userId, maxConcurrentChats: 5 });

    const updated = await request(app)
      .put(`/api/capacity-overrides/${userId}`)
      .set(SERVICE_KEY_HEADER)
      .send({ maxConcurrentChats: 8 });
    expect(updated.status).toBe(200);
    expect(updated.body.maxConcurrentChats).toBe(8);

    const list = await request(app).get(`/api/capacity-overrides?userId=${userId}`).set(SERVICE_KEY_HEADER);
    expect(list.body.results).toEqual([{ userId, maxConcurrentChats: 8 }]);
  });

  it("rejects a negative or non-integer maxConcurrentChats", async () => {
    const userId = `user-${randomUUID()}`;
    const negative = await request(app).put(`/api/capacity-overrides/${userId}`).set(SERVICE_KEY_HEADER).send({ maxConcurrentChats: -1 });
    expect(negative.status).toBe(400);

    const fractional = await request(app).put(`/api/capacity-overrides/${userId}`).set(SERVICE_KEY_HEADER).send({ maxConcurrentChats: 1.5 });
    expect(fractional.status).toBe(400);
  });

  it("delete is idempotent", async () => {
    const userId = `user-${randomUUID()}`;
    await request(app).put(`/api/capacity-overrides/${userId}`).set(SERVICE_KEY_HEADER).send({ maxConcurrentChats: 3 });

    const deleted = await request(app).delete(`/api/capacity-overrides/${userId}`).set(SERVICE_KEY_HEADER);
    expect(deleted.status).toBe(204);
    const deletedAgain = await request(app).delete(`/api/capacity-overrides/${userId}`).set(SERVICE_KEY_HEADER);
    expect(deletedAgain.status).toBe(204);
  });
});
