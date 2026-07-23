import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
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
import type { FieldType, PreChatFieldDefinition } from "@riptacrm/shared-types";
import { createPreChatField, deletePreChatField, listPreChatFields } from "../api/client";

const FIELD_TYPES: FieldType[] = ["TEXT", "NUMBER", "DATE", "SELECT", "TEXTAREA", "CHECKBOX"];

interface PreChatFieldEditorProps {
  siteId: string;
  authToken?: string | null;
}

// Asked of a visitor before their first conversation on this site begins — no draft/publish
// gate like Case Management's fields (always live), so this is simpler than FieldListEditor.
export function PreChatFieldEditor({ siteId, authToken }: PreChatFieldEditorProps) {
  const [fields, setFields] = useState<PreChatFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fieldKey: "",
    label: "",
    fieldType: "TEXT" as FieldType,
    required: false,
    options: "",
  });

  function load() {
    setLoading(true);
    listPreChatFields(siteId, authToken)
      .then(setFields)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load pre-chat fields."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [siteId, authToken]);

  async function handleAdd() {
    setError(null);
    try {
      const created = await createPreChatField(
        {
          siteId,
          fieldKey: form.fieldKey.trim(),
          label: form.label.trim(),
          fieldType: form.fieldType,
          required: form.required,
          options:
            form.fieldType === "SELECT"
              ? form.options.split(",").map((o) => o.trim()).filter(Boolean)
              : undefined,
          displayOrder: fields.length,
        },
        authToken,
      );
      setFields((prev) => [...prev, created]);
      setForm({ fieldKey: "", label: "", fieldType: "TEXT", required: false, options: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add field.");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deletePreChatField(id, authToken);
      setFields((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete field.");
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
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Pre-chat Fields
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Asked of a visitor before a new conversation starts on this site. Leave empty to skip the pre-chat form
        entirely.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Label</TableCell>
              <TableCell>Key</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Required</TableCell>
              <TableCell>Options</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.label}</TableCell>
                <TableCell>{f.fieldKey}</TableCell>
                <TableCell>{f.fieldType}</TableCell>
                <TableCell>{f.required ? "Yes" : "No"}</TableCell>
                <TableCell>{f.options?.join(", ") ?? "—"}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleDelete(f.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {fields.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">No pre-chat fields configured yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Add Field
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          <TextField
            label="Key"
            size="small"
            value={form.fieldKey}
            onChange={(e) => setForm((f) => ({ ...f, fieldKey: e.target.value }))}
          />
          <TextField
            label="Label"
            size="small"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
          <TextField
            label="Type"
            select
            size="small"
            sx={{ minWidth: 140 }}
            value={form.fieldType}
            onChange={(e) => setForm((f) => ({ ...f, fieldType: e.target.value as FieldType }))}
          >
            {FIELD_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          {form.fieldType === "SELECT" && (
            <TextField
              label="Options (comma separated)"
              size="small"
              value={form.options}
              onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
              sx={{ minWidth: 220 }}
            />
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={form.required}
                onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
              />
            }
            label="Required"
          />
          <Button variant="contained" disabled={!form.fieldKey.trim() || !form.label.trim()} onClick={handleAdd}>
            Add
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
