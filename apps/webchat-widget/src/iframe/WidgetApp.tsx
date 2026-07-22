import { ChatPanel } from "../core/ChatPanel";

export function WidgetApp() {
  const params = new URLSearchParams(window.location.search);
  const siteKey = params.get("siteKey") ?? "";
  // Forwarded by loader.ts, which has access to the embedding page's real location — this
  // iframe document's own window.location is just its own URL (localhost:5179/iframe/...),
  // not the customer site's page the visitor is actually looking at.
  const pageUrlPath = params.get("pageUrlPath") ?? undefined;
  const pageUrlFull = params.get("pageUrlFull") ?? undefined;

  if (!siteKey) {
    return <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>Missing siteKey.</div>;
  }

  return <ChatPanel siteKey={siteKey} pageUrlPath={pageUrlPath} pageUrlFull={pageUrlFull} />;
}
