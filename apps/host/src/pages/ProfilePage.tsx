import { Box, Typography } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>
      <Typography color="text.secondary">Name: {user?.name}</Typography>
      <Typography color="text.secondary">Email: {user?.email}</Typography>
      <Typography color="text.secondary">Profile: {user?.profileName}</Typography>
    </Box>
  );
}
