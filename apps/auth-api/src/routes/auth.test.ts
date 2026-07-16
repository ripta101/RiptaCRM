import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { hashPassword } from "../lib/passwords";
import { verifyAuthToken } from "../lib/jwt";

const app = createApp();

describe("POST /api/auth/login", () => {
  const username = `login-test-${randomUUID()}`;
  const adminUsername = `login-admin-${randomUUID()}`;
  let userId: string;
  let adminId: string;

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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userId, adminId] } } });
  });

  it("returns a token and the frontline user on correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username, password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: userId,
      name: "Login Test User",
      email: "login-test@riptacrm.example",
      role: "frontline",
    });
    expect(typeof res.body.token).toBe("string");

    const claims = verifyAuthToken(res.body.token);
    expect(claims.sub).toBe(userId);
    expect(claims.role).toBe("frontline");
  });

  it("returns a token and the admin user on correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: adminUsername, password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("admin");
    expect(res.body.user.id).toBe(adminId);
  });

  it("rejects an incorrect password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("rejects an unknown username with 401 and the same generic message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "no-such-user", password: "anything" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("rejects a request missing username or password with 400", async () => {
    const missingPassword = await request(app).post("/api/auth/login").send({ username });
    expect(missingPassword.status).toBe(400);

    const missingUsername = await request(app).post("/api/auth/login").send({ password: "x" });
    expect(missingUsername.status).toBe(400);
  });
});
