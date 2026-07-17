import { Box, Button, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useAuth } from "@riptacrm/auth-client";
import { useInteractions } from "../interactions/InteractionsContext";
import { OpenCasesWidget } from "../shell/widgets/OpenCasesWidget";
import { RecentActivityWidget } from "../shell/widgets/RecentActivityWidget";
import { RecentConfigChangesWidget } from "../shell/widgets/RecentConfigChangesWidget";
import { BroadcastPanelWidget } from "../shell/widgets/BroadcastPanelWidget";

export function DashboardPage() {
  const { user } = useAuth();
  const { openInteraction } = useInteractions();

  function handleNewInteraction() {
    openInteraction({
      id: crypto.randomUUID(),
      title: "New Customer Search",
      kind: "customer-lookup",
      openedAt: Date.now(),
    });
  }

  if (user?.role === "admin") {
    return (
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
          Dashboard
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <RecentConfigChangesWidget />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <BroadcastPanelWidget />
          </Grid>
        </Grid>
      </Box>
    );
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
        <Grid size={{ xs: 12, md: 8 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <OpenCasesWidget />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RecentActivityWidget />
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <BroadcastPanelWidget />
        </Grid>
      </Grid>
    </Box>
  );
}
