import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { ProfileList } from "./components/ProfileList";
import { ProfileEditor } from "./components/ProfileEditor";
import { UsersOverview } from "./components/UsersOverview";
import { MenuItemList } from "./components/MenuItemList";
import { MenuItemEditor } from "./components/MenuItemEditor";

type TopTab = "profiles" | "users" | "menuItems";

interface AccessManagementModuleProps {
  authToken?: string | null;
}

export default function AccessManagementModule({ authToken }: AccessManagementModuleProps) {
  const [tab, setTab] = useState<TopTab>("profiles");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_e, value: TopTab) => {
          setTab(value);
          setSelectedProfileId(null);
          setSelectedMenuItemId(null);
        }}
        sx={{ mb: 3 }}
      >
        <Tab label="Profiles" value="profiles" />
        <Tab label="Users" value="users" />
        <Tab label="Menu Items" value="menuItems" />
      </Tabs>

      {tab === "profiles" &&
        (selectedProfileId ? (
          <ProfileEditor
            profileId={selectedProfileId}
            onBack={() => setSelectedProfileId(null)}
            authToken={authToken}
          />
        ) : (
          <ProfileList onSelect={setSelectedProfileId} authToken={authToken} />
        ))}

      {tab === "users" && <UsersOverview authToken={authToken} />}

      {tab === "menuItems" &&
        (selectedMenuItemId ? (
          <MenuItemEditor
            menuItemId={selectedMenuItemId}
            onBack={() => setSelectedMenuItemId(null)}
            authToken={authToken}
          />
        ) : (
          <MenuItemList onSelect={setSelectedMenuItemId} authToken={authToken} />
        ))}
    </Box>
  );
}
