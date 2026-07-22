import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
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
import DeleteIcon from "@mui/icons-material/Delete";
import type { AgentCapacityOverride, UserSummary } from "@riptacrm/shared-types";
import { UserAutocomplete } from "@riptacrm/ui";
import { deleteCapacityOverride, listCapacityOverrides, listUsers, putCapacityOverride } from "../api/client";

interface CapacityOverrideEditorProps {
  authToken?: string | null;
}

export function CapacityOverrideEditor({ authToken }: CapacityOverrideEditorProps) {
  const [overrides, setOverrides] = useState<AgentCapacityOverride[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [agent, setAgent] = useState<UserSummary | null>(null);
  const [maxConcurrentChats, setMaxConcurrentChats] = useState(3);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listCapacityOverrides({}, authToken)
      .then((results) =>
        listUsers({ ids: results.map((o) => o.userId).join(",") }, authToken).then((u) => {
          setOverrides(results);
          setUsers(u);
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load capacity overrides."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [authToken]);

  async function handleSave() {
    if (!agent) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await putCapacityOverride(agent.id, maxConcurrentChats, authToken);
      setOverrides((prev) => [...prev.filter((o) => o.userId !== saved.userId), saved]);
      setUsers((prev) => (prev.some((u) => u.id === agent.id) ? prev : [...prev, agent]));
      setAgent(null);
      setMaxConcurrentChats(3);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save capacity override.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string) {
    setError(null);
    try {
      await deleteCapacityOverride(userId, authToken);
      setOverrides((prev) => prev.filter((o) => o.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete capacity override.");
    }
  }

  const userById = new Map(users.map((u) => [u.id, u]));

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Capacity Overrides
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Overrides the Profile-default max concurrent chats for a specific agent.
      </Typography>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && (
        <>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <UserAutocomplete
              label="Agent"
              value={agent}
              onChange={setAgent}
              search={(q) => listUsers({ q, limit: "20" }, authToken)}
            />
            <TextField
              label="Max concurrent chats"
              type="number"
              size="small"
              value={maxConcurrentChats}
              onChange={(e) => setMaxConcurrentChats(Math.max(0, parseInt(e.target.value, 10) || 0))}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <Button variant="contained" disabled={!agent || saving} onClick={handleSave}>
              Save
            </Button>
          </Stack>

          <Paper variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Agent</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Max Concurrent Chats</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {overrides.map((o) => (
                  <TableRow key={o.userId}>
                    <TableCell>{userById.get(o.userId)?.name ?? o.userId}</TableCell>
                    <TableCell>{userById.get(o.userId)?.username ?? "—"}</TableCell>
                    <TableCell>{o.maxConcurrentChats}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleDelete(o.userId)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {overrides.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography color="text.secondary">No capacity overrides yet.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}
