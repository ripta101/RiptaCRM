import { Box, Typography } from "@mui/material";
import { CaseManagementRemote } from "./CaseManagementRemote";

export function CaseManagementConfigPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Case Management Configuration
      </Typography>
      <CaseManagementRemote />
    </Box>
  );
}
