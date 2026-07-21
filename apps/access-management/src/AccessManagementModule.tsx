import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { ProfileList } from "./components/ProfileList";
import { ProfileEditor } from "./components/ProfileEditor";
import { UsersOverview } from "./components/UsersOverview";

type TopTab = "profiles" | "users";

export default function AccessManagementModule() {
  const [tab, setTab] = useState<TopTab>("profiles");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_e, value: TopTab) => {
          setTab(value);
          setSelectedProfileId(null);
        }}
        sx={{ mb: 3 }}
      >
        <Tab label="Profiles" value="profiles" />
        <Tab label="Users" value="users" />
      </Tabs>

      {tab === "profiles" &&
        (selectedProfileId ? (
          <ProfileEditor profileId={selectedProfileId} onBack={() => setSelectedProfileId(null)} />
        ) : (
          <ProfileList onSelect={setSelectedProfileId} />
        ))}

      {tab === "users" && <UsersOverview />}
    </Box>
  );
}
