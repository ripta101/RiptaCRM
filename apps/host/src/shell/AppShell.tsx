import { Outlet } from "react-router-dom";
import { Box, Toolbar } from "@mui/material";
import { InteractionsProvider, useInteractions } from "../interactions/InteractionsContext";
import { InteractionsRegion } from "../interactions/InteractionsRegion";
import { TopBar } from "./TopBar";
import { LeftNav, LEFT_NAV_WIDTH } from "./LeftNav";
import { TabBar } from "./TabBar";

function AppShellContent() {
  const { activeTabId } = useInteractions();

  return (
    <Box sx={{ display: "flex" }}>
      <TopBar />
      <LeftNav />
      <Box
        component="main"
        sx={{ flexGrow: 1, minWidth: 0, width: `calc(100% - ${LEFT_NAV_WIDTH}px)` }}
      >
        <Toolbar />
        <TabBar />
        <Box sx={{ p: 3 }}>
          {/* Outlet is only conditionally shown, but InteractionsRegion always
              stays mounted so switching to a routed page via the left nav
              never unmounts (and resets) an open interaction's state. */}
          <Box sx={{ display: activeTabId ? "none" : "block" }}>
            <Outlet />
          </Box>
          <InteractionsRegion />
        </Box>
      </Box>
    </Box>
  );
}

export function AppShell() {
  return (
    <InteractionsProvider>
      <AppShellContent />
    </InteractionsProvider>
  );
}
