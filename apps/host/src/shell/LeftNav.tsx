import { useLocation, useNavigate } from "react-router-dom";
import { Drawer, List, ListItemButton, ListItemText, Toolbar } from "@mui/material";
import { useInteractions } from "../interactions/InteractionsContext";
import { navItems } from "./navItems";

export const LEFT_NAV_WIDTH = 220;

export function LeftNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveTab } = useInteractions();

  function handleSelect(path: string) {
    setActiveTab(null);
    navigate(path);
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: LEFT_NAV_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: LEFT_NAV_WIDTH, boxSizing: "border-box" },
      }}
    >
      <Toolbar />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.id}
            selected={location.pathname === item.path}
            onClick={() => handleSelect(item.path)}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
