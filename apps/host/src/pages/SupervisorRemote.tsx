import { lazy, Suspense } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { RemoteLoadErrorBoundary } from "../interactions/RemoteLoadErrorBoundary";

const WebChatSupervisorModule = lazy(() => import("webChat/WebChatSupervisorModule"));

interface SupervisorRemoteProps {
  authToken?: string | null;
}

export function SupervisorRemote({ authToken }: SupervisorRemoteProps) {
  return (
    <RemoteLoadErrorBoundary
      fallback={
        <Alert severity="error">
          The WebChat module could not be loaded. Make sure its dev server is running
          (pnpm --filter @riptacrm/webchat dev — http://localhost:5178).
        </Alert>
      }
    >
      <Suspense
        fallback={
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        }
      >
        <WebChatSupervisorModule authToken={authToken} />
      </Suspense>
    </RemoteLoadErrorBoundary>
  );
}
