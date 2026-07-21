import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { SERVICE_KEY_HEADER } from "../testHelpers";

const app = createApp();

describe("GET /api/profiles proxy", () => {
  it("fails soft to an empty list when access-management-api is unreachable", async () => {
    const res = await request(app).get("/api/profiles").set(SERVICE_KEY_HEADER);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });
});
