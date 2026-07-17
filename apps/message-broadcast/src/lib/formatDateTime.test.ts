import { describe, expect, it } from "vitest";
import { formatBroadcastDateTime } from "./formatDateTime";

describe("formatBroadcastDateTime", () => {
  it("formats a standard afternoon time as DD-Mon-YYYY hh:mm AM/PM", () => {
    expect(formatBroadcastDateTime(new Date(2027, 0, 7, 14, 30).toISOString())).toBe("07-Jan-2027 02:30 PM");
  });

  it("formats midnight as 12:00 AM", () => {
    expect(formatBroadcastDateTime(new Date(2027, 5, 15, 0, 0).toISOString())).toBe("15-Jun-2027 12:00 AM");
  });

  it("formats noon as 12:00 PM", () => {
    expect(formatBroadcastDateTime(new Date(2027, 5, 15, 12, 0).toISOString())).toBe("15-Jun-2027 12:00 PM");
  });

  it("zero-pads single-digit day and minute", () => {
    expect(formatBroadcastDateTime(new Date(2027, 11, 3, 9, 5).toISOString())).toBe("03-Dec-2027 09:05 AM");
  });
});
