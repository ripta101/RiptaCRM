import { Box, Typography } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import { CaseManagementRemote } from "./CaseManagementRemote";

export function CaseManagementConfigPage() {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Case Management Configuration
      </Typography>
      <CaseManagementRemote authToken={user?.token ?? null} />
    </Box>
  );
}
