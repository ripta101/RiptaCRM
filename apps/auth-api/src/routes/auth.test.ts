import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { hashPassword } from "../lib/passwords";
import { verifyAuthToken } from "../lib/jwt";

const app = createApp();

function mockProfilesResponse(profiles: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ results: profiles }) }),
  );
}

const FRONTLINE_PROFILE = {
  id: "profile-frontline-user",
  name: "Frontline User",
  isProtected: false,
  dashboardType: "frontline",
  canStartInteractions: true,
  navItemIds: ["home", "it-support"],
  memberUserIds: [],
  archivedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const ADMIN_PROFILE = {
  ...FRONTLINE_PROFILE,
  id: "profile-business-admin",
  name: "Business Admin",
  dashboardType: "admin",
  canStartInteractions: false,
  navItemIds: ["home", "case-management-config", "access-management-config"],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/auth/login", () => {
  const username = `login-test-${randomUUID()}`;
  const adminUsername = `login-admin-${randomUUID()}`;
  const multiUsername = `login-multi-${randomUUID()}`;
  const noProfileUsername = `login-noprofile-${randomUUID()}`;
  let userId: string;
  let adminId: string;
  let multiId: string;
  let noProfileId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: await hashPassword("correct-password"),
        name: "Login Test User",
        email: "login-test@riptacrm.example",
        role: "frontline",
      },
    });
    userId = user.id;

    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash: await hashPassword("correct-password"),
        name: "Login Test Admin",
        email: "login-admin@riptacrm.example",
        role: "admin",
      },
    });
    adminId = admin.id;

    const multi = await prisma.user.create({
      data: {
        username: multiUsername,
        passwordHash: await hashPassword("correct-password"),
        name: "Login Test Multi",
        email: "login-multi@riptacrm.example",
        role: "frontline",
      },
    });
    multiId = multi.id;

    const noProfile = await prisma.user.create({
      data: {
        username: noProfileUsername,
        passwordHash: await hashPassword("correct-password"),
        name: "Login Test No Profile",
        email: "login-noprofile@riptacrm.example",
        role: "frontline",
      },
    });
    noProfileId = noProfile.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userId, adminId, multiId, noProfileId] } } });
  });

  it("returns a token and the frontline user's profile on correct credentials", async () => {
    mockProfilesResponse([FRONTLINE_PROFILE]);

    const res = await request(app).post("/api/auth/login").send({ username, password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: userId,
      name: "Login Test User",
      email: "login-test@riptacrm.example",
      profileId: "profile-frontline-user",
      profileName: "Frontline User",
      dashboardType: "frontline",
      canStartInteractions: true,
      navItemIds: ["home", "it-support"],
    });
    expect(typeof res.body.token).toBe("string");

    const claims = verifyAuthToken(res.body.token);
    expect(claims.sub).toBe(userId);
    expect(claims.profileId).toBe("profile-frontline-user");
    expect(claims.navItemIds).toEqual(["home", "it-support"]);
  });

  it("returns a token and the admin user's profile on correct credentials", async () => {
    mockProfilesResponse([ADMIN_PROFILE]);

    const res = await request(app).post("/api/auth/login").send({ username: adminUsername, password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.user.dashboardType).toBe("admin");
    expect(res.body.user.id).toBe(adminId);
  });

  it("rejects an incorrect password with 401", async () => {
    const res = await request(app).post("/api/auth/login").send({ username, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("rejects an unknown username with 401 and the same generic message", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "no-such-user", password: "anything" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("rejects a request missing username or password with 400", async () => {
    const missingPassword = await request(app).post("/api/auth/login").send({ username });
    expect(missingPassword.status).toBe(400);

    const missingUsername = await request(app).post("/api/auth/login").send({ password: "x" });
    expect(missingUsername.status).toBe(400);
  });

  it("returns choose-profile with a preAuthToken when the user holds more than one profile", async () => {
    mockProfilesResponse([FRONTLINE_PROFILE, ADMIN_PROFILE]);

    const res = await request(app).post("/api/auth/login").send({ username: multiUsername, password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("choose-profile");
    expect(res.body.token).toBeUndefined();
    expect(typeof res.body.preAuthToken).toBe("string");
    expect(res.body.profiles).toEqual([
      { id: "profile-frontline-user", name: "Frontline User" },
      { id: "profile-business-admin", name: "Business Admin" },
    ]);
  });

  it("rejects login with 403 when the user has no assigned profile", async () => {
    mockProfilesResponse([]);

    const res = await request(app).post("/api/auth/login").send({ username: noProfileUsername, password: "correct-password" });

    expect(res.status).toBe(403);
  });

  it("fails loud with 503 and no token when access-management-api is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("connect ECONNREFUSED")));

    const res = await request(app).post("/api/auth/login").send({ username, password: "correct-password" });

    expect(res.status).toBe(503);
    expect(res.body.token).toBeUndefined();
  });
});

describe("POST /api/auth/select-profile", () => {
  const username = `select-profile-${randomUUID()}`;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: await hashPassword("correct-password"),
        name: "Select Profile User",
        email: "select-profile@riptacrm.example",
        role: "frontline",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  async function getPreAuthToken() {
    mockProfilesResponse([FRONTLINE_PROFILE, ADMIN_PROFILE]);
    const login = await request(app).post("/api/auth/login").send({ username, password: "correct-password" });
    return login.body.preAuthToken as string;
  }

  it("issues a full session token for a profile the user actually holds", async () => {
    const preAuthToken = await getPreAuthToken();
    mockProfilesResponse([FRONTLINE_PROFILE, ADMIN_PROFILE]);

    const res = await request(app)
      .post("/api/auth/select-profile")
      .send({ preAuthToken, profileId: "profile-business-admin" });

    expect(res.status).toBe(200);
    expect(res.body.user.profileId).toBe("profile-business-admin");
    expect(res.body.user.dashboardType).toBe("admin");
    expect(typeof res.body.token).toBe("string");
  });

  it("rejects a profileId the user doesn't actually hold with 403", async () => {
    const preAuthToken = await getPreAuthToken();
    mockProfilesResponse([FRONTLINE_PROFILE, ADMIN_PROFILE]);

    const res = await request(app)
      .post("/api/auth/select-profile")
      .send({ preAuthToken, profileId: "profile-not-assigned" });

    expect(res.status).toBe(403);
  });

  it("rejects a garbage/expired preAuthToken with 401", async () => {
    const res = await request(app)
      .post("/api/auth/select-profile")
      .send({ preAuthToken: "not-a-real-token", profileId: "profile-frontline-user" });

    expect(res.status).toBe(401);
  });

  it("requires both preAuthToken and profileId with 400", async () => {
    const res = await request(app).post("/api/auth/select-profile").send({ preAuthToken: "x" });
    expect(res.status).toBe(400);
  });
});
