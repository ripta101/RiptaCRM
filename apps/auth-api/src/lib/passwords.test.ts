import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";

describe("passwords", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects an incorrect password against a hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash each time for the same plaintext (salted)", async () => {
    const hashA = await hashPassword("same-password");
    const hashB = await hashPassword("same-password");
    expect(hashA).not.toBe(hashB);
    expect(await verifyPassword("same-password", hashA)).toBe(true);
    expect(await verifyPassword("same-password", hashB)).toBe(true);
  });
});
