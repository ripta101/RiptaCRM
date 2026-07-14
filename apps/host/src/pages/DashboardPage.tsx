import { Box, Button, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useInteractions } from "../interactions/InteractionsContext";
import { OpenCasesWidget } from "../shell/widgets/OpenCasesWidget";
import { RecentActivityWidget } from "../shell/widgets/RecentActivityWidget";

export function DashboardPage() {
  const { openInteraction } = useInteractions();

  function handleNewInteraction() {
    openInteraction({
      id: crypto.randomUUID(),
      title: "New Customer Search",
      kind: "customer-lookup",
      openedAt: Date.now(),
    });
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Button variant="contained" onClick={handleNewInteraction}>
          New Interaction
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
