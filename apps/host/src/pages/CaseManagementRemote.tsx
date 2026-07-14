import { lazy, Suspense } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { RemoteLoadErrorBoundary } from "../interactions/RemoteLoadErrorBoundary";

const CaseManagementModule = lazy(() => import("caseManagement/CaseManagementModule"));

export function CaseManagementRemote() {
  return (
    <RemoteLoadErrorBoundary
      fallback={
        <Alert severity="error">
          The Case Management module could not be loaded. Make sure its dev server is running
          (pnpm --filter @riptacrm/case-management dev — http://localhost:5175).
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
        <CaseManagementModule />
      </Suspense>
    </RemoteLoadErrorBoundary>
  );
}
