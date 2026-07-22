import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import type { Site, WebChatQueue } from "@riptacrm/shared-types";
import { getSite, listQueues, regenerateSiteKey, updateSite } from "../api/client";
import { RoutingRuleEditor } from "./RoutingRuleEditor";

interface SiteEditorProps {
  siteId: string;
  onBack: () => void;
  authToken?: string | null;
}

// Hardcoded to match the widget-loader package's dev port (a separate, later piece of work).
const WIDGET_LOADER_URL = "http://localhost:5179/loader.js";

export function SiteEditor({ siteId, onBack, authToken }: SiteEditorProps) {
  const [site, setSite] = useState<Site | null>(null);
  const [queues, setQueues] = useState<WebChatQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [allowedOrigins, setAllowedOrigins] = useState("");
  const [defaultQueueId, setDefaultQueueId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "snippet" | null>(null);

  function load() {
    setLoading(true);
    Promise.all([getSite(siteId, authToken), listQueues(authToken)])
      .then(([s, q]) => {
        setSite(s);
        setQueues(q);
        setName(s.name);
        setAllowedOrigins(s.allowedOrigins ?? "");
        setDefaultQueueId(s.defaultQueueId ?? "");
        setIsActive(s.isActive);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load site."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [siteId, authToken]);

  async function handleSaveDetails() {
    setSaving(true);
    setDetailsError(null);
    try {
      const updated = await updateSite(
        siteId,
        {
          name: name.trim(),
          allowedOrigins: allowedOrigins.trim() || null,
          defaultQueueId: defaultQueueId || null,
          isActive,
        },
        authToken,
      );
      setSite(updated);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to save site.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateKey() {
    setRegenerating(true);
    setRegenError(null);
    try {
      const updated = await regenerateSiteKey(siteId, authToken);
      setSite(updated);
      setRegenDialogOpen(false);
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : "Failed to regenerate key.");
    } finally {
      setRegenerating(false);
    }
  }

  function copyToClipboard(value: string, kind: "key" | "snippet") {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(kind);
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(() => {
        /* clipboard access denied — user can still select and copy manually */
      });
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !site) {
    return <Alert severity="error">{error ?? "Site not found."}</Alert>;
  }

  const embedSnippet = `<script src="${WIDGET_LOADER_URL}" data-site-key="${site.siteKey}"></script>`;
  const hasChanges =
    name !== site.name ||
    allowedOrigins !== (site.allowedOrigins ?? "") ||
    defaultQueueId !== (site.defaultQueueId ?? "") ||
    isActive !== site.isActive;

  return (
    <Box>
      <Button onClick={onBack} sx={{ mb: 2 }}>
        Back to Sites
      </Button>

      {detailsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {detailsError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} size="small" />
          <TextField
            label="Allowed Origins"
            value={allowedOrigins}
            onChange={(e) => setAllowedOrigins(e.target.value)}
            size="small"
            helperText="Comma-separated origins allowed to embed this site's widget, e.g. https://example.com"
          />
          <TextField
            select
            label="Default Queue"
            value={defaultQueueId}
            onChange={(e) => setDefaultQueueId(e.target.value)}
            size="small"
            helperText="Where conversations from this site land when no routing rule matches."
          >
            <MenuItem value="">None</MenuItem>
            {queues.map((q) => (
              <MenuItem key={q.id} value={q.id}>
                {q.name}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
            label="Active"
          />
          <Box>
            <Button variant="contained" disabled={!name.trim() || saving || !hasChanges} onClick={handleSaveDetails}>
              Save
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Embed
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        {regenError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {regenError}
          </Alert>
        )}
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField label="Site Key" value={site.siteKey} size="small" fullWidth slotProps={{ input: { readOnly: true } }} />
            <Button
              size="small"
              startIcon={<ContentCopyIcon fontSize="small" />}
              onClick={() => copyToClipboard(site.siteKey, "key")}
            >
              {copied === "key" ? "Copied" : "Copy"}
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Embed Snippet"
              value={embedSnippet}
              size="small"
              fullWidth
              slotProps={{ input: { readOnly: true } }}
            />
            <Button
              size="small"
              startIcon={<ContentCopyIcon fontSize="small" />}
              onClick={() => copyToClipboard(embedSnippet, "snippet")}
            >
              {copied === "snippet" ? "Copied" : "Copy"}
            </Button>
          </Stack>
          <Box>
            <Button color="warning" variant="outlined" onClick={() => setRegenDialogOpen(true)}>
              Regenerate Key
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <RoutingRuleEditor siteId={siteId} queues={queues} authToken={authToken} />

      <Dialog open={regenDialogOpen} onClose={() => setRegenDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Regenerate Site Key?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This invalidates the current site key immediately. The embed snippet on this site's web pages will stop
            working until it is updated with the new key. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenDialogOpen(false)}>Cancel</Button>
          <Button color="warning" variant="contained" disabled={regenerating} onClick={handleRegenerateKey}>
            Regenerate Key
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
