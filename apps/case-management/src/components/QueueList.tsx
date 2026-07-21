import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import type { Queue } from "@riptacrm/shared-types";
import { createQueue, listQueues } from "../api/client";

interface QueueListProps {
  onSelect: (queueId: string) => void;
  authToken?: string | null;
}

export function QueueList({ onSelect, authToken }: QueueListProps) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listQueues(authToken)
      .then(setQueues)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [authToken]);

  async function handleCreate() {
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createQueue({ name: name.trim() }, authToken);
      setDialogOpen(false);
      setName("");
      onSelect(created.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to create queue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Queues</Typography>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          New Queue
        </Button>
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
                <TableCell>Members</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queues.map((q) => (
                <TableRow key={q.id} hover sx={{ cursor: "pointer" }} onClick={() => onSelect(q.id)}>
                  <TableCell>{q.name}</TableCell>
                  <TableCell>{q.memberUserIds.length}</TableCell>
                </TableRow>
              ))}
              {queues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Typography color="text.secondary">No queues yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Queue</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
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
