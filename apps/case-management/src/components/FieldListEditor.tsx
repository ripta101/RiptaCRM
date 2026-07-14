import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import type { FieldDefinition, FieldType } from "@riptacrm/shared-types";
import { createField, deleteField } from "../api/client";

const FIELD_TYPES: FieldType[] = ["TEXT", "NUMBER", "DATE", "SELECT", "TEXTAREA", "CHECKBOX"];

interface FieldListEditorProps {
  versionId: string;
  fields: FieldDefinition[];
  editable: boolean;
  onChanged: () => void;
}

export function FieldListEditor({ versionId, fields, editable, onChanged }: FieldListEditorProps) {
  const [form, setForm] = useState({
    fieldKey: "",
    name: "",
    fieldType: "TEXT" as FieldType,
    required: false,
    options: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    try {
      await createField(versionId, {
        fieldKey: form.fieldKey.trim(),
        name: form.name.trim(),
        fieldType: form.fieldType,
        required: form.required,
        options:
          form.fieldType === "SELECT"
            ? form.options.split(",").map((o) => o.trim()).filter(Boolean)
            : undefined,
        displayOrder: fields.length,
      });
      setForm({ fieldKey: "", name: "", fieldType: "TEXT", required: false, options: "" });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add field.");
    }
  }

  async function handleDelete(fieldId: string) {
    setError(null);
    try {
      await deleteField(fieldId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete field.");
    }
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Key</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Required</TableCell>
              <TableCell>Options</TableCell>
              {editable && <TableCell align="right" />}
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.name}</TableCell>
                <TableCell>{f.fieldKey}</TableCell>
                <TableCell>{f.fieldType}</TableCell>
                <TableCell>{f.required ? "Yes" : "No"}</TableCell>
                <TableCell>{f.options?.join(", ") ?? "—"}</TableCell>
                {editable && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleDelete(f.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {fields.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">No fields defined yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {editable && (
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
              label="Name"
              size="small"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
            <Button
              variant="contained"
              disabled={!form.fieldKey.trim() || !form.name.trim()}
              onClick={handleAdd}
            >
              Add
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
