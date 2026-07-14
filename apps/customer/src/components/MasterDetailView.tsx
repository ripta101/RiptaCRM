import { Box, Button } from "@mui/material";
import type { CustomerDetail, CustomerSummary } from "@riptacrm/shared-types";
import { ResultsList } from "./ResultsList";
import { CustomerDetailPanel } from "./CustomerDetailPanel";

interface MasterDetailViewProps {
  results: CustomerSummary[];
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string) => void;
  detail: CustomerDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  onNewSearch: () => void;
  onConfirm?: (detail: CustomerDetail) => void;
}

export function MasterDetailView({
  results,
  selectedCustomerId,
  onSelectCustomer,
  detail,
  detailLoading,
  detailError,
  onNewSearch,
  onConfirm,
}: MasterDetailViewProps) {
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="outlined" onClick={onNewSearch}>
          New Search
        </Button>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          alignItems: { xs: "stretch", md: "flex-start" },
        }}
      >
        <ResultsList
          results={results}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={onSelectCustomer}
        />
        <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <CustomerDetailPanel detail={detail} loading={detailLoading} error={detailError} />
          {detail && (
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="contained" onClick={() => onConfirm?.(detail)}>
                Confirm
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
