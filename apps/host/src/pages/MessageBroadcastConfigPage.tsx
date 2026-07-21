import { Box, Typography } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import { MessageBroadcastRemote } from "./MessageBroadcastRemote";

export function MessageBroadcastConfigPage() {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Message Broadcasts
      </Typography>
      <MessageBroadcastRemote authToken={user?.token ?? null} />
    </Box>
  );
}
