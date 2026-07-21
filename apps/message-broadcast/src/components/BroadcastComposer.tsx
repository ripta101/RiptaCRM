import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { BroadcastPriority, Profile } from "@riptacrm/shared-types";
import {
  cancelBroadcast,
  createBroadcast,
  deleteBroadcast,
  getBroadcast,
  listProfiles,
  updateBroadcast,
} from "../api/client";
import { getBroadcastStatus } from "../lib/broadcastStatus";
import { RichTextEditor } from "./RichTextEditor";

interface BroadcastComposerProps {
  authToken?: string | null;
  broadcastId: string | null;
  onDone: () => void;
}

interface FormState {
  title: string;
  bodyHtml: string;
  targetProfileIds: string[];
  priority: BroadcastPriority | "";
  startAt: string;
  endAt: string;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(local: string): string {
  return new Date(local).toISOString();
}

function defaultForm(): FormState {
  const now = new Date();
  // Default to "active right away" (start a minute in the past to absorb clock skew
  // between filling the form and submitting it) — most broadcasts are meant to be seen
  // immediately, not scheduled, so that's the friendlier default to start editing from.
  const aMinuteAgo = new Date(now.getTime() - 60_000);
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60_000);
  return {
    title: "",
    bodyHtml: "",
    targetProfileIds: [],
    priority: "",
    startAt: toDatetimeLocal(aMinuteAgo.toISOString()),
    endAt: toDatetimeLocal(inOneWeek.toISOString()),
  };
}

export function BroadcastComposer({ authToken, broadcastId, onDone }: BroadcastComposerProps) {
  const [form, setForm] = useState<FormState>(defaultForm());
  const [loading, setLoading] = useState(Boolean(broadcastId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    listProfiles(authToken)
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, [authToken]);

  useEffect(() => {
    if (!broadcastId) return;
    getBroadcast(broadcastId, authToken)
      .then((b) => {
        setForm({
          title: b.title,
          bodyHtml: b.bodyHtml,
          targetProfileIds: b.targetProfileIds,
          priority: b.priority ?? "",
          startAt: toDatetimeLocal(b.startAt),
          endAt: toDatetimeLocal(b.endAt),
        });
        setStatus(getBroadcastStatus(b));
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [broadcastId, authToken]);

  function toggleProfile(profileId: string) {
    setForm((f) => ({
      ...f,
      targetProfileIds: f.targetProfileIds.includes(profileId)
        ? f.targetProfileIds.filter((id) => id !== profileId)
        : [...f.targetProfileIds, profileId],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const input = {
        title: form.title.trim(),
        bodyHtml: form.bodyHtml,
        targetProfileIds: form.targetProfileIds,
        priority: form.priority || undefined,
        startAt: fromDatetimeLocal(form.startAt),
        endAt: fromDatetimeLocal(form.endAt),
      };
      if (broadcastId) {
        await updateBroadcast(broadcastId, input, authToken);
      } else {
        await createBroadcast(input, authToken);
      }
      onDone();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save broadcast.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelBroadcast() {
    if (!broadcastId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await cancelBroadcast(broadcastId, authToken);
      onDone();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to cancel broadcast.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!broadcastId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await deleteBroadcast(broadcastId, authToken);
      onDone();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete broadcast.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  const canSave = form.title.trim() && form.bodyHtml.trim() && form.targetProfileIds.length > 0 && !saving;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {broadcastId ? "Edit Broadcast" : "New Broadcast"}
      </Typography>
      <Stack spacing={2} sx={{ maxWidth: 720 }}>
        {saveError && <Alert severity="error">{saveError}</Alert>}
        {status === "Canceled" && (
          <Alert severity="warning">
            This broadcast is canceled. Editing it will not make it visible again.
          </Alert>
        )}

        <TextField
          label="Title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          fullWidth
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Message
          </Typography>
          <RichTextEditor content={form.bodyHtml} onChange={(html) => setForm((f) => ({ ...f, bodyHtml: html }))} />
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Target profiles
          </Typography>
          {profiles.map((profile) => (
            <FormControlLabel
              key={profile.id}
              control={
                <Checkbox
                  checked={form.targetProfileIds.includes(profile.id)}
                  onChange={() => toggleProfile(profile.id)}
                />
              }
              label={profile.name}
            />
          ))}
        </Box>

        <FormControl fullWidth>
          <InputLabel id="priority-label">Priority</InputLabel>
          <Select
            labelId="priority-label"
            label="Priority"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as BroadcastPriority | "" }))}
          >
            <MenuItem value="">None</MenuItem>
            <MenuItem value="LOW">Low</MenuItem>
            <MenuItem value="NORMAL">Normal</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
          </Select>
        </FormControl>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Start"
            type="datetime-local"
            value={form.startAt}
            onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="End"
            type="datetime-local"
            value={form.endAt}
            onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
          <Button onClick={onDone}>Back</Button>
          {broadcastId && status !== "Canceled" && (
            <Button color="warning" onClick={handleCancelBroadcast} disabled={saving}>
              Cancel Broadcast
            </Button>
          )}
          {broadcastId && (
            <Button color="error" onClick={handleDelete} disabled={saving}>
              Delete
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
