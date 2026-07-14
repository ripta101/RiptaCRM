import { useRef } from "react";
import { Box, Button, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useInteractions } from "../interactions/InteractionsContext";
import { OpenCasesWidget } from "../shell/widgets/OpenCasesWidget";
import { RecentActivityWidget } from "../shell/widgets/RecentActivityWidget";

export function DashboardPage() {
  const { openInteraction } = useInteractions();
  const counterRef = useRef(1);

  function handleNewMockInteraction() {
    const n = counterRef.current++;
    openInteraction({
      id: crypto.randomUUID(),
      title: `Customer ${n}`,
      kind: "mock-customer",
      openedAt: Date.now(),
    });
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Button variant="contained" onClick={handleNewMockInteraction}>
          New Mock Interaction
        </Button>
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <OpenCasesWidget />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 8 }}>
          <RecentActivityWidget />
        </Grid>
      </Grid>
    </Box>
  );
}
