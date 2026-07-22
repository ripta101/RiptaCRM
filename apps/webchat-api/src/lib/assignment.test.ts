import { describe, expect, it } from "vitest";
import { pickAssignee } from "./assignment";

const OLDER = new Date("2026-01-01T00:00:00.000Z");
const NEWER = new Date("2026-01-01T01:00:00.000Z");

describe("pickAssignee", () => {
  it("skips a candidate already at or over their effective capacity", () => {
    const result = pickAssignee([
      { userId: "full", currentLoad: 3, effectiveCapacity: 3, lastAssignedAt: null },
      { userId: "available", currentLoad: 1, effectiveCapacity: 3, lastAssignedAt: OLDER },
    ]);
    expect(result).toBe("available");
  });

  it("picks whoever has gone longest without a chat (round-robin), not whoever has more spare capacity", () => {
    const result = pickAssignee([
      { userId: "high-capacity-but-recently-assigned", currentLoad: 1, effectiveCapacity: 5, lastAssignedAt: NEWER },
      { userId: "low-capacity-but-waiting-longer", currentLoad: 0, effectiveCapacity: 1, lastAssignedAt: OLDER },
    ]);
    expect(result).toBe("low-capacity-but-waiting-longer");
  });

  it("a never-assigned candidate always wins over an already-assigned one, regardless of load headroom", () => {
    // Mirrors the reported case: test1 (capacity 3) already got the first chat; test2
    // (capacity 1) has never been assigned — test2 must get the second chat even though
    // test1 still has plenty of room.
    const result = pickAssignee([
      { userId: "test1", currentLoad: 1, effectiveCapacity: 3, lastAssignedAt: NEWER },
      { userId: "test2", currentLoad: 0, effectiveCapacity: 1, lastAssignedAt: null },
    ]);
    expect(result).toBe("test2");
  });

  it("breaks ties (identical lastAssignedAt, including both never-assigned) by array order", () => {
    const tiedByTimestamp = pickAssignee([
      { userId: "first", currentLoad: 1, effectiveCapacity: 5, lastAssignedAt: OLDER },
      { userId: "second", currentLoad: 1, effectiveCapacity: 5, lastAssignedAt: OLDER },
    ]);
    expect(tiedByTimestamp).toBe("first");

    const bothNeverAssigned = pickAssignee([
      { userId: "first", currentLoad: 0, effectiveCapacity: 5, lastAssignedAt: null },
      { userId: "second", currentLoad: 0, effectiveCapacity: 5, lastAssignedAt: null },
    ]);
    expect(bothNeverAssigned).toBe("first");
  });

  it("returns null when no candidates are eligible", () => {
    const result = pickAssignee([{ userId: "full", currentLoad: 2, effectiveCapacity: 2, lastAssignedAt: null }]);
    expect(result).toBeNull();
  });

  it("returns null for an empty candidate list", () => {
    expect(pickAssignee([])).toBeNull();
  });
});
