import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";

const app = createApp();

describe("GET /api/profiles proxy", () => {
  it("fails soft to an empty list when access-management-api is unreachable", async () => {
    const res = await request(app).get("/api/profiles");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });
});
