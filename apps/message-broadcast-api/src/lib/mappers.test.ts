import { describe, expect, it } from "vitest";
import { priorityFromLabel, priorityToLabel } from "./mappers";

describe("priority round trip", () => {
  it("maps 0 to null and back", () => {
    expect(priorityToLabel(0)).toBeNull();
    expect(priorityFromLabel(undefined)).toBe(0);
  });

  it("maps LOW/NORMAL/HIGH round trip", () => {
    expect(priorityToLabel(1)).toBe("LOW");
    expect(priorityToLabel(2)).toBe("NORMAL");
    expect(priorityToLabel(3)).toBe("HIGH");
    expect(priorityFromLabel("LOW")).toBe(1);
    expect(priorityFromLabel("NORMAL")).toBe(2);
    expect(priorityFromLabel("HIGH")).toBe(3);
  });
});
