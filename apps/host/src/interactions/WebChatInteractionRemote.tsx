import { lazy, Suspense } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { RemoteLoadErrorBoundary } from "./RemoteLoadErrorBoundary";

const WebChatAgentModule = lazy(() => import("webChat/WebChatAgentModule"));

interface WebChatInteractionRemoteProps {
  conversationId: string;
  closeRequested?: boolean;
  onInteractionEnded?: () => void;
  currentUserId?: string | null;
  authToken?: string | null;
}

export function WebChatInteractionRemote({
  conversationId,
  closeRequested,
  onInteractionEnded,
  currentUserId,
  authToken,
}: WebChatInteractionRemoteProps) {
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
        <WebChatAgentModule
          conversationId={conversationId}
          closeRequested={closeRequested}
          onInteractionEnded={onInteractionEnded}
          currentUserId={currentUserId}
          authToken={authToken}
        />
      </Suspense>
    </RemoteLoadErrorBoundary>
  );
}
