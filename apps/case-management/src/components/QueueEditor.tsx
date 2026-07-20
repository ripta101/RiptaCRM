import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import type { Queue, UserSummary } from "@riptacrm/shared-types";
import { addQueueMember, getQueue, listUsers, removeQueueMember, updateQueue } from "../api/client";

interface QueueEditorProps {
  queueId: string;
  onBack: () => void;
}

export function QueueEditor({ queueId, onBack }: QueueEditorProps) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([getQueue(queueId), listUsers()])
      .then(([q, u]) => {
        setQueue(q);
        setName(q.name);
        setUsers(u);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load queue."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [queueId]);

  async function handleSaveName() {
    setSaving(true);
    setMemberError(null);
    try {
      const updated = await updateQueue(queueId, { name: name.trim() });
      setQueue(updated);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to rename queue.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember() {
    if (!memberToAdd) return;
    setMemberError(null);
    try {
      const updated = await addQueueMember(queueId, { userId: memberToAdd });
      setQueue(updated);
      setMemberToAdd("");
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to add member.");
    }
  }

  async function handleRemoveMember(userId: string) {
    setMemberError(null);
    try {
      await removeQueueMember(queueId, userId);
      setQueue((prev) => (prev ? { ...prev, memberUserIds: prev.memberUserIds.filter((id) => id !== userId) } : prev));
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !queue) {
    return <Alert severity="error">{error ?? "Queue not found."}</Alert>;
  }

  const userById = new Map(users.map((u) => [u.id, u]));
  const availableUsers = users.filter((u) => !queue.memberUserIds.includes(u.id));

  return (
    <Box>
      <Button onClick={onBack} sx={{ mb: 2 }}>
        Back to Queues
      </Button>

      {memberError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {memberError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} size="small" />
          <Button
            variant="contained"
            disabled={!name.trim() || name === queue.name || saving}
            onClick={handleSaveName}
          >
            Save
          </Button>
        </Stack>
      </Paper>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Members
      </Typography>
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
            {queue.memberUserIds.map((userId) => (
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
            {queue.memberUserIds.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography color="text.secondary">No members yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          select
          label="Add member"
          size="small"
          value={memberToAdd}
          onChange={(e) => setMemberToAdd(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          {availableUsers.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.name} ({u.username})
            </MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" disabled={!memberToAdd} onClick={handleAddMember}>
          Add
        </Button>
      </Stack>
    </Box>
  );
}
