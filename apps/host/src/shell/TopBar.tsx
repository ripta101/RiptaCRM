import { useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppBar, Avatar, Divider, IconButton, Menu, MenuItem, Toolbar, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "@riptacrm/auth-client";
import { AgentStatusSelector } from "../webchat/AgentStatusSelector";

export const TOP_BAR_HEIGHT = 64;

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  function handleOpen(event: MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  function handleNavigate(path: string) {
    handleClose();
    navigate(path);
  }

  function handleLogout() {
    handleClose();
    logout();
  }

  return (
    <AppBar position="fixed">
      <Toolbar sx={{ height: TOP_BAR_HEIGHT }}>
        <IconButton
          onClick={onMenuClick}
          size="small"
          aria-label="open menu"
          edge="start"
          sx={{ mr: 2 }}
          color="inherit"
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          RiptaCRM
        </Typography>
        <AgentStatusSelector />
        <IconButton onClick={handleOpen} size="small" aria-label="account menu">
          <Avatar sx={{ width: 32, height: 32 }} src={user?.avatarUrl}>
            {user?.name?.[0] ?? "?"}
          </Avatar>
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
          <MenuItem onClick={() => handleNavigate("/profile")}>Profile</MenuItem>
          <MenuItem onClick={() => handleNavigate("/settings")}>Settings</MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
