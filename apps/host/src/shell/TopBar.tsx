import { useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppBar, Avatar, Divider, IconButton, Menu, MenuItem, Toolbar, Typography } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";

export const TOP_BAR_HEIGHT = 64;

export function TopBar() {
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
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ height: TOP_BAR_HEIGHT }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          RiptaCRM
        </Typography>
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
