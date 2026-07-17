import { lazy, Suspense } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { RemoteLoadErrorBoundary } from "../interactions/RemoteLoadErrorBoundary";

const MessageBroadcastModule = lazy(() => import("messageBroadcast/MessageBroadcastModule"));

export function MessageBroadcastRemote() {
  return (
    <RemoteLoadErrorBoundary
      fallback={
        <Alert severity="error">
          The Message Broadcast module could not be loaded. Make sure its dev server is running
          (pnpm --filter @riptacrm/message-broadcast dev — http://localhost:5176).
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
        <MessageBroadcastModule />
      </Suspense>
    </RemoteLoadErrorBoundary>
  );
}
