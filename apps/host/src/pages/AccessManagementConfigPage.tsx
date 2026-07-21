import { Box, Typography } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import { AccessManagementRemote } from "./AccessManagementRemote";

export function AccessManagementConfigPage() {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Access Management
      </Typography>
      <AccessManagementRemote authToken={user?.token ?? null} />
    </Box>
  );
}
