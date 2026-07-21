import { Box, Typography } from "@mui/material";
import { AccessManagementRemote } from "./AccessManagementRemote";

export function AccessManagementConfigPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Access Management
      </Typography>
      <AccessManagementRemote />
    </Box>
  );
}
