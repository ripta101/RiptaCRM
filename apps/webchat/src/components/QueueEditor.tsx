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
import type { Conversation, UserSummary, WebChatQueue } from "@riptacrm/shared-types";
import { formatDateTime, UserAutocomplete } from "@riptacrm/ui";
import {
  addQueueMember,
  assignConversation,
  getQueue,
  listConversations,
  listUsers,
  removeQueueMember,
  updateQueue,
} from "../api/client";

interface QueueEditorProps {
  queueId: string;
  onBack: () => void;
  authToken?: string | null;
}

export function QueueEditor({ queueId, onBack, authToken }: QueueEditorProps) {
  const [queue, setQueue] = useState<WebChatQueue | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [autoPopup, setAutoPopup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState<UserSummary | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [unassignedConversations, setUnassignedConversations] = useState<Conversation[]>([]);
  const [assignTo, setAssignTo] = useState<Record<string, UserSummary | null>>({});
  const [conversationError, setConversationError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getQueue(queueId, authToken)
      .then((q) =>
        Promise.all([
          listUsers({ ids: q.memberUserIds.join(",") }, authToken),
          listConversations({ assignedQueueId: queueId, unassigned: "true" }, authToken),
        ]).then(([u, conversations]) => {
          setQueue(q);
          setName(q.name);
          setAutoPopup(q.autoPopup);
          setUsers(u);
          setUnassignedConversations(conversations);
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load queue."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [queueId, authToken]);

  async function handleSaveDetails() {
    setSaving(true);
    setMemberError(null);
    try {
      const updated = await updateQueue(queueId, { name: name.trim(), autoPopup }, authToken);
      setQueue(updated);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to save queue.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember() {
    if (!memberToAdd) return;
    setMemberError(null);
    try {
      const updated = await addQueueMember(queueId, { userId: memberToAdd.id }, authToken);
      setQueue(updated);
      setUsers((prev) => (prev.some((u) => u.id === memberToAdd.id) ? prev : [...prev, memberToAdd]));
      setMemberToAdd(null);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to add member.");
    }
  }

  async function handleRemoveMember(userId: string) {
    setMemberError(null);
    try {
      await removeQueueMember(queueId, userId, authToken);
      setQueue((prev) => (prev ? { ...prev, memberUserIds: prev.memberUserIds.filter((id) => id !== userId) } : prev));
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  }

  async function handleAssign(conversationId: string) {
    const user = assignTo[conversationId];
    if (!user) return;
    setConversationError(null);
    try {
      await assignConversation(conversationId, { assignedToUserId: user.id }, authToken);
      setUnassignedConversations((prev) => prev.filter((c) => c.id !== conversationId));
    } catch (err) {
      setConversationError(err instanceof Error ? err.message : "Failed to assign conversation.");
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
  const hasChanges = name !== queue.name || autoPopup !== queue.autoPopup;

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
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} size="small" />
          <FormControlLabel
            control={<Checkbox checked={autoPopup} onChange={(e) => setAutoPopup(e.target.checked)} />}
            label="Auto-open chats routed here as an interaction tab for the assigned agent"
          />
          <Box>
            <Button variant="contained" disabled={!name.trim() || saving || !hasChanges} onClick={handleSaveDetails}>
              Save
            </Button>
          </Box>
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
        <UserAutocomplete
          label="Add member"
          value={memberToAdd}
          onChange={setMemberToAdd}
          search={(q) => listUsers({ q, limit: "20" }, authToken)}
          excludeIds={queue.memberUserIds}
        />
        <Button variant="outlined" disabled={!memberToAdd} onClick={handleAddMember}>
          Add
        </Button>
      </Stack>

      <Typography variant="subtitle2" sx={{ mt: 4, mb: 1 }}>
        Unassigned Conversations
      </Typography>
      {conversationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {conversationError}
        </Alert>
      )}
      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Page</TableCell>
              <TableCell>Started</TableCell>
              <TableCell align="right">Assign to</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {unassignedConversations.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.pageUrlPath}</TableCell>
                <TableCell>{formatDateTime(c.createdAt)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <UserAutocomplete
                      label="Assign to"
                      value={assignTo[c.id] ?? null}
                      onChange={(u) => setAssignTo((prev) => ({ ...prev, [c.id]: u }))}
                      search={(q) => listUsers({ q, limit: "20" }, authToken)}
                      minWidth={200}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={!assignTo[c.id]}
                      onClick={() => handleAssign(c.id)}
                    >
                      Assign
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {unassignedConversations.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography color="text.secondary">No unassigned conversations in this queue.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
