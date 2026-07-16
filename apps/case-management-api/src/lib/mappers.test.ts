import { describe, expect, it } from "vitest";
import { coerceFieldValue } from "./mappers";

describe("coerceFieldValue", () => {
  it("returns null when the stored value is null, regardless of field type", () => {
    expect(coerceFieldValue(null, "TEXT")).toBeNull();
    expect(coerceFieldValue(null, "NUMBER")).toBeNull();
    expect(coerceFieldValue(null, "CHECKBOX")).toBeNull();
  });

  it("coerces NUMBER fields to a JS number", () => {
    expect(coerceFieldValue("42.5", "NUMBER")).toBe(42.5);
    expect(coerceFieldValue("0", "NUMBER")).toBe(0);
  });

  it("coerces CHECKBOX fields to a boolean based on the literal string 'true'", () => {
    expect(coerceFieldValue("true", "CHECKBOX")).toBe(true);
    expect(coerceFieldValue("false", "CHECKBOX")).toBe(false);
    expect(coerceFieldValue("anything-else", "CHECKBOX")).toBe(false);
  });

  it("returns TEXT/TEXTAREA/SELECT/DATE values unchanged as strings", () => {
    expect(coerceFieldValue("Phone", "SELECT")).toBe("Phone");
    expect(coerceFieldValue("Some notes", "TEXTAREA")).toBe("Some notes");
    expect(coerceFieldValue("2026-07-16", "DATE")).toBe("2026-07-16");
    expect(coerceFieldValue("Card replacement", "TEXT")).toBe("Card replacement");
  });
});
