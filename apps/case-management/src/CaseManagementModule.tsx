import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { CaseTypeList } from "./components/CaseTypeList";
import { CaseTypeEditor } from "./components/CaseTypeEditor";
import { ActionLogViewer } from "./components/ActionLogViewer";
import { QueueList } from "./components/QueueList";
import { QueueEditor } from "./components/QueueEditor";

type TopTab = "types" | "queues" | "log";

interface CaseManagementModuleProps {
  authToken?: string | null;
}

export default function CaseManagementModule({ authToken }: CaseManagementModuleProps) {
  const [tab, setTab] = useState<TopTab>("types");
  const [selectedCaseTypeId, setSelectedCaseTypeId] = useState<string | null>(null);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_e, value: TopTab) => {
          setTab(value);
          setSelectedCaseTypeId(null);
          setSelectedQueueId(null);
        }}
        sx={{ mb: 3 }}
      >
        <Tab label="Case Types" value="types" />
        <Tab label="Queues" value="queues" />
        <Tab label="Action Log" value="log" />
      </Tabs>

      {tab === "types" &&
        (selectedCaseTypeId ? (
          <CaseTypeEditor
            caseTypeId={selectedCaseTypeId}
            onBack={() => setSelectedCaseTypeId(null)}
            authToken={authToken}
          />
        ) : (
          <CaseTypeList onSelect={setSelectedCaseTypeId} authToken={authToken} />
        ))}

      {tab === "queues" &&
        (selectedQueueId ? (
          <QueueEditor queueId={selectedQueueId} onBack={() => setSelectedQueueId(null)} authToken={authToken} />
        ) : (
          <QueueList onSelect={setSelectedQueueId} authToken={authToken} />
        ))}

      {tab === "log" && <ActionLogViewer authToken={authToken} />}
    </Box>
  );
}
