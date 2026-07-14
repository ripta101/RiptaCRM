import { Box } from "@mui/material";
import { useInteractions } from "./InteractionsContext";
import { InteractionPanel } from "./InteractionPanel";

/**
 * Renders every open interaction's panel at once (display toggling, not
 * conditional mounting) so switching tabs never remounts — and therefore
 * never loses — a tab's in-progress state.
 */
export function InteractionsRegion() {
  const { tabs, activeTabId } = useInteractions();

  return (
    <>
      {tabs.map((tab) => (
        <Box key={tab.id} sx={{ display: tab.id === activeTabId ? "block" : "none" }}>
          <InteractionPanel tab={tab} />
        </Box>
      ))}
    </>
  );
}
