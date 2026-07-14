import { lazy, Suspense } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import type { CustomerSummary } from "@riptacrm/shared-types";
import { RemoteLoadErrorBoundary } from "./RemoteLoadErrorBoundary";

const CustomerLookupModule = lazy(() => import("customer/CustomerLookupModule"));

interface CustomerLookupRemoteProps {
  onCustomerIdentified?: (customer: CustomerSummary) => void;
}

export function CustomerLookupRemote({ onCustomerIdentified }: CustomerLookupRemoteProps) {
  return (
    <RemoteLoadErrorBoundary
      fallback={
        <Alert severity="error">
          The Customer module could not be loaded. Make sure its dev server is running
          (pnpm --filter @riptacrm/customer dev — http://localhost:5174).
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
        <CustomerLookupModule onCustomerIdentified={onCustomerIdentified} />
      </Suspense>
    </RemoteLoadErrorBoundary>
  );
}
