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
}

export function MasterDetailView({
  results,
  selectedCustomerId,
  onSelectCustomer,
  detail,
  detailLoading,
  detailError,
  onNewSearch,
}: MasterDetailViewProps) {
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="outlined" onClick={onNewSearch}>
          New Search
        </Button>
      </Box>
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        <ResultsList
          results={results}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={onSelectCustomer}
        />
        <CustomerDetailPanel detail={detail} loading={detailLoading} error={detailError} />
      </Box>
    </Box>
  );
}
