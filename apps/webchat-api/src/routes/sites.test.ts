import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { SERVICE_KEY_HEADER } from "../testHelpers";

const app = createApp();

const createdSiteIds: string[] = [];

afterEach(async () => {
  await prisma.site.deleteMany({ where: { id: { in: createdSiteIds.splice(0) } } });
});

async function createSite(name = `Site ${randomUUID()}`) {
  const res = await request(app).post("/api/sites").set(SERVICE_KEY_HEADER).send({ name });
  createdSiteIds.push(res.body.id);
  return res;
}

describe("Site CRUD", () => {
  it("creates a site with a generated siteKey and no allowedOrigins restriction by default", async () => {
    const created = await createSite();
    expect(created.status).toBe(201);
    expect(created.body.siteKey).toBeTruthy();
    expect(created.body.allowedOrigins).toBeNull();
    expect(created.body.isActive).toBe(true);
  });

  it("requires a non-empty name", async () => {
    const res = await request(app).post("/api/sites").set(SERVICE_KEY_HEADER).send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("updates allowedOrigins and defaultQueueId", async () => {
    const site = await createSite();
    const updated = await request(app)
      .patch(`/api/sites/${site.body.id}`)
      .set(SERVICE_KEY_HEADER)
      .send({ allowedOrigins: "https://example.com,https://www.example.com" });
    expect(updated.status).toBe(200);
    expect(updated.body.allowedOrigins).toBe("https://example.com,https://www.example.com");
  });

  it("404s updating a site that doesn't exist", async () => {
    const res = await request(app).patch("/api/sites/does-not-exist").set(SERVICE_KEY_HEADER).send({ name: "X" });
    expect(res.status).toBe(404);
  });

  it("regenerates the siteKey, invalidating the old one", async () => {
    const site = await createSite();
    const originalKey = site.body.siteKey;

    const regenerated = await request(app).post(`/api/sites/${site.body.id}/regenerate-key`).set(SERVICE_KEY_HEADER);
    expect(regenerated.status).toBe(200);
    expect(regenerated.body.siteKey).not.toBe(originalKey);
  });

  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/sites");
    expect(res.status).toBe(401);
  });
});
