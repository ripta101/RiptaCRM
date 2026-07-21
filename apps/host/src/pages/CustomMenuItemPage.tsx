import { Navigate, useParams } from "react-router-dom";
import { Alert, Box } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import { RemoteLoadErrorBoundary } from "../interactions/RemoteLoadErrorBoundary";
import { DynamicRemote } from "../shell/widgets/DynamicRemote";

// The one dynamic route in the app (/custom/:menuItemId) — unlike every built-in nav item,
// there's no way to know at compile time which ids exist, so this page does its own
// auth check inline instead of going through NavItemRoute.
export function CustomMenuItemPage() {
  const { menuItemId } = useParams<{ menuItemId: string }>();
  const { user } = useAuth();

  const item = user?.customMenuItems.find((i) => i.id === menuItemId);
  if (!item) {
    return <Navigate to="/" replace />;
  }

  if (item.displayType === "IFRAME") {
    return (
      <Box sx={{ height: "calc(100vh - 128px)" }}>
        <iframe
          src={item.iframeUrl ?? undefined}
          title={item.label}
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      </Box>
    );
  }

  return (
    <RemoteLoadErrorBoundary
      fallback={<Alert severity="error">The "{item.label}" module could not be loaded.</Alert>}
    >
      <DynamicRemote
        entryUrl={item.remoteEntryUrl ?? ""}
        remoteName={item.remoteName ?? ""}
        exposedModule={item.exposedModule ?? ""}
        session={user!}
      />
    </RemoteLoadErrorBoundary>
  );
}
