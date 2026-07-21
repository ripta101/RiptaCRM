import { useState } from "react";
import { Box, Button, Tab, Tabs, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useAuth } from "@riptacrm/auth-client";
import { useInteractions } from "../interactions/InteractionsContext";
import { OpenCasesWidget } from "../shell/widgets/OpenCasesWidget";
import { RecentActivityWidget } from "../shell/widgets/RecentActivityWidget";
import { RecentConfigChangesWidget } from "../shell/widgets/RecentConfigChangesWidget";
import { BroadcastPanelWidget } from "../shell/widgets/BroadcastPanelWidget";
import { WorklistTable } from "../shell/widgets/WorklistTable";

type FrontlineTab = "dashboard" | "worklist";

export function DashboardPage() {
  const { user } = useAuth();
  const { openInteraction } = useInteractions();
  const [tab, setTab] = useState<FrontlineTab>("dashboard");

  function handleNewInteraction() {
    openInteraction({
      id: crypto.randomUUID(),
      title: "New Customer Search",
      kind: "customer-lookup",
      openedAt: Date.now(),
    });
  }

  if (user?.dashboardType === "admin") {
    return (
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
          Dashboard
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <RecentConfigChangesWidget />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
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
        {user?.canStartInteractions && (
          <Button variant="contained" onClick={handleNewInteraction}>
            New Interaction
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={(_e, value: FrontlineTab) => setTab(value)} sx={{ mb: 3 }}>
        <Tab label="Dashboard" value="dashboard" />
        <Tab label="Worklist" value="worklist" />
      </Tabs>

      {tab === "dashboard" && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <OpenCasesWidget />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <RecentActivityWidget />
              </Grid>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <BroadcastPanelWidget />
          </Grid>
        </Grid>
      )}

      {tab === "worklist" && <WorklistTable />}
    </Box>
  );
}
