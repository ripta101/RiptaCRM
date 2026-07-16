import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { signAuthToken, verifyAuthToken } from "./jwt";

const SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me";

describe("jwt", () => {
  it("round-trips a signed token through verification", () => {
    const token = signAuthToken({
      sub: "user-1",
      name: "Test User",
      email: "test@riptacrm.example",
      role: "frontline",
    });

    const verified = verifyAuthToken(token);
    expect(verified.sub).toBe("user-1");
    expect(verified.name).toBe("Test User");
    expect(verified.email).toBe("test@riptacrm.example");
    expect(verified.role).toBe("frontline");
    expect(typeof verified.exp).toBe("number");
  });

  it("rejects a tampered/garbage token", () => {
    expect(() => verifyAuthToken("not-a-real-token")).toThrow();
  });

  it("rejects an expired token", () => {
    const expiredToken = jwt.sign(
      { sub: "user-1", name: "Test User", email: "test@riptacrm.example", role: "frontline" },
      SECRET,
      { expiresIn: -1 },
    );
    expect(() => verifyAuthToken(expiredToken)).toThrow();
  });
});
