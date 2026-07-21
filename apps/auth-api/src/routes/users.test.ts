import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { hashPassword } from "../lib/passwords";
import { SERVICE_KEY_HEADER } from "../testHelpers";

const app = createApp();

describe("GET /api/users", () => {
  const username = `users-list-test-${randomUUID()}`;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: await hashPassword("irrelevant"),
        name: "List Test User",
        email: "list-test@riptacrm.example",
        role: "frontline",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
  });

  it("returns users without their passwordHash", async () => {
    const res = await request(app).get("/api/users").set(SERVICE_KEY_HEADER);

    expect(res.status).toBe(200);
    const found = res.body.results.find((u: { id: string }) => u.id === userId);
    expect(found).toMatchObject({ id: userId, username, name: "List Test User", role: "frontline" });
    expect(found.passwordHash).toBeUndefined();
  });
});

describe("GET /api/users search + ids + limit", () => {
  const createdIds: string[] = [];

  async function createUser(overrides: { name?: string; username?: string; email?: string } = {}) {
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        username: overrides.username ?? `search-test-${suffix}`,
        passwordHash: await hashPassword("irrelevant"),
        name: overrides.name ?? `Search Test ${suffix}`,
        email: overrides.email ?? `search-test-${suffix}@riptacrm.example`,
        role: "frontline",
      },
    });
    createdIds.push(user.id);
    return user;
  }

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdIds.splice(0) } } });
  });

  it("with no query params, caps the default list and orders alphabetically by name", async () => {
    // Seed enough throwaway users to exceed DEFAULT_LIMIT (20), all sorting before the
    // rest of the seeded/other-test data alphabetically thanks to the "AAA" prefix.
    for (let i = 0; i < 21; i++) {
      await createUser({ name: `AAA Cap Test ${String(i).padStart(2, "0")}` });
    }

    const res = await request(app).get("/api/users").set(SERVICE_KEY_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(20);
    const names = res.body.results.map((u: { name: string }) => u.name);
    expect(names).toEqual([...names].sort());
  });

  it("q matches by name (case-insensitive)", async () => {
    const user = await createUser({ name: `Distinctive Name ${randomUUID()}` });

    const res = await request(app)
      .get(`/api/users?q=${encodeURIComponent(user.name.slice(0, 12).toUpperCase())}`)
      .set(SERVICE_KEY_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.results.some((u: { id: string }) => u.id === user.id)).toBe(true);
  });

  it("q matches by username", async () => {
    const user = await createUser({ username: `distinctive-uname-${randomUUID()}` });

    const res = await request(app)
      .get(`/api/users?q=${encodeURIComponent(user.username.slice(0, 15))}`)
      .set(SERVICE_KEY_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.results.some((u: { id: string }) => u.id === user.id)).toBe(true);
  });

  it("q matches by email", async () => {
    const user = await createUser({ email: `distinctive-${randomUUID()}@riptacrm.example` });

    const res = await request(app)
      .get(`/api/users?q=${encodeURIComponent(user.email.slice(0, 15))}`)
      .set(SERVICE_KEY_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.results.some((u: { id: string }) => u.id === user.id)).toBe(true);
  });

  it("q with no matches returns an empty list", async () => {
    const res = await request(app)
      .get(`/api/users?q=${encodeURIComponent(`no-such-user-${randomUUID()}`)}`)
      .set(SERVICE_KEY_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it("ids bypasses the cap and returns exactly the requested subset", async () => {
    for (let i = 0; i < 21; i++) {
      await createUser({ name: `AAA Ids Test ${String(i).padStart(2, "0")}` });
    }
    const subset = createdIds.slice(0, 3);

    const res = await request(app).get(`/api/users?ids=${subset.join(",")}`).set(SERVICE_KEY_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.results.map((u: { id: string }) => u.id).sort()).toEqual([...subset].sort());
  });

  it("limit is honored and clamped to the max", async () => {
    for (let i = 0; i < 5; i++) {
      await createUser({ name: `AAA Limit Test ${String(i).padStart(2, "0")}` });
    }

    const res = await request(app).get("/api/users?limit=2").set(SERVICE_KEY_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeLessThanOrEqual(2);

    const overLimitRes = await request(app).get("/api/users?limit=9999").set(SERVICE_KEY_HEADER);
    expect(overLimitRes.status).toBe(200);
    expect(overLimitRes.body.results.length).toBeLessThanOrEqual(50);
  });
});
