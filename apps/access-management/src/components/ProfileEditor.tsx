import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { ALL_NAV_ITEMS, PROTECTED_PROFILE_REQUIRED_NAV_ITEM_ID } from "@riptacrm/shared-types";
import type { CustomMenuItem, DashboardType, Profile, UserSummary } from "@riptacrm/shared-types";
import { UserAutocomplete } from "@riptacrm/ui";
import {
  addProfileMember,
  archiveProfile,
  deleteProfile,
  getProfile,
  listMenuItems,
  listUsers,
  removeProfileMember,
  updateProfile,
} from "../api/client";

interface ProfileEditorProps {
  profileId: string;
  onBack: () => void;
  authToken?: string | null;
}

export function ProfileEditor({ profileId, onBack, authToken }: ProfileEditorProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [customMenuItems, setCustomMenuItems] = useState<CustomMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [dashboardType, setDashboardType] = useState<DashboardType>("frontline");
  const [canStartInteractions, setCanStartInteractions] = useState(false);
  const [maxConcurrentChats, setMaxConcurrentChats] = useState(3);
  const [saving, setSaving] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [navItemError, setNavItemError] = useState<string | null>(null);
  const [memberToAdd, setMemberToAdd] = useState<UserSummary | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([getProfile(profileId, authToken), listMenuItems(authToken)])
      .then(([p, m]) =>
        listUsers({ ids: p.memberUserIds.join(",") }, authToken).then((u) => {
          setProfile(p);
          setUsers(u);
          setCustomMenuItems(m);
          setName(p.name);
          setDashboardType(p.dashboardType);
          setCanStartInteractions(p.canStartInteractions);
          setMaxConcurrentChats(p.maxConcurrentChats);
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [profileId, authToken]);

  async function handleSaveDetails() {
    setSaving(true);
    setDetailsError(null);
    try {
      const updated = await updateProfile(
        profileId,
        { name: name.trim(), dashboardType, canStartInteractions, maxConcurrentChats },
        authToken,
      );
      setProfile(updated);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleNavItem(navItemId: string) {
    if (!profile) return;
    setNavItemError(null);
    const navItemIds = profile.navItemIds.includes(navItemId)
      ? profile.navItemIds.filter((id) => id !== navItemId)
      : [...profile.navItemIds, navItemId];
    try {
      const updated = await updateProfile(profileId, { navItemIds }, authToken);
      setProfile(updated);
    } catch (err) {
      setNavItemError(err instanceof Error ? err.message : "Failed to update menu items.");
    }
  }

  async function handleAddMember() {
    if (!memberToAdd) return;
    setMemberError(null);
    try {
      const updated = await addProfileMember(profileId, { userId: memberToAdd.id }, authToken);
      setProfile(updated);
      setMemberToAdd(null);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to add member.");
    }
  }

  async function handleRemoveMember(userId: string) {
    setMemberError(null);
    try {
      await removeProfileMember(profileId, userId, authToken);
      setProfile((prev) => (prev ? { ...prev, memberUserIds: prev.memberUserIds.filter((id) => id !== userId) } : prev));
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  }

  async function handleArchive() {
    setLifecycleError(null);
    try {
      const updated = await archiveProfile(profileId, authToken);
      setProfile(updated);
    } catch (err) {
      setLifecycleError(err instanceof Error ? err.message : "Failed to archive profile.");
    }
  }

  async function handleDelete() {
    setLifecycleError(null);
    try {
      await deleteProfile(profileId, authToken);
      onBack();
    } catch (err) {
      setLifecycleError(err instanceof Error ? err.message : "Failed to delete profile.");
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return <Alert severity="error">{error ?? "Profile not found."}</Alert>;
  }

  const userById = new Map(users.map((u) => [u.id, u]));
  const hasMembers = profile.memberUserIds.length > 0;
  const lifecycleDisabledReason = profile.isProtected
    ? "This profile is protected and cannot be archived or deleted."
    : hasMembers
      ? "Unassign all members before archiving or deleting this profile."
      : null;

  return (
    <Box>
      <Button onClick={onBack} sx={{ mb: 2 }}>
        Back to Profiles
      </Button>

      {profile.isProtected && <Chip size="small" label="Protected" sx={{ mb: 2 }} />}
      {profile.archivedAt && <Chip size="small" color="warning" label="Archived" sx={{ mb: 2, ml: 1 }} />}

      {detailsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {detailsError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2} sx={{ maxWidth: 420 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} size="small" />
          <TextField
            select
            label="Dashboard"
            value={dashboardType}
            onChange={(e) => setDashboardType(e.target.value as DashboardType)}
            size="small"
          >
            <MenuItem value="frontline">Frontline</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={canStartInteractions}
                onChange={(e) => setCanStartInteractions(e.target.checked)}
              />
            }
            label="Can start customer interactions"
          />
          <TextField
            label="Max concurrent chats"
            type="number"
            size="small"
            value={maxConcurrentChats}
            onChange={(e) => setMaxConcurrentChats(Math.max(0, parseInt(e.target.value, 10) || 0))}
            slotProps={{ htmlInput: { min: 0 } }}
            helperText="Default WebChat capacity for anyone holding this profile — overridable per agent."
          />
          <Box>
            <Button
              variant="contained"
              disabled={
                !name.trim() ||
                saving ||
                (name === profile.name &&
                  dashboardType === profile.dashboardType &&
                  canStartInteractions === profile.canStartInteractions &&
                  maxConcurrentChats === profile.maxConcurrentChats)
              }
              onClick={handleSaveDetails}
            >
              Save
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Menu Items
      </Typography>
      {navItemError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {navItemError}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        {ALL_NAV_ITEMS.filter((item) => item.path).map((item) => (
          <FormControlLabel
            key={item.id}
            control={
              <Checkbox
                checked={profile.navItemIds.includes(item.id)}
                disabled={profile.isProtected && item.id === PROTECTED_PROFILE_REQUIRED_NAV_ITEM_ID}
                onChange={() => handleToggleNavItem(item.id)}
              />
            }
            label={item.label}
          />
        ))}
      </Paper>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Customer Interaction Features
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        {ALL_NAV_ITEMS.filter((item) => !item.path).map((item) => (
          <FormControlLabel
            key={item.id}
            control={
              <Checkbox
                checked={profile.navItemIds.includes(item.id)}
                onChange={() => handleToggleNavItem(item.id)}
              />
            }
            label={item.label}
          />
        ))}
      </Paper>

      {customMenuItems.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Custom Menu Items
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            {customMenuItems.map((item) => (
              <FormControlLabel
                key={item.id}
                control={
                  <Checkbox
                    checked={profile.navItemIds.includes(item.id)}
                    onChange={() => handleToggleNavItem(item.id)}
                  />
                }
                label={item.label}
              />
            ))}
          </Paper>
        </>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Members
      </Typography>
      {memberError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {memberError}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Username</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {profile.memberUserIds.map((userId) => (
              <TableRow key={userId}>
                <TableCell>{userById.get(userId)?.name ?? userId}</TableCell>
                <TableCell>{userById.get(userId)?.username ?? "—"}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleRemoveMember(userId)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {profile.memberUserIds.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography color="text.secondary">No members yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <UserAutocomplete
          label="Add member"
          value={memberToAdd}
          onChange={setMemberToAdd}
          search={(q) => listUsers({ q, limit: "20" }, authToken)}
          excludeIds={profile.memberUserIds}
        />
        <Button variant="outlined" disabled={!memberToAdd} onClick={handleAddMember}>
          Add
        </Button>
      </Stack>

      {lifecycleError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {lifecycleError}
        </Alert>
      )}
      <Stack direction="row" spacing={2}>
        <Tooltip title={lifecycleDisabledReason ?? ""}>
          <span>
            <Button
              color="warning"
              disabled={Boolean(lifecycleDisabledReason) || Boolean(profile.archivedAt)}
              onClick={handleArchive}
            >
              Archive
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={lifecycleDisabledReason ?? ""}>
          <span>
            <Button color="error" disabled={Boolean(lifecycleDisabledReason)} onClick={handleDelete}>
              Delete
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
}
