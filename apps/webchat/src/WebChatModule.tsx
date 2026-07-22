import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { SiteList } from "./components/SiteList";
import { SiteEditor } from "./components/SiteEditor";
import { QueueList } from "./components/QueueList";
import { QueueEditor } from "./components/QueueEditor";
import { CapacityOverrideEditor } from "./components/CapacityOverrideEditor";

type TopTab = "sites" | "queues" | "capacityOverrides";

interface WebChatModuleProps {
  authToken?: string | null;
}

export default function WebChatModule({ authToken }: WebChatModuleProps) {
  const [tab, setTab] = useState<TopTab>("sites");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_e, value: TopTab) => {
          setTab(value);
          setSelectedSiteId(null);
          setSelectedQueueId(null);
        }}
        sx={{ mb: 3 }}
      >
        <Tab label="Sites" value="sites" />
        <Tab label="Queues" value="queues" />
        <Tab label="Capacity Overrides" value="capacityOverrides" />
      </Tabs>

      {tab === "sites" &&
        (selectedSiteId ? (
          <SiteEditor siteId={selectedSiteId} onBack={() => setSelectedSiteId(null)} authToken={authToken} />
        ) : (
          <SiteList onSelect={setSelectedSiteId} authToken={authToken} />
        ))}

      {tab === "queues" &&
        (selectedQueueId ? (
          <QueueEditor queueId={selectedQueueId} onBack={() => setSelectedQueueId(null)} authToken={authToken} />
        ) : (
          <QueueList onSelect={setSelectedQueueId} authToken={authToken} />
        ))}

      {tab === "capacityOverrides" && <CapacityOverrideEditor authToken={authToken} />}
    </Box>
  );
}
