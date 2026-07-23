import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { SERVICE_KEY_HEADER } from "../testHelpers";

const app = createApp();

const createdProfileIds: string[] = [];

afterEach(async () => {
  await prisma.profile.deleteMany({ where: { id: { in: createdProfileIds.splice(0) } } });
});

async function createProfile(
  overrides: Partial<{ name: string; dashboardType: string; canStartInteractions: boolean; maxConcurrentChats: number }> = {},
) {
  const res = await request(app)
    .post("/api/profiles").set(SERVICE_KEY_HEADER)
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

    const renamed = await request(app).patch(`/api/profiles/${created.body.id}`).set(SERVICE_KEY_HEADER).send({ name: `${name} (renamed)` });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe(`${name} (renamed)`);

    const deleted = await request(app).delete(`/api/profiles/${created.body.id}`).set(SERVICE_KEY_HEADER);
    expect(deleted.status).toBe(204);
    const deletedAgain = await request(app).delete(`/api/profiles/${created.body.id}`).set(SERVICE_KEY_HEADER);
    expect(deletedAgain.status).toBe(204); // idempotent
  });

  it("rejects a duplicate profile name with 409", async () => {
    const name = `Duplicate ${randomUUID()}`;
    await createProfile({ name });
    const second = await request(app).post("/api/profiles").set(SERVICE_KEY_HEADER).send({ name, dashboardType: "frontline" });
    expect(second.status).toBe(409);
  });

  it("requires a non-empty name and a valid dashboardType", async () => {
    const noName = await request(app).post("/api/profiles").set(SERVICE_KEY_HEADER).send({ name: "", dashboardType: "frontline" });
    expect(noName.status).toBe(400);
    const badType = await request(app).post("/api/profiles").set(SERVICE_KEY_HEADER).send({ name: `X ${randomUUID()}`, dashboardType: "bogus" });
    expect(badType.status).toBe(400);
  });

  it("PATCHes navItemIds by replacing the full set", async () => {
    const profile = await createProfile();
    const updated = await request(app)
      .patch(`/api/profiles/${profile.body.id}`).set(SERVICE_KEY_HEADER)
      .send({ navItemIds: ["home", "it-support"] });
    expect(updated.status).toBe(200);
    expect(updated.body.navItemIds.sort()).toEqual(["home", "it-support"]);

    const replaced = await request(app).patch(`/api/profiles/${profile.body.id}`).set(SERVICE_KEY_HEADER).send({ navItemIds: ["home"] });
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
      .patch(`/api/profiles/${profile.id}`).set(SERVICE_KEY_HEADER)
      .send({ navItemIds: ["access-management-config"] });
    expect(withRequired.status).toBe(200);

    const withoutRequired = await request(app).patch(`/api/profiles/${profile.id}`).set(SERVICE_KEY_HEADER).send({ navItemIds: ["home"] });
    expect(withoutRequired.status).toBe(400);
  });

  it("blocks archive and delete regardless of members", async () => {
    const profile = await createProtectedProfile();
    const archived = await request(app).post(`/api/profiles/${profile.id}/archive`).set(SERVICE_KEY_HEADER);
    expect(archived.status).toBe(400);
    const deleted = await request(app).delete(`/api/profiles/${profile.id}`).set(SERVICE_KEY_HEADER);
    expect(deleted.status).toBe(400);
  });
});

describe("Archive / delete guarded by membership", () => {
  it("blocks archive and delete while a profile has members, succeeds after removal", async () => {
    const profile = await createProfile();
    await request(app).post(`/api/profiles/${profile.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId: "user-1" });

    const archiveBlocked = await request(app).post(`/api/profiles/${profile.body.id}/archive`).set(SERVICE_KEY_HEADER);
    expect(archiveBlocked.status).toBe(409);
    const deleteBlocked = await request(app).delete(`/api/profiles/${profile.body.id}`).set(SERVICE_KEY_HEADER);
    expect(deleteBlocked.status).toBe(409);

    await request(app).delete(`/api/profiles/${profile.body.id}/members/user-1`).set(SERVICE_KEY_HEADER);

    const archived = await request(app).post(`/api/profiles/${profile.body.id}/archive`).set(SERVICE_KEY_HEADER);
    expect(archived.status).toBe(200);
    expect(archived.body.archivedAt).not.toBeNull();

    const archivedAgain = await request(app).post(`/api/profiles/${profile.body.id}/archive`).set(SERVICE_KEY_HEADER);
    expect(archivedAgain.status).toBe(200); // idempotent, returns current state
  });

  it("archived profiles are excluded from the default list but included with includeArchived=true", async () => {
    const profile = await createProfile();
    await request(app).post(`/api/profiles/${profile.body.id}/archive`).set(SERVICE_KEY_HEADER);

    const defaultList = await request(app).get("/api/profiles").set(SERVICE_KEY_HEADER);
    expect(defaultList.body.results.some((p: { id: string }) => p.id === profile.body.id)).toBe(false);

    const withArchived = await request(app).get("/api/profiles?includeArchived=true").set(SERVICE_KEY_HEADER);
    expect(withArchived.body.results.some((p: { id: string }) => p.id === profile.body.id)).toBe(true);
  });
});

describe("Profile membership", () => {
  it("adds and removes a member", async () => {
    const profile = await createProfile();

    const added = await request(app).post(`/api/profiles/${profile.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId: "user-1" });
    expect(added.status).toBe(201);
    expect(added.body.memberUserIds).toEqual(["user-1"]);

    const removed = await request(app).delete(`/api/profiles/${profile.body.id}/members/user-1`).set(SERVICE_KEY_HEADER);
    expect(removed.status).toBe(204);
    const removedAgain = await request(app).delete(`/api/profiles/${profile.body.id}/members/user-1`).set(SERVICE_KEY_HEADER);
    expect(removedAgain.status).toBe(204); // idempotent

    const final = await request(app).get(`/api/profiles/${profile.body.id}`).set(SERVICE_KEY_HEADER);
    expect(final.body.memberUserIds).toEqual([]);
  });

  it("rejects adding the same member twice with 409", async () => {
    const profile = await createProfile();
    await request(app).post(`/api/profiles/${profile.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId: "user-1" });
    const second = await request(app).post(`/api/profiles/${profile.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId: "user-1" });
    expect(second.status).toBe(409);
  });

  it("404s when adding a member to a profile that doesn't exist", async () => {
    const res = await request(app).post("/api/profiles/does-not-exist/members").set(SERVICE_KEY_HEADER).send({ userId: "user-1" });
    expect(res.status).toBe(404);
  });

  it("?userId= filters to only that user's active profiles", async () => {
    const uid = `u-${randomUUID()}`;
    const profileA = await createProfile();
    const profileB = await createProfile();
    await request(app).post(`/api/profiles/${profileA.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId: uid });

    const res = await request(app).get(`/api/profiles?userId=${uid}`).set(SERVICE_KEY_HEADER);
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
      .patch(`/api/profiles/${profile.body.id}`).set(SERVICE_KEY_HEADER)
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
    await request(app).patch(`/api/profiles/${profile.body.id}`).set(SERVICE_KEY_HEADER).send({ navItemIds: [menuItem.id] });
    await prisma.menuItem.delete({ where: { id: menuItem.id } });

    const res = await request(app).get(`/api/profiles/${profile.body.id}`).set(SERVICE_KEY_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.navItemIds).toEqual([menuItem.id]); // still granted — just no longer resolvable
    expect(res.body.customMenuItems).toEqual([]);
  });
});

describe("GET /users proxy", () => {
  it("fails soft to an empty list when auth-api is unreachable", async () => {
    // AUTH_API_URL in .env.test points at the real auth-api port; if it's not running in
    // this test run, the proxy should degrade gracefully rather than 500.
    const res = await request(app).get("/api/users").set(SERVICE_KEY_HEADER);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });
});

describe("maxConcurrentChats", () => {
  it("defaults to 3 when omitted on create", async () => {
    const created = await createProfile();
    expect(created.body.maxConcurrentChats).toBe(3);
  });

  it("accepts an explicit value on create and update", async () => {
    const created = await createProfile({ maxConcurrentChats: 7 });
    expect(created.body.maxConcurrentChats).toBe(7);

    const updated = await request(app)
      .patch(`/api/profiles/${created.body.id}`)
      .set(SERVICE_KEY_HEADER)
      .send({ maxConcurrentChats: 10 });
    expect(updated.status).toBe(200);
    expect(updated.body.maxConcurrentChats).toBe(10);
  });

  it("rejects a negative or non-integer value", async () => {
    const negative = await request(app)
      .post("/api/profiles")
      .set(SERVICE_KEY_HEADER)
      .send({ name: `X ${randomUUID()}`, dashboardType: "frontline", maxConcurrentChats: -1 });
    expect(negative.status).toBe(400);

    const fractional = await request(app)
      .post("/api/profiles")
      .set(SERVICE_KEY_HEADER)
      .send({ name: `X ${randomUUID()}`, dashboardType: "frontline", maxConcurrentChats: 2.5 });
    expect(fractional.status).toBe(400);
  });
});

describe("Supervised queues", () => {
  it("adds, lists, and idempotently removes a supervised queue", async () => {
    const profile = await createProfile();
    const queueId = `queue-${randomUUID()}`;

    const added = await request(app).post(`/api/profiles/${profile.body.id}/supervised-queues`).set(SERVICE_KEY_HEADER).send({ queueId });
    expect(added.status).toBe(201);
    expect(added.body.supervisedQueueIds).toEqual([queueId]);

    const removed = await request(app).delete(`/api/profiles/${profile.body.id}/supervised-queues/${queueId}`).set(SERVICE_KEY_HEADER);
    expect(removed.status).toBe(204);
    const removedAgain = await request(app).delete(`/api/profiles/${profile.body.id}/supervised-queues/${queueId}`).set(SERVICE_KEY_HEADER);
    expect(removedAgain.status).toBe(204); // idempotent

    const final = await request(app).get(`/api/profiles/${profile.body.id}`).set(SERVICE_KEY_HEADER);
    expect(final.body.supervisedQueueIds).toEqual([]);
  });

  it("rejects adding the same queue twice with 409", async () => {
    const profile = await createProfile();
    const queueId = `queue-${randomUUID()}`;
    await request(app).post(`/api/profiles/${profile.body.id}/supervised-queues`).set(SERVICE_KEY_HEADER).send({ queueId });
    const second = await request(app).post(`/api/profiles/${profile.body.id}/supervised-queues`).set(SERVICE_KEY_HEADER).send({ queueId });
    expect(second.status).toBe(409);
  });

  it("404s adding a supervised queue to a profile that doesn't exist", async () => {
    const res = await request(app).post("/api/profiles/does-not-exist/supervised-queues").set(SERVICE_KEY_HEADER).send({ queueId: "q-1" });
    expect(res.status).toBe(404);
  });

  it("requires a non-empty queueId", async () => {
    const profile = await createProfile();
    const res = await request(app).post(`/api/profiles/${profile.body.id}/supervised-queues`).set(SERVICE_KEY_HEADER).send({});
    expect(res.status).toBe(400);
  });
});

describe("Supervised profiles", () => {
  it("adds, lists, and idempotently removes a supervised profile", async () => {
    const supervisor = await createProfile();
    const target = await createProfile();

    const added = await request(app)
      .post(`/api/profiles/${supervisor.body.id}/supervised-profiles`).set(SERVICE_KEY_HEADER)
      .send({ supervisedProfileId: target.body.id });
    expect(added.status).toBe(201);
    expect(added.body.supervisedProfileIds).toEqual([target.body.id]);

    const removed = await request(app)
      .delete(`/api/profiles/${supervisor.body.id}/supervised-profiles/${target.body.id}`).set(SERVICE_KEY_HEADER);
    expect(removed.status).toBe(204);
    const removedAgain = await request(app)
      .delete(`/api/profiles/${supervisor.body.id}/supervised-profiles/${target.body.id}`).set(SERVICE_KEY_HEADER);
    expect(removedAgain.status).toBe(204); // idempotent
  });

  it("rejects a profile supervising itself with 400", async () => {
    const profile = await createProfile();
    const res = await request(app)
      .post(`/api/profiles/${profile.body.id}/supervised-profiles`).set(SERVICE_KEY_HEADER)
      .send({ supervisedProfileId: profile.body.id });
    expect(res.status).toBe(400);
  });

  it("400s when the target profile doesn't exist", async () => {
    const profile = await createProfile();
    const res = await request(app)
      .post(`/api/profiles/${profile.body.id}/supervised-profiles`).set(SERVICE_KEY_HEADER)
      .send({ supervisedProfileId: "does-not-exist" });
    expect(res.status).toBe(400);
  });

  it("rejects adding the same supervised profile twice with 409", async () => {
    const supervisor = await createProfile();
    const target = await createProfile();
    await request(app).post(`/api/profiles/${supervisor.body.id}/supervised-profiles`).set(SERVICE_KEY_HEADER).send({ supervisedProfileId: target.body.id });
    const second = await request(app)
      .post(`/api/profiles/${supervisor.body.id}/supervised-profiles`).set(SERVICE_KEY_HEADER)
      .send({ supervisedProfileId: target.body.id });
    expect(second.status).toBe(409);
  });

  it("cascades away the grant when the supervised profile itself is deleted", async () => {
    const supervisor = await createProfile();
    const target = await createProfile();
    await request(app).post(`/api/profiles/${supervisor.body.id}/supervised-profiles`).set(SERVICE_KEY_HEADER).send({ supervisedProfileId: target.body.id });

    await request(app).delete(`/api/profiles/${target.body.id}`).set(SERVICE_KEY_HEADER);
    createdProfileIds.splice(createdProfileIds.indexOf(target.body.id), 1); // already gone

    const res = await request(app).get(`/api/profiles/${supervisor.body.id}`).set(SERVICE_KEY_HEADER);
    expect(res.body.supervisedProfileIds).toEqual([]);
  });
});

describe("GET /profiles/default-webchat-capacity", () => {
  it("returns the max maxConcurrentChats across the user's non-archived profiles", async () => {
    const userId = `user-${randomUUID()}`;
    const low = await createProfile({ maxConcurrentChats: 2 });
    const high = await createProfile({ maxConcurrentChats: 6 });
    await request(app).post(`/api/profiles/${low.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId });
    await request(app).post(`/api/profiles/${high.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId });

    const res = await request(app)
      .get(`/api/profiles/default-webchat-capacity?userId=${userId}`)
      .set(SERVICE_KEY_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.maxConcurrentChats).toBe(6);
  });

  it("ignores archived profiles", async () => {
    // The /archive route itself refuses to archive a profile with members (unassign first),
    // so an archived-but-still-a-member state can't arise through normal API usage — write
    // it directly to isolate the aggregation query's own archivedAt filter.
    const userId = `user-${randomUUID()}`;
    const profile = await createProfile({ maxConcurrentChats: 9 });
    await request(app).post(`/api/profiles/${profile.body.id}/members`).set(SERVICE_KEY_HEADER).send({ userId });
    await prisma.profile.update({ where: { id: profile.body.id }, data: { archivedAt: new Date() } });

    const res = await request(app)
      .get(`/api/profiles/default-webchat-capacity?userId=${userId}`)
      .set(SERVICE_KEY_HEADER);
    expect(res.body.maxConcurrentChats).toBeNull();
  });

  it("returns null for a user with no profiles", async () => {
    const res = await request(app)
      .get(`/api/profiles/default-webchat-capacity?userId=user-${randomUUID()}`)
      .set(SERVICE_KEY_HEADER);
    expect(res.body.maxConcurrentChats).toBeNull();
  });

  it("requires a userId query parameter", async () => {
    const res = await request(app).get("/api/profiles/default-webchat-capacity").set(SERVICE_KEY_HEADER);
    expect(res.status).toBe(400);
  });
});
