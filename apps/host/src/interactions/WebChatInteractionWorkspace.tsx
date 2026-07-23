import { Box } from "@mui/material";
import type { CustomerSummary } from "@riptacrm/shared-types";
import { TOP_BAR_HEIGHT } from "../shell/TopBar";
import { linkConversationCustomer } from "../api/webchatClient";
import { CustomerLookupRemote } from "./CustomerLookupRemote";
import { WebChatInteractionRemote } from "./WebChatInteractionRemote";

// Vertical chrome that sits above the rail in normal document flow, before any scrolling:
// TopBar (fixed, TOP_BAR_HEIGHT) + TabBar (MUI Tabs default height, ~52px) + the page
// content Box's own top padding (p:3 → 24px at the sm+ breakpoint this rail applies at).
// The rail's height must fit under this from its *natural* (unscrolled) position, not just
// relative to the fixed TopBar — sizing it any taller pushes total document height past the
// viewport, which then forces the page itself to scroll (WebChatAgentModule's own
// scrollIntoView-on-new-message can trigger exactly that), shifting everything below the
// fixed TopBar out of view. A little extra margin below rounds this out.
const CHROME_ABOVE_RAIL = TOP_BAR_HEIGHT + 52 + 24;
const RAIL_BOTTOM_MARGIN = 24;

interface WebChatInteractionWorkspaceProps {
  conversationId: string;
  closeRequested?: boolean;
  onInteractionEnded?: () => void;
  onCustomerIdentified?: (customer: CustomerSummary) => void;
  currentUserId?: string | null;
  authToken?: string | null;
  grantedFeatureIds?: string[];
}

// A webchat interaction tab looks like a normal new interaction (Search Customer, same
// workflow) with the chat pinned persistently on the right — the agent works the customer
// record while the conversation stays visible. The customer side owns the tab's lifecycle
// (wrap-up screen decides when the tab actually closes); the chat panel deliberately gets no
// closeRequested/onInteractionEnded so it can never short-circuit that wrap-up flow the way
// its own immediate, unconfirmed close would.
export function WebChatInteractionWorkspace({
  conversationId,
  closeRequested,
  onInteractionEnded,
  onCustomerIdentified,
  currentUserId,
  authToken,
  grantedFeatureIds,
}: WebChatInteractionWorkspaceProps) {
  function handleCustomerIdentified(customer: CustomerSummary) {
    onCustomerIdentified?.(customer);
    // Best-effort — a failed link shouldn't block the agent from continuing to work the
    // interaction, same non-blocking posture as AgentStatusSelector's catch-up call.
    linkConversationCustomer(conversationId, customer.id, authToken).catch(() => undefined);
  }

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, alignItems: "stretch" }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <CustomerLookupRemote
          onCustomerIdentified={handleCustomerIdentified}
          closeRequested={closeRequested}
          onInteractionEnded={onInteractionEnded}
          currentUserId={currentUserId}
          authToken={authToken}
          grantedFeatureIds={grantedFeatureIds}
        />
      </Box>
      <Box
        sx={{
          width: { xs: "100%", md: 380 },
          flexShrink: 0,
          position: { xs: "static", md: "sticky" },
          top: TOP_BAR_HEIGHT + RAIL_BOTTOM_MARGIN,
          alignSelf: "flex-start",
          // An explicit height, not maxHeight — WebChatAgentModule's own root uses
          // height:"100%" (with an internal flex:1/overflowY:auto transcript) to fill
          // whatever container it's given; height alone doesn't establish a percentage
          // basis for that chain to resolve against, so this can't just cap growth. Sized to
          // CHROME_ABOVE_RAIL, not just the fixed TopBar — see that constant's comment.
          height: { xs: 480, md: `calc(100vh - ${CHROME_ABOVE_RAIL + RAIL_BOTTOM_MARGIN}px)` },
        }}
      >
        <WebChatInteractionRemote conversationId={conversationId} currentUserId={currentUserId} authToken={authToken} />
      </Box>
    </Box>
  );
}
