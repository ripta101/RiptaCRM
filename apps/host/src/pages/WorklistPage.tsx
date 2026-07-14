import { Box, Typography } from "@mui/material";

export function WorklistPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Worklist
      </Typography>
      <Typography color="text.secondary">
        Coming soon — this will show tasks and items assigned to you.
      </Typography>
    </Box>
  );
}
