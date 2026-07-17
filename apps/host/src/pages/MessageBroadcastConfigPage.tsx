import { Box, Typography } from "@mui/material";
import { MessageBroadcastRemote } from "./MessageBroadcastRemote";

export function MessageBroadcastConfigPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Message Broadcasts
      </Typography>
      <MessageBroadcastRemote />
    </Box>
  );
}
