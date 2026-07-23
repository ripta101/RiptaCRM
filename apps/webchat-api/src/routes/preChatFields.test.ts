import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { SERVICE_KEY_HEADER } from "../testHelpers";

const app = createApp();

const createdSiteIds: string[] = [];

afterEach(async () => {
  await prisma.preChatField.deleteMany({ where: { siteId: { in: createdSiteIds } } });
  await prisma.site.deleteMany({ where: { id: { in: createdSiteIds.splice(0) } } });
});

async function setupSite() {
  const site = await request(app).post("/api/sites").set(SERVICE_KEY_HEADER).send({ name: `Site ${randomUUID()}` });
  createdSiteIds.push(site.body.id);
  return site.body.id as string;
}

describe("Pre-chat field CRUD", () => {
  it("creates a field, applies its required/displayOrder defaults, and lists it by siteId", async () => {
    const siteId = await setupSite();

    const created = await request(app)
      .post("/api/prechat-fields")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, fieldKey: "firstName", label: "First Name", fieldType: "TEXT" });
    expect(created.status).toBe(201);
    expect(created.body.required).toBe(false);
    expect(created.body.displayOrder).toBe(0);
    expect(created.body.options).toBeNull();

    const list = await request(app).get(`/api/prechat-fields?siteId=${siteId}`).set(SERVICE_KEY_HEADER);
    expect(list.status).toBe(200);
    expect(list.body.results.map((f: { id: string }) => f.id)).toContain(created.body.id);
  });

  it("round-trips SELECT options", async () => {
    const siteId = await setupSite();
    const created = await request(app)
      .post("/api/prechat-fields")
      .set(SERVICE_KEY_HEADER)
      .send({
        siteId,
        fieldKey: "topic",
        label: "Topic",
        fieldType: "SELECT",
        options: ["Sales", "Support"],
        required: true,
      });
    expect(created.status).toBe(201);
    expect(created.body.options).toEqual(["Sales", "Support"]);
    expect(created.body.required).toBe(true);
  });

  it("requires siteId, fieldKey, and label", async () => {
    const siteId = await setupSite();
    const missingFieldKey = await request(app)
      .post("/api/prechat-fields")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, label: "First Name", fieldType: "TEXT" });
    expect(missingFieldKey.status).toBe(400);

    const missingLabel = await request(app)
      .post("/api/prechat-fields")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, fieldKey: "firstName", fieldType: "TEXT" });
    expect(missingLabel.status).toBe(400);
  });

  it("rejects an invalid fieldType", async () => {
    const siteId = await setupSite();
    const res = await request(app)
      .post("/api/prechat-fields")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, fieldKey: "firstName", label: "First Name", fieldType: "PHONE" });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate fieldKey on the same site", async () => {
    const siteId = await setupSite();
    await request(app)
      .post("/api/prechat-fields")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, fieldKey: "firstName", label: "First Name", fieldType: "TEXT" });

    const dup = await request(app)
      .post("/api/prechat-fields")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, fieldKey: "firstName", label: "First Name Again", fieldType: "TEXT" });
    expect(dup.status).toBe(409);
  });

  it("updates and deletes a field", async () => {
    const siteId = await setupSite();
    const created = await request(app)
      .post("/api/prechat-fields")
      .set(SERVICE_KEY_HEADER)
      .send({ siteId, fieldKey: "firstName", label: "First Name", fieldType: "TEXT" });

    const updated = await request(app)
      .patch(`/api/prechat-fields/${created.body.id}`)
      .set(SERVICE_KEY_HEADER)
      .send({ required: true, displayOrder: 3 });
    expect(updated.status).toBe(200);
    expect(updated.body.required).toBe(true);
    expect(updated.body.displayOrder).toBe(3);

    const deleted = await request(app).delete(`/api/prechat-fields/${created.body.id}`).set(SERVICE_KEY_HEADER);
    expect(deleted.status).toBe(204);
    const deletedAgain = await request(app).delete(`/api/prechat-fields/${created.body.id}`).set(SERVICE_KEY_HEADER);
    expect(deletedAgain.status).toBe(204); // idempotent
  });
});
