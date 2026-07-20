import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";
import { hashPassword } from "../lib/passwords";

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
    const res = await request(app).get("/api/users");

    expect(res.status).toBe(200);
    const found = res.body.results.find((u: { id: string }) => u.id === userId);
    expect(found).toMatchObject({ id: userId, username, name: "List Test User", role: "frontline" });
    expect(found.passwordHash).toBeUndefined();
  });
});
