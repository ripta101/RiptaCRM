import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, Toolbar } from "@mui/material";
import { InteractionsProvider, useInteractions } from "../interactions/InteractionsContext";
import { InteractionsRegion } from "../interactions/InteractionsRegion";
import { TopBar } from "./TopBar";
import { SideMenu } from "./SideMenu";
import { TabBar } from "./TabBar";

function AppShellContent() {
  const { activeTabId } = useInteractions();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Box sx={{ display: "flex" }}>
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: "100%" }}>
        <Toolbar />
        <TabBar />
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Outlet is only conditionally shown, but InteractionsRegion always
              stays mounted so switching to a routed page via the menu
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
