import { lazy, Suspense } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { RemoteLoadErrorBoundary } from "../interactions/RemoteLoadErrorBoundary";

const WebChatModule = lazy(() => import("webChat/WebChatModule"));

interface WebChatRemoteProps {
  authToken?: string | null;
}

export function WebChatRemote({ authToken }: WebChatRemoteProps) {
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
        <WebChatModule authToken={authToken} />
      </Suspense>
    </RemoteLoadErrorBoundary>
  );
}
