import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";

const app = createApp();

const createdProfileIds: string[] = [];

afterEach(async () => {
  await prisma.profile.deleteMany({ where: { id: { in: createdProfileIds.splice(0) } } });
});

async function createProfile(overrides: Partial<{ name: string; dashboardType: string; canStartInteractions: boolean }> = {}) {
  const res = await request(app)
    .post("/api/profiles")
    .send({ name: `Profile ${randomUUID()}`, dashboardType: "frontline", canStartInteractions: false, ...overrides });
  createdProfileIds.push(res.body.id);
  return res;
}

describe("Profile CRUD", () => {
  it("creates, renames, and deletes a profile", async () => {
    const name = `Support ${randomUUID()}`;
    const created = await createProfile({ name });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe(name);
    expect(created.body.navItemIds).toEqual([]);
    expect(created.body.memberUserIds).toEqual([]);
    expect(created.body.archivedAt).toBeNull();

    const renamed = await request(app).patch(`/api/profiles/${created.body.id}`).send({ name: `${name} (renamed)` });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe(`${name} (renamed)`);

    const deleted = await request(app).delete(`/api/profiles/${created.body.id}`);
    expect(deleted.status).toBe(204);
    const deletedAgain = await request(app).delete(`/api/profiles/${created.body.id}`);
    expect(deletedAgain.status).toBe(204); // idempotent
  });

  it("rejects a duplicate profile name with 409", async () => {
    const name = `Duplicate ${randomUUID()}`;
    await createProfile({ name });
    const second = await request(app).post("/api/profiles").send({ name, dashboardType: "frontline" });
    expect(second.status).toBe(409);
  });

  it("requires a non-empty name and a valid dashboardType", async () => {
    const noName = await request(app).post("/api/profiles").send({ name: "", dashboardType: "frontline" });
    expect(noName.status).toBe(400);
    const badType = await request(app).post("/api/profiles").send({ name: `X ${randomUUID()}`, dashboardType: "bogus" });
    expect(badType.status).toBe(400);
  });

  it("PATCHes navItemIds by replacing the full set", async () => {
    const profile = await createProfile();
    const updated = await request(app)
      .patch(`/api/profiles/${profile.body.id}`)
      .send({ navItemIds: ["home", "it-support"] });
    expect(updated.status).toBe(200);
    expect(updated.body.navItemIds.sort()).toEqual(["home", "it-support"]);

    const replaced = await request(app).patch(`/api/profiles/${profile.body.id}`).send({ navItemIds: ["home"] });
    expect(replaced.status).toBe(200);
    expect(replaced.body.navItemIds).toEqual(["home"]);
  });
});

describe("Protected profile", () => {
  async function createProtectedProfile() {
    const created = await createProfile();
    const protectedProfile = await prisma.profile.update({
      where: { id: created.body.id },
      data: { isProtected: true },
    });
    return protectedProfile;
  }

  it("blocks removing the required nav item via PATCH", async () => {
    const profile = await createProtectedProfile();
    const withRequired = await request(app)
      .patch(`/api/profiles/${profile.id}`)
      .send({ navItemIds: ["access-management-config"] });
    expect(withRequired.status).toBe(200);

    const withoutRequired = await request(app).patch(`/api/profiles/${profile.id}`).send({ navItemIds: ["home"] });
    expect(withoutRequired.status).toBe(400);
  });

  it("blocks archive and delete regardless of members", async () => {
    const profile = await createProtectedProfile();
    const archived = await request(app).post(`/api/profiles/${profile.id}/archive`);
    expect(archived.status).toBe(400);
    const deleted = await request(app).delete(`/api/profiles/${profile.id}`);
    expect(deleted.status).toBe(400);
  });
});

describe("Archive / delete guarded by membership", () => {
  it("blocks archive and delete while a profile has members, succeeds after removal", async () => {
    const profile = await createProfile();
    await request(app).post(`/api/profiles/${profile.body.id}/members`).send({ userId: "user-1" });

    const archiveBlocked = await request(app).post(`/api/profiles/${profile.body.id}/archive`);
    expect(archiveBlocked.status).toBe(409);
    const deleteBlocked = await request(app).delete(`/api/profiles/${profile.body.id}`);
    expect(deleteBlocked.status).toBe(409);

    await request(app).delete(`/api/profiles/${profile.body.id}/members/user-1`);

    const archived = await request(app).post(`/api/profiles/${profile.body.id}/archive`);
    expect(archived.status).toBe(200);
    expect(archived.body.archivedAt).not.toBeNull();

    const archivedAgain = await request(app).post(`/api/profiles/${profile.body.id}/archive`);
    expect(archivedAgain.status).toBe(200); // idempotent, returns current state
  });

  it("archived profiles are excluded from the default list but included with includeArchived=true", async () => {
    const profile = await createProfile();
    await request(app).post(`/api/profiles/${profile.body.id}/archive`);

    const defaultList = await request(app).get("/api/profiles");
    expect(defaultList.body.results.some((p: { id: string }) => p.id === profile.body.id)).toBe(false);

    const withArchived = await request(app).get("/api/profiles?includeArchived=true");
    expect(withArchived.body.results.some((p: { id: string }) => p.id === profile.body.id)).toBe(true);
  });
});

describe("Profile membership", () => {
  it("adds and removes a member", async () => {
    const profile = await createProfile();

    const added = await request(app).post(`/api/profiles/${profile.body.id}/members`).send({ userId: "user-1" });
    expect(added.status).toBe(201);
    expect(added.body.memberUserIds).toEqual(["user-1"]);

    const removed = await request(app).delete(`/api/profiles/${profile.body.id}/members/user-1`);
    expect(removed.status).toBe(204);
    const removedAgain = await request(app).delete(`/api/profiles/${profile.body.id}/members/user-1`);
    expect(removedAgain.status).toBe(204); // idempotent

    const final = await request(app).get(`/api/profiles/${profile.body.id}`);
    expect(final.body.memberUserIds).toEqual([]);
  });

  it("rejects adding the same member twice with 409", async () => {
    const profile = await createProfile();
    await request(app).post(`/api/profiles/${profile.body.id}/members`).send({ userId: "user-1" });
    const second = await request(app).post(`/api/profiles/${profile.body.id}/members`).send({ userId: "user-1" });
    expect(second.status).toBe(409);
  });

  it("404s when adding a member to a profile that doesn't exist", async () => {
    const res = await request(app).post("/api/profiles/does-not-exist/members").send({ userId: "user-1" });
    expect(res.status).toBe(404);
  });

  it("?userId= filters to only that user's active profiles", async () => {
    const uid = `u-${randomUUID()}`;
    const profileA = await createProfile();
    const profileB = await createProfile();
    await request(app).post(`/api/profiles/${profileA.body.id}/members`).send({ userId: uid });

    const res = await request(app).get(`/api/profiles?userId=${uid}`);
    const ids = res.body.results.map((p: { id: string }) => p.id);
    expect(ids).toContain(profileA.body.id);
    expect(ids).not.toContain(profileB.body.id);
  });
});

describe("Custom menu items in Profile response", () => {
  const createdMenuItemIds: string[] = [];

  afterEach(async () => {
    await prisma.menuItem.deleteMany({ where: { id: { in: createdMenuItemIds.splice(0) } } });
  });

  it("resolves a granted custom menu item id into a full object", async () => {
    const menuItem = await prisma.menuItem.create({
      data: { label: `Custom ${randomUUID()}`, displayType: "IFRAME", iframeUrl: "https://example.com" },
    });
    createdMenuItemIds.push(menuItem.id);

    const profile = await createProfile();
    const updated = await request(app)
      .patch(`/api/profiles/${profile.body.id}`)
      .send({ navItemIds: ["home", menuItem.id] });

    expect(updated.status).toBe(200);
    expect(updated.body.navItemIds.sort()).toEqual([menuItem.id, "home"].sort());
    expect(updated.body.customMenuItems).toEqual([
      expect.objectContaining({ id: menuItem.id, label: menuItem.label, displayType: "IFRAME" }),
    ]);
  });

  it("omits a granted id gracefully once the underlying menu item has been deleted", async () => {
    const menuItem = await prisma.menuItem.create({
      data: { label: `Custom ${randomUUID()}`, displayType: "IFRAME", iframeUrl: "https://example.com" },
    });

    const profile = await createProfile();
    await request(app).patch(`/api/profiles/${profile.body.id}`).send({ navItemIds: [menuItem.id] });
    await prisma.menuItem.delete({ where: { id: menuItem.id } });

    const res = await request(app).get(`/api/profiles/${profile.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.navItemIds).toEqual([menuItem.id]); // still granted — just no longer resolvable
    expect(res.body.customMenuItems).toEqual([]);
  });
});

describe("GET /users proxy", () => {
  it("fails soft to an empty list when auth-api is unreachable", async () => {
    // AUTH_API_URL in .env.test points at the real auth-api port; if it's not running in
    // this test run, the proxy should degrade gracefully rather than 500.
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });
});
