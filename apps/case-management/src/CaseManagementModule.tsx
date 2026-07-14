import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { CaseTypeList } from "./components/CaseTypeList";
import { CaseTypeEditor } from "./components/CaseTypeEditor";
import { ActionLogViewer } from "./components/ActionLogViewer";

type TopTab = "types" | "log";

export default function CaseManagementModule() {
  const [tab, setTab] = useState<TopTab>("types");
  const [selectedCaseTypeId, setSelectedCaseTypeId] = useState<string | null>(null);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_e, value: TopTab) => {
          setTab(value);
          setSelectedCaseTypeId(null);
        }}
        sx={{ mb: 3 }}
      >
        <Tab label="Case Types" value="types" />
        <Tab label="Action Log" value="log" />
      </Tabs>

      {tab === "types" &&
        (selectedCaseTypeId ? (
          <CaseTypeEditor caseTypeId={selectedCaseTypeId} onBack={() => setSelectedCaseTypeId(null)} />
        ) : (
          <CaseTypeList onSelect={setSelectedCaseTypeId} />
        ))}

      {tab === "log" && <ActionLogViewer />}
    </Box>
  );
}
