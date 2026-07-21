import { Box, Typography } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import type { InteractionTab } from "@riptacrm/shared-types";
import { useInteractions } from "./InteractionsContext";
import { CustomerLookupRemote } from "./CustomerLookupRemote";

interface InteractionPanelProps {
  tab: InteractionTab;
}

export function InteractionPanel({ tab }: InteractionPanelProps) {
  const { renameTab, closeRequestedTabId, closeInteraction } = useInteractions();
  const { user } = useAuth();

  switch (tab.kind) {
    case "customer-lookup":
      return (
        <CustomerLookupRemote
          onCustomerIdentified={(customer) =>
            renameTab(tab.id, `${customer.firstName} ${customer.lastName}`)
          }
          closeRequested={closeRequestedTabId === tab.id}
          onInteractionEnded={() => closeInteraction(tab.id)}
          currentUserId={user?.id ?? null}
          authToken={user?.token ?? null}
          grantedFeatureIds={user?.navItemIds}
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
