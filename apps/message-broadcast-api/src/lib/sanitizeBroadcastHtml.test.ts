import { describe, expect, it } from "vitest";
import { sanitizeBroadcastHtml } from "./sanitizeBroadcastHtml";

describe("sanitizeBroadcastHtml", () => {
  it("strips <script> tags entirely", () => {
    const result = sanitizeBroadcastHtml("<p>Hello</p><script>alert(1)</script>");
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert(1)");
  });

  it("strips on* event handler attributes", () => {
    const result = sanitizeBroadcastHtml('<p onclick="alert(1)">Hello</p>');
    expect(result).not.toContain("onclick");
  });

  it("strips the style attribute", () => {
    const result = sanitizeBroadcastHtml('<p style="color:red">Hello</p>');
    expect(result).not.toContain("style");
  });

  it("strips <iframe> tags", () => {
    const result = sanitizeBroadcastHtml('<iframe src="https://evil.example"></iframe><p>Safe</p>');
    expect(result).not.toContain("<iframe");
  });

  it("keeps allowlisted formatting tags", () => {
    const result = sanitizeBroadcastHtml("<p><strong>Bold</strong> and <em>italic</em></p>");
    expect(result).toContain("<strong>Bold</strong>");
    expect(result).toContain("<em>italic</em>");
  });

  it("keeps links but forces rel=noopener noreferrer", () => {
    const result = sanitizeBroadcastHtml('<a href="https://example.com">link</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it("leaves emoji characters untouched", () => {
    const result = sanitizeBroadcastHtml("<p>Great news! 🎉🚀</p>");
    expect(result).toContain("🎉🚀");
  });
});
