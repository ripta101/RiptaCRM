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
import type { CaseInstanceSummary, Queue, UserSummary } from "@riptacrm/shared-types";
import { formatDateTime, UserAutocomplete } from "@riptacrm/ui";
import {
  addQueueMember,
  assignCaseInstance,
  getQueue,
  listCaseInstances,
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
  const [queue, setQueue] = useState<Queue | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState<UserSummary | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [unassignedCases, setUnassignedCases] = useState<CaseInstanceSummary[]>([]);
  const [assignTo, setAssignTo] = useState<Record<string, string>>({});
  const [caseError, setCaseError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getQueue(queueId, authToken)
      .then((q) =>
        Promise.all([
          listUsers({ ids: q.memberUserIds.join(",") }, authToken),
          listCaseInstances({ assignedQueueId: queueId, unassigned: "true", status: "OPEN" }, authToken),
        ]).then(([u, cases]) => {
          setQueue(q);
          setName(q.name);
          setUsers(u);
          setUnassignedCases(cases);
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load queue."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [queueId, authToken]);

  async function handleSaveName() {
    setSaving(true);
    setMemberError(null);
    try {
      const updated = await updateQueue(queueId, { name: name.trim() }, authToken);
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
      const updated = await addQueueMember(queueId, { userId: memberToAdd.id }, authToken);
      setQueue(updated);
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

  async function handleAssign(caseInstanceId: string) {
    const userId = assignTo[caseInstanceId];
    if (!userId) return;
    setCaseError(null);
    try {
      await assignCaseInstance(caseInstanceId, { assignedToUserId: userId }, authToken);
      setUnassignedCases((prev) => prev.filter((c) => c.id !== caseInstanceId));
    } catch (err) {
      setCaseError(err instanceof Error ? err.message : "Failed to assign case.");
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
        Unassigned Cases in This Queue
      </Typography>
      {caseError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {caseError}
        </Alert>
      )}
      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Case Type</TableCell>
              <TableCell>Customer Account</TableCell>
              <TableCell>Opened</TableCell>
              <TableCell align="right">Assign to</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {unassignedCases.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.caseTypeName}</TableCell>
                <TableCell>{c.customerAccountId ?? "—"}</TableCell>
                <TableCell>{formatDateTime(c.createdAt)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <TextField
                      select
                      label="Assign to"
                      size="small"
                      value={assignTo[c.id] ?? ""}
                      onChange={(e) => setAssignTo((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      sx={{ minWidth: 200 }}
                    >
                      {queue.memberUserIds.map((userId) => (
                        <MenuItem key={userId} value={userId}>
                          {userById.get(userId)?.name ?? userId}
                        </MenuItem>
                      ))}
                    </TextField>
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
            {unassignedCases.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">No unassigned cases in this queue.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
