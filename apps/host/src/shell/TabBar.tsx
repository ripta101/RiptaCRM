import { Box, IconButton, Tab, Tabs } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useInteractions } from "../interactions/InteractionsContext";

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeInteraction, requestClose } = useInteractions();

  function handleCloseClick(tab: (typeof tabs)[number]) {
    if (tab.kind === "customer-lookup") {
      requestClose(tab.id);
    } else {
      closeInteraction(tab.id);
    }
  }

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Tabs
        value={activeTabId ?? "home"}
        onChange={(_, value) => setActiveTab(value === "home" ? null : value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab value="home" label="Home" />
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {tab.title}
                <IconButton
                  component="span"
                  size="small"
                  aria-label={`Close ${tab.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCloseClick(tab);
                  }}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              </Box>
            }
          />
        ))}
      </Tabs>
    </Box>
  );
}
