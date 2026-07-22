import { describe, expect, it } from "vitest";
import { pickAssignee } from "./assignment";

describe("pickAssignee", () => {
  it("skips a candidate already at or over their effective capacity", () => {
    const result = pickAssignee([
      { userId: "full", currentLoad: 3, effectiveCapacity: 3 },
      { userId: "available", currentLoad: 1, effectiveCapacity: 3 },
    ]);
    expect(result).toBe("available");
  });

  it("picks the least-loaded eligible candidate", () => {
    const result = pickAssignee([
      { userId: "busier", currentLoad: 2, effectiveCapacity: 5 },
      { userId: "least-busy", currentLoad: 0, effectiveCapacity: 5 },
    ]);
    expect(result).toBe("least-busy");
  });

  it("breaks ties by array order", () => {
    const result = pickAssignee([
      { userId: "first", currentLoad: 1, effectiveCapacity: 5 },
      { userId: "second", currentLoad: 1, effectiveCapacity: 5 },
    ]);
    expect(result).toBe("first");
  });

  it("returns null when no candidates are eligible", () => {
    const result = pickAssignee([{ userId: "full", currentLoad: 2, effectiveCapacity: 2 }]);
    expect(result).toBeNull();
  });

  it("returns null for an empty candidate list", () => {
    expect(pickAssignee([])).toBeNull();
  });
});
