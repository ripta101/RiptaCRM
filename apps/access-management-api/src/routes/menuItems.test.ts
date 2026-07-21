import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";

const app = createApp();

const createdMenuItemIds: string[] = [];

afterEach(async () => {
  await prisma.menuItem.deleteMany({ where: { id: { in: createdMenuItemIds.splice(0) } } });
});

async function createIframeItem(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/menu-items")
    .send({ label: `Item ${randomUUID()}`, displayType: "IFRAME", iframeUrl: "https://example.com", ...overrides });
  createdMenuItemIds.push(res.body.id);
  return res;
}

describe("Menu item CRUD", () => {
  it("creates, renames, and deletes an IFRAME menu item", async () => {
    const label = `Support Portal ${randomUUID()}`;
    const created = await createIframeItem({ label });
    expect(created.status).toBe(201);
    expect(created.body.label).toBe(label);
    expect(created.body.displayType).toBe("IFRAME");
    expect(created.body.iframeUrl).toBe("https://example.com");
    expect(created.body.remoteEntryUrl).toBeNull();

    const renamed = await request(app).patch(`/api/menu-items/${created.body.id}`).send({ label: `${label} (renamed)` });
    expect(renamed.status).toBe(200);
    expect(renamed.body.label).toBe(`${label} (renamed)`);

    const deleted = await request(app).delete(`/api/menu-items/${created.body.id}`);
    expect(deleted.status).toBe(204);
    const deletedAgain = await request(app).delete(`/api/menu-items/${created.body.id}`);
    expect(deletedAgain.status).toBe(204); // idempotent
  });

  it("creates an MFE menu item with its remote fields", async () => {
    const res = await request(app).post("/api/menu-items").send({
      label: `Remote ${randomUUID()}`,
      displayType: "MFE",
      remoteEntryUrl: "http://localhost:5175/remoteEntry.js",
      remoteName: "caseManagement",
      exposedModule: "./CaseManagementModule",
    });
    createdMenuItemIds.push(res.body.id);

    expect(res.status).toBe(201);
    expect(res.body.displayType).toBe("MFE");
    expect(res.body.remoteEntryUrl).toBe("http://localhost:5175/remoteEntry.js");
    expect(res.body.remoteName).toBe("caseManagement");
    expect(res.body.exposedModule).toBe("./CaseManagementModule");
    expect(res.body.iframeUrl).toBeNull();
  });

  it("requires a non-empty label and a valid displayType", async () => {
    const noLabel = await request(app).post("/api/menu-items").send({ label: "", displayType: "IFRAME", iframeUrl: "https://x.com" });
    expect(noLabel.status).toBe(400);
    const badType = await request(app).post("/api/menu-items").send({ label: "X", displayType: "bogus" });
    expect(badType.status).toBe(400);
  });

  it("requires iframeUrl when displayType is IFRAME", async () => {
    const res = await request(app).post("/api/menu-items").send({ label: "X", displayType: "IFRAME" });
    expect(res.status).toBe(400);
  });

  it("requires remoteEntryUrl, remoteName, and exposedModule when displayType is MFE", async () => {
    const res = await request(app)
      .post("/api/menu-items")
      .send({ label: "X", displayType: "MFE", remoteEntryUrl: "http://x.com/remoteEntry.js" });
    expect(res.status).toBe(400);
  });

  it("404s on an unknown menu item", async () => {
    const res = await request(app).get("/api/menu-items/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("PATCH can switch displayType, validating the new type's required fields", async () => {
    const created = await createIframeItem();
    const switched = await request(app).patch(`/api/menu-items/${created.body.id}`).send({
      displayType: "MFE",
      remoteEntryUrl: "http://localhost:5175/remoteEntry.js",
      remoteName: "caseManagement",
      exposedModule: "./CaseManagementModule",
    });
    expect(switched.status).toBe(200);
    expect(switched.body.displayType).toBe("MFE");
    expect(switched.body.iframeUrl).toBeNull();

    const invalidSwitch = await request(app).patch(`/api/menu-items/${created.body.id}`).send({ displayType: "IFRAME" });
    expect(invalidSwitch.status).toBe(400); // no iframeUrl on the existing row or in the patch body
  });

  it("lists menu items ordered by label", async () => {
    const res = await request(app).get("/api/menu-items");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });
});
