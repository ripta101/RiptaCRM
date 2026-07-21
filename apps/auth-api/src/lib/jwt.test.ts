import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { signAuthToken, signPreAuthToken, verifyAuthToken, verifyPreAuthToken } from "./jwt";

const SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me";

describe("jwt", () => {
  it("round-trips a signed token through verification", () => {
    const token = signAuthToken({
      sub: "user-1",
      name: "Test User",
      email: "test@riptacrm.example",
      profileId: "profile-1",
      profileName: "Frontline User",
      dashboardType: "frontline",
      canStartInteractions: true,
      navItemIds: ["home", "it-support"],
    });

    const verified = verifyAuthToken(token);
    expect(verified.sub).toBe("user-1");
    expect(verified.name).toBe("Test User");
    expect(verified.email).toBe("test@riptacrm.example");
    expect(verified.profileId).toBe("profile-1");
    expect(verified.profileName).toBe("Frontline User");
    expect(verified.dashboardType).toBe("frontline");
    expect(verified.canStartInteractions).toBe(true);
    expect(verified.navItemIds).toEqual(["home", "it-support"]);
    expect(typeof verified.exp).toBe("number");
  });

  it("rejects a tampered/garbage token", () => {
    expect(() => verifyAuthToken("not-a-real-token")).toThrow();
  });

  it("rejects an expired token", () => {
    const expiredToken = jwt.sign(
      {
        sub: "user-1",
        name: "Test User",
        email: "test@riptacrm.example",
        profileId: "profile-1",
        profileName: "Frontline User",
        dashboardType: "frontline",
        canStartInteractions: true,
        navItemIds: [],
      },
      SECRET,
      { expiresIn: -1 },
    );
    expect(() => verifyAuthToken(expiredToken)).toThrow();
  });
});

describe("pre-auth token", () => {
  it("round-trips through verification", () => {
    const token = signPreAuthToken({ sub: "user-1", purpose: "profile-selection" });
    const verified = verifyPreAuthToken(token);
    expect(verified.sub).toBe("user-1");
    expect(verified.purpose).toBe("profile-selection");
  });

  it("rejects a token that isn't purpose-scoped as profile-selection", () => {
    const wrongPurpose = jwt.sign({ sub: "user-1", purpose: "something-else" }, SECRET, { expiresIn: "5m" });
    expect(() => verifyPreAuthToken(wrongPurpose)).toThrow();
  });

  it("rejects a garbage token", () => {
    expect(() => verifyPreAuthToken("not-a-real-token")).toThrow();
  });
});
