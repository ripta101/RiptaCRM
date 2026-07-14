import { useState } from "react";
import { Box, Paper, TextField, Typography } from "@mui/material";
import type { InteractionTab } from "@riptacrm/shared-types";

interface InteractionPanelProps {
  tab: InteractionTab;
}

export function InteractionPanel({ tab }: InteractionPanelProps) {
  const [notes, setNotes] = useState("");

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {tab.title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Mock interaction ({tab.kind}) — opened {new Date(tab.openedAt).toLocaleTimeString()}
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, maxWidth: 480 }}>
        <TextField
          label="Notes"
          placeholder="Type here — switch tabs and come back, this stays put"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={4}
          fullWidth
        />
      </Paper>
    </Box>
  );
}
