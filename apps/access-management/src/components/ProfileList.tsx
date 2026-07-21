import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type { DashboardType, Profile } from "@riptacrm/shared-types";
import { createProfile, listProfiles } from "../api/client";

interface ProfileListProps {
  onSelect: (profileId: string) => void;
  authToken?: string | null;
}

export function ProfileList({ onSelect, authToken }: ProfileListProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [dashboardType, setDashboardType] = useState<DashboardType>("frontline");
  const [canStartInteractions, setCanStartInteractions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listProfiles(showArchived ? { includeArchived: "true" } : {}, authToken)
      .then(setProfiles)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [showArchived, authToken]);

  async function handleCreate() {
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createProfile({ name: name.trim(), dashboardType, canStartInteractions }, authToken);
      setDialogOpen(false);
      setName("");
      setDashboardType("frontline");
      setCanStartInteractions(false);
      onSelect(created.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to create profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Profiles</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={<Checkbox checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />}
            label="Show archived"
          />
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            New Profile
          </Button>
        </Stack>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <Paper variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Dashboard</TableCell>
                <TableCell>Members</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id} hover sx={{ cursor: "pointer" }} onClick={() => onSelect(p.id)}>
                  <TableCell>
                    {p.name}
                    {p.isProtected && <Chip size="small" label="Protected" sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell>{p.dashboardType === "admin" ? "Admin" : "Frontline"}</TableCell>
                  <TableCell>{p.memberUserIds.length}</TableCell>
                  <TableCell align="right">
                    {p.archivedAt && <Chip size="small" color="warning" label="Archived" />}
                  </TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography color="text.secondary">No profiles yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Profile</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField
              select
              label="Dashboard"
              value={dashboardType}
              onChange={(e) => setDashboardType(e.target.value as DashboardType)}
              fullWidth
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!name.trim() || saving} onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
