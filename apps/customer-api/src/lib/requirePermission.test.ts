import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { requirePermission } from "./requirePermission";
import { signTestToken, SERVICE_KEY_HEADER } from "../testHelpers";

function appWithGate(navItemId?: string) {
  const app = express();
  app.get("/protected", requirePermission(navItemId), (_req, res) => res.json({ ok: true }));
  return app;
}

describe("requirePermission", () => {
  it("rejects a request with no Authorization header and no service key with 401", async () => {
    const res = await request(appWithGate()).get("/protected");
    expect(res.status).toBe(401);
  });

  it("rejects a garbage/expired token with 401", async () => {
    const res = await request(appWithGate()).get("/protected").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("rejects a valid token missing the required grant with 403", async () => {
    const token = signTestToken(["some-other-grant"]);
    const res = await request(appWithGate("case-management-config"))
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows a valid token carrying the required grant", async () => {
    const token = signTestToken(["case-management-config"]);
    const res = await request(appWithGate("case-management-config"))
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("allows any authenticated user when no navItemId is required", async () => {
    const token = signTestToken([]);
    const res = await request(appWithGate()).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("allows a trusted service-to-service call regardless of grant or token", async () => {
    const res = await request(appWithGate("case-management-config")).get("/protected").set(SERVICE_KEY_HEADER);
    expect(res.status).toBe(200);
  });
});
