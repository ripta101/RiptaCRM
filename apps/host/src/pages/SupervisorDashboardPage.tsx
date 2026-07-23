import { Box, Typography } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import { SupervisorRemote } from "./SupervisorRemote";

export function SupervisorDashboardPage() {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Supervisor Dashboard
      </Typography>
      <SupervisorRemote authToken={user?.token ?? null} />
    </Box>
  );
}
