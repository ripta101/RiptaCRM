import { Box, IconButton, Tab, Tabs } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useInteractions } from "../interactions/InteractionsContext";

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeInteraction } = useInteractions();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Tabs
        value={activeTabId ?? false}
        onChange={(_, value) => setActiveTab(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
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
                    closeInteraction(tab.id);
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
