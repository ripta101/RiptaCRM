import { useEffect, useState, type ComponentType } from "react";
import { loadRemote, registerRemotes } from "@module-federation/runtime";

const SITE_KEY = "demo-site-key-please-change";
const REMOTE_NAME = "webChatWidget";
const REMOTE_ENTRY_URL = "http://localhost:5179/mfe/remoteEntry.js";

type WidgetComponent = ComponentType<{ siteKey: string }>;

// Same @module-federation/runtime API apps/host/src/shell/widgets/DynamicRemote.tsx uses
// to load admin-configured custom menu items at runtime — this page demonstrates the
// Module Federation embed path from the OTHER side: a foreign (to RiptaCRM) React app
// pulling in RiptaCRM's widget remote, rather than RiptaCRM's own Host pulling in someone
// else's.
export function ReactEmbedDemo() {
  const [Widget, setWidget] = useState<WidgetComponent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    registerRemotes(
      [{ name: REMOTE_NAME, entry: REMOTE_ENTRY_URL, type: "module", entryGlobalName: REMOTE_NAME, shareScope: "default" }],
      { force: true },
    );

    loadRemote<{ default: WidgetComponent }>(`${REMOTE_NAME}/WebChatWidgetModule`)
      .then((mod) => {
        if (!mod?.default) throw new Error("Remote did not expose a default export.");
        setWidget(() => mod.default);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (error) {
    return (
      <p style={{ color: "#c0392b" }}>
        Failed to load the widget remote: {error}. Make sure apps/webchat-widget's mfe build
        is being served on http://localhost:5179 (pnpm --filter @riptacrm/webchat-widget run serve).
      </p>
    );
  }

  if (!Widget) {
    return <p>Loading widget…</p>;
  }

  return (
    <div style={{ height: 480, maxWidth: 380, border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
      <Widget siteKey={SITE_KEY} />
    </div>
  );
}
