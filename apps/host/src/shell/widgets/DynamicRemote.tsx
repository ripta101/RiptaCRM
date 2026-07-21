import { useEffect, useState, type ComponentType } from "react";
import { Box, CircularProgress } from "@mui/material";
import { loadRemote, registerRemotes } from "@module-federation/runtime";
import type { AuthSession } from "@riptacrm/auth-client";

interface DynamicRemoteProps {
  entryUrl: string;
  remoteName: string;
  exposedModule: string;
  session: AuthSession;
}

type RemoteComponent = ComponentType<{ session: AuthSession }>;

// Loads a Module Federation remote whose URL wasn't known until an admin typed it into a
// custom menu item — distinct from the app's other remotes (Customer, Case Management, ...),
// which are declared statically in host/vite.config.ts and consumed via plain `lazy(import(...))`.
// See docs/architecture.md and the plan for this feature's security note: this remote runs
// unsandboxed in host's own origin, so it already has ambient access to everything that
// implies (sessionStorage, DOM, ...) the moment it's loaded — passing `session` as a prop is
// a clean contract, not an incremental grant of access it didn't already have.
export function DynamicRemote({ entryUrl, remoteName, exposedModule, session }: DynamicRemoteProps) {
  const [Comp, setComp] = useState<RemoteComponent | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setComp(null);
    setError(null);

    registerRemotes(
      [{ name: remoteName, entry: entryUrl, type: "module", entryGlobalName: remoteName, shareScope: "default" }],
      { force: true },
    );

    // A remote's own `exposes` key conventionally starts with "./" (e.g. "./SomeModule"),
    // but loadRemote()'s "remoteName/exposedName" specifier format doesn't repeat that
    // prefix — strip it so an admin can paste either form without it breaking.
    const normalizedExposedModule = exposedModule.replace(/^\.\//, "");

    loadRemote<{ default: RemoteComponent }>(`${remoteName}/${normalizedExposedModule}`)
      .then((mod) => {
        if (cancelled) return;
        if (!mod?.default) {
          throw new Error(`Remote "${remoteName}" did not expose a default export at "${exposedModule}".`);
        }
        setComp(() => mod.default);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      cancelled = true;
    };
  }, [entryUrl, remoteName, exposedModule]);

  // Re-thrown during render so the surrounding RemoteLoadErrorBoundary can catch it —
  // the load failure itself happens asynchronously, outside React's render phase.
  if (error) throw error;

  if (!Comp) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return <Comp session={session} />;
}
