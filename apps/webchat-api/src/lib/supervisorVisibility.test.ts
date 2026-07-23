import { describe, expect, it } from "vitest";
import { resolveVisibleUserIds } from "./supervisorVisibility";

describe("resolveVisibleUserIds", () => {
  it("unions queue members and profile members", () => {
    const result = resolveVisibleUserIds(["a", "b"], [{ memberUserIds: ["c"] }, { memberUserIds: ["d"] }]);
    expect(result.sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("dedupes an agent visible via both a queue and a profile", () => {
    const result = resolveVisibleUserIds(["a", "b"], [{ memberUserIds: ["b", "c"] }]);
    expect(result.sort()).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array when both inputs are empty", () => {
    expect(resolveVisibleUserIds([], [])).toEqual([]);
  });

  it("handles queue members with no supervised profiles at all", () => {
    expect(resolveVisibleUserIds(["a", "b"], [])).toEqual(["a", "b"]);
  });

  it("handles supervised profiles with no supervised queues at all", () => {
    const result = resolveVisibleUserIds([], [{ memberUserIds: ["a"] }, { memberUserIds: ["b"] }]);
    expect(result.sort()).toEqual(["a", "b"]);
  });
});
