import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
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
import type { AgentStatusOption } from "@riptacrm/shared-types";
import { createAgentStatusOption, deleteAgentStatusOption, listAgentStatusOptions } from "../api/client";

interface AgentStatusOptionEditorProps {
  authToken?: string | null;
}

export function AgentStatusOptionEditor({ authToken }: AgentStatusOptionEditorProps) {
  const [options, setOptions] = useState<AgentStatusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [isAvailableForChats, setIsAvailableForChats] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listAgentStatusOptions(authToken)
      .then(setOptions)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load agent statuses."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [authToken]);

  async function handleSave() {
    if (!label.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createAgentStatusOption({ label: label.trim(), isAvailableForChats }, authToken);
      setOptions((prev) => [...prev, created].sort((a, b) => a.label.localeCompare(b.label)));
      setLabel("");
      setIsAvailableForChats(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save status.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteAgentStatusOption(id, authToken);
      setOptions((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete status.");
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Agent Statuses
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        The statuses agents can pick from (e.g. Available, Lunch, Administration). Only statuses marked "Available
        for chats" let an agent auto-receive or claim a conversation — every agent's status is cleared on login and
        logout, so they must pick one each session.
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
            <TextField label="Label" size="small" value={label} onChange={(e) => setLabel(e.target.value)} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isAvailableForChats}
                  onChange={(e) => setIsAvailableForChats(e.target.checked)}
                />
              }
              label="Available for chats"
            />
            <Button variant="contained" disabled={!label.trim() || saving} onClick={handleSave}>
              Add
            </Button>
          </Stack>

          <Paper variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Label</TableCell>
                  <TableCell>Available for chats</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {options.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.label}</TableCell>
                    <TableCell>{o.isAvailableForChats ? "Yes" : "No"}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleDelete(o.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {options.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography color="text.secondary">No statuses configured yet.</Typography>
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
