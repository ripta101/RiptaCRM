import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiAuthProvider } from "./apiAuthProvider";

function base64url(input: object): string {
  const json = JSON.stringify(input);
  return Buffer.from(json).toString("base64url");
}

function fakeToken(claims: Record<string, unknown>): string {
  const header = base64url({ alg: "HS256", typ: "JWT" });
  const payload = base64url(claims);
  return `${header}.${payload}.fake-signature`;
}

describe("apiAuthProvider", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("login", () => {
    it("stores the token and returns the session on success", async () => {
      const token = fakeToken({
        sub: "user-1",
        name: "Test User",
        email: "test@riptacrm.example",
        role: "frontline",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            token,
            user: { id: "user-1", name: "Test User", email: "test@riptacrm.example", role: "frontline" },
          }),
        }),
      );

      const provider = createApiAuthProvider({ baseUrl: "http://localhost:9999" });
      const session = await provider.login("test", "test");

      expect(session).toEqual({
        id: "user-1",
        name: "Test User",
        email: "test@riptacrm.example",
        role: "frontline",
        token,
      });
      expect(sessionStorage.getItem("riptacrm.auth.token")).toBe(token);
    });

    it("throws the server's error message on failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({ error: "Invalid username or password." }),
        }),
      );

      const provider = createApiAuthProvider({ baseUrl: "http://localhost:9999" });
      await expect(provider.login("test", "wrong")).rejects.toThrow("Invalid username or password.");
    });
  });

  describe("getSession", () => {
    it("returns null when nothing is stored", () => {
      const provider = createApiAuthProvider();
      expect(provider.getSession()).toBeNull();
    });

    it("returns the decoded session for a non-expired stored token", () => {
      const token = fakeToken({
        sub: "user-2",
        name: "Admin User",
        email: "admin@riptacrm.example",
        role: "admin",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      sessionStorage.setItem("riptacrm.auth.token", token);

      const provider = createApiAuthProvider();
      expect(provider.getSession()).toEqual({
        id: "user-2",
        name: "Admin User",
        email: "admin@riptacrm.example",
        role: "admin",
        token,
      });
    });

    it("returns null and clears storage for an expired stored token", () => {
      const token = fakeToken({
        sub: "user-2",
        name: "Admin User",
        email: "admin@riptacrm.example",
        role: "admin",
        exp: Math.floor(Date.now() / 1000) - 3600,
      });
      sessionStorage.setItem("riptacrm.auth.token", token);

      const provider = createApiAuthProvider();
      expect(provider.getSession()).toBeNull();
      expect(sessionStorage.getItem("riptacrm.auth.token")).toBeNull();
    });
  });

  describe("logout", () => {
    it("clears the stored token", () => {
      sessionStorage.setItem("riptacrm.auth.token", "some-token");
      const provider = createApiAuthProvider();
      provider.logout();
      expect(sessionStorage.getItem("riptacrm.auth.token")).toBeNull();
    });
  });
});
