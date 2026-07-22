// Vanilla TS, zero dependencies — this is the single file a customer site loads via
// <script src=".../loader.js" data-site-key="..."></script>. Injects a floating bubble
// button that toggles a hidden iframe pointing at this same package's iframe build (see
// vite.config.iframe.ts / src/iframe). Deliberately has no framework dependency: it must
// be tiny and safe to run on any third-party page regardless of that page's own stack.

const OPEN_STATE_KEY_PREFIX = "riptacrm-webchat-open";

// Scoped to siteKey, same convention as ChatPanel's own conversation-id storage key — a
// visitor with multiple of this app's widgets embedded on different sites in the same
// browser shouldn't have one site's open/closed state leak into another's.
function openStateKey(siteKey: string): string {
  return `${OPEN_STATE_KEY_PREFIX}:${siteKey}`;
}

function currentScript(): HTMLScriptElement | null {
  // document.currentScript is only reliable for a synchronously-executing <script> tag,
  // which is exactly how this loader is meant to be included (no async/defer) — fall back
  // to the last matching tag for robustness if a site does something unusual.
  if (document.currentScript instanceof HTMLScriptElement) return document.currentScript;
  const scripts = document.querySelectorAll<HTMLScriptElement>("script[data-site-key]");
  return scripts.length > 0 ? scripts[scripts.length - 1] : null;
}

function init() {
  const script = currentScript();
  const siteKey = script?.dataset.siteKey;
  if (!siteKey) {
    console.error("[RiptaCRM WebChat] Missing data-site-key attribute on the loader <script> tag.");
    return;
  }

  // Resolve this package's own origin from the loader script's own src, so the injected
  // iframe points at wherever this loader itself was actually served from — no hardcoded
  // base URL, works the same whether that's localhost during dev or a real CDN later.
  const origin = script?.src ? new URL(script.src).origin : window.location.origin;
  // Trailing slash matters: "/iframe/" is served directly (no redirect), so the document's
  // base URL keeps its final path segment, and the built page's relative asset paths
  // (./assets/...) resolve under /iframe/ as intended. "/iframe/index.html" round-trips
  // through the static server's clean-URL redirects (→ /iframe/index → /iframe), which
  // strips the trailing slash and breaks that same relative resolution.
  // Captured here — the parent page's own location — since the iframe document created
  // below has no way to see it once loaded (its window.location is the iframe's own URL).
  const pageUrlPath = window.location.pathname;
  const pageUrlFull = window.location.href;
  const iframeUrl =
    `${origin}/iframe/?siteKey=${encodeURIComponent(siteKey)}` +
    `&pageUrlPath=${encodeURIComponent(pageUrlPath)}&pageUrlFull=${encodeURIComponent(pageUrlFull)}`;

  const bubble = document.createElement("button");
  bubble.textContent = "💬";
  Object.assign(bubble.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    border: "none",
    background: "#1565c0",
    color: "#fff",
    fontSize: "24px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    zIndex: "2147483000",
  } satisfies Partial<CSSStyleDeclaration>);

  // Restores whatever the visitor last left it as — otherwise every full page navigation on
  // a multi-page customer site (this loader re-executes from scratch on each one, unlike the
  // SPA-embedded MFE path) would snap an open chat window shut, even though the conversation
  // itself already survives navigation via ChatPanel's own localStorage-backed resume.
  let open = localStorage.getItem(openStateKey(siteKey)) === "true";

  const frame = document.createElement("iframe");
  frame.src = iframeUrl;
  frame.title = "Chat with us";
  Object.assign(frame.style, {
    position: "fixed",
    bottom: "88px",
    right: "20px",
    width: "360px",
    height: "480px",
    maxHeight: "70vh",
    border: "1px solid #ddd",
    borderRadius: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    zIndex: "2147483000",
    display: open ? "block" : "none",
    colorScheme: "light",
  } satisfies Partial<CSSStyleDeclaration>);

  bubble.addEventListener("click", () => {
    open = !open;
    frame.style.display = open ? "block" : "none";
    localStorage.setItem(openStateKey(siteKey), String(open));
  });

  document.body.appendChild(frame);
  document.body.appendChild(bubble);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
