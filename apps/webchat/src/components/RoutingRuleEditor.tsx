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
import EditIcon from "@mui/icons-material/Edit";
import type { RoutingRule, RoutingRuleMatchType, WebChatQueue } from "@riptacrm/shared-types";
import { createRoutingRule, deleteRoutingRule, listRoutingRules, updateRoutingRule } from "../api/client";

interface RoutingRuleEditorProps {
  siteId: string;
  queues: WebChatQueue[];
  authToken?: string | null;
}

interface RuleFormState {
  pattern: string;
  matchType: RoutingRuleMatchType;
  priority: number;
  autoReplyText: string;
  targetQueueId: string;
  isActive: boolean;
}

const EMPTY_FORM: RuleFormState = {
  pattern: "",
  matchType: "EXACT",
  priority: 0,
  autoReplyText: "",
  targetQueueId: "",
  isActive: true,
};

export function RoutingRuleEditor({ siteId, queues, authToken }: RoutingRuleEditorProps) {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const queueById = new Map(queues.map((q) => [q.id, q]));

  function load() {
    setLoading(true);
    listRoutingRules(siteId, authToken)
      .then(setRules)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load routing rules."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [siteId, authToken]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, targetQueueId: queues[0]?.id ?? "" });
    setSaveError(null);
    setDialogOpen(true);
  }

  function openEdit(rule: RoutingRule) {
    setEditingId(rule.id);
    setForm({
      pattern: rule.pattern,
      matchType: rule.matchType,
      priority: rule.priority,
      autoReplyText: rule.autoReplyText,
      targetQueueId: rule.targetQueueId,
      isActive: rule.isActive,
    });
    setSaveError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      if (editingId) {
        const updated = await updateRoutingRule(
          editingId,
          {
            pattern: form.pattern.trim(),
            matchType: form.matchType,
            priority: form.priority,
            autoReplyText: form.autoReplyText.trim(),
            targetQueueId: form.targetQueueId,
            isActive: form.isActive,
          },
          authToken,
        );
        setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createRoutingRule(
          {
            siteId,
            pattern: form.pattern.trim(),
            matchType: form.matchType,
            priority: form.priority,
            autoReplyText: form.autoReplyText.trim(),
            targetQueueId: form.targetQueueId,
            isActive: form.isActive,
          },
          authToken,
        );
        setRules((prev) => [...prev, created]);
      }
      setDialogOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save routing rule.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteRoutingRule(id, authToken);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete routing rule.");
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2">Routing Rules</Typography>
        <Button size="small" variant="outlined" onClick={openCreate} disabled={queues.length === 0}>
          New Rule
        </Button>
      </Box>
      {queues.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Create a queue first before adding routing rules.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Pattern</TableCell>
              <TableCell>Match Type</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Target Queue</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.pattern}</TableCell>
                <TableCell>{r.matchType}</TableCell>
                <TableCell>{r.priority}</TableCell>
                <TableCell>{queueById.get(r.targetQueueId)?.name ?? r.targetQueueId}</TableCell>
                <TableCell>
                  {r.isActive ? <Chip size="small" color="success" label="Active" /> : <Chip size="small" label="Inactive" />}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(r)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(r.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">No routing rules for this site yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? "Edit Routing Rule" : "New Routing Rule"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField
              label="Pattern"
              value={form.pattern}
              onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))}
              helperText="URL path to match, e.g. /pricing"
              fullWidth
            />
            <TextField
              select
              label="Match Type"
              value={form.matchType}
              onChange={(e) => setForm((f) => ({ ...f, matchType: e.target.value as RoutingRuleMatchType }))}
              fullWidth
            >
              <MenuItem value="EXACT">Exact</MenuItem>
              <MenuItem value="PREFIX">Prefix</MenuItem>
            </TextField>
            <TextField
              label="Priority"
              type="number"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value, 10) || 0 }))}
              slotProps={{ htmlInput: { min: 0 } }}
              helperText="Lower numbers are evaluated first."
              fullWidth
            />
            <TextField
              label="Auto-reply Text"
              value={form.autoReplyText}
              onChange={(e) => setForm((f) => ({ ...f, autoReplyText: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              select
              label="Target Queue"
              value={form.targetQueueId}
              onChange={(e) => setForm((f) => ({ ...f, targetQueueId: e.target.value }))}
              fullWidth
            >
              {queues.map((q) => (
                <MenuItem key={q.id} value={q.id}>
                  {q.name}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.pattern.trim() || !form.autoReplyText.trim() || !form.targetQueueId || saving}
            onClick={handleSave}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
