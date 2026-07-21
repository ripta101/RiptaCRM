import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ChatIcon from "@mui/icons-material/Chat";
import EmailIcon from "@mui/icons-material/Email";
import GavelIcon from "@mui/icons-material/Gavel";
import CampaignIcon from "@mui/icons-material/Campaign";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { ALL_NAV_ITEMS } from "@riptacrm/shared-types";
import { useAuth } from "@riptacrm/auth-client";
import { useInteractions } from "../interactions/InteractionsContext";

const ICONS: Record<string, ComponentType> = {
  home: HomeIcon,
  "it-support": SupportAgentIcon,
  webchat: ChatIcon,
  email: EmailIcon,
  "case-management": GavelIcon,
  broadcast: CampaignIcon,
  "access-management": AdminPanelSettingsIcon,
};

export const SIDE_MENU_WIDTH = 240;

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

export function SideMenu({ open, onClose }: SideMenuProps) {
  const navigate = useNavigate();
  const { setActiveTab } = useInteractions();
  const { user } = useAuth();
  const navItems = ALL_NAV_ITEMS.filter((item) => user?.navItemIds.includes(item.id));

  function handleSelect(path: string) {
    setActiveTab(null);
    navigate(path);
    onClose();
  }

  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{ [`& .MuiDrawer-paper`]: { width: SIDE_MENU_WIDTH, boxSizing: "border-box" } }}
    >
      <List sx={{ width: SIDE_MENU_WIDTH }}>
        {navItems.map((item) => {
          const Icon = item.icon ? ICONS[item.icon] : undefined;
          return (
            <ListItemButton key={item.id} onClick={() => handleSelect(item.path)}>
              {Icon && (
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
              )}
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Drawer>
  );
}
