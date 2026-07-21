import { lazy, Suspense } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { RemoteLoadErrorBoundary } from "../interactions/RemoteLoadErrorBoundary";

const AccessManagementModule = lazy(() => import("accessManagement/AccessManagementModule"));

interface AccessManagementRemoteProps {
  authToken?: string | null;
}

export function AccessManagementRemote({ authToken }: AccessManagementRemoteProps) {
  return (
    <RemoteLoadErrorBoundary
      fallback={
        <Alert severity="error">
          The Access Management module could not be loaded. Make sure its dev server is running
          (pnpm --filter @riptacrm/access-management dev — http://localhost:5177).
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
        <AccessManagementModule authToken={authToken} />
      </Suspense>
    </RemoteLoadErrorBoundary>
  );
}
