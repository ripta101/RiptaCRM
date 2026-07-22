import { Box, Typography } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import { WebChatRemote } from "./WebChatRemote";

export function WebChatConfigPage() {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        WebChat Configuration
      </Typography>
      <WebChatRemote authToken={user?.token ?? null} />
    </Box>
  );
}
