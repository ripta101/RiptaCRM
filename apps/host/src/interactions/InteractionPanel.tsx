import { Box, Typography } from "@mui/material";
import type { InteractionTab } from "@riptacrm/shared-types";
import { useInteractions } from "./InteractionsContext";
import { CustomerLookupRemote } from "./CustomerLookupRemote";

interface InteractionPanelProps {
  tab: InteractionTab;
}

export function InteractionPanel({ tab }: InteractionPanelProps) {
  const { renameTab } = useInteractions();

  switch (tab.kind) {
    case "customer-lookup":
      return (
        <CustomerLookupRemote
          onCustomerIdentified={(customer) =>
            renameTab(tab.id, `${customer.firstName} ${customer.lastName}`)
          }
        />
      );
    default:
      return (
        <Box>
          <Typography color="text.secondary">Unknown interaction kind: {tab.kind}</Typography>
        </Box>
      );
  }
}
