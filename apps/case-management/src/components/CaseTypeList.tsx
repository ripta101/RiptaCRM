import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import type { CaseTypeSummary } from "@riptacrm/shared-types";
import { createCaseType, listCaseTypes } from "../api/client";

interface CaseTypeListProps {
  onSelect: (caseTypeId: string) => void;
  authToken?: string | null;
}

export function CaseTypeList({ onSelect, authToken }: CaseTypeListProps) {
  const [caseTypes, setCaseTypes] = useState<CaseTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ key: "", name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listCaseTypes(authToken)
      .then(setCaseTypes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [authToken]);

  async function handleCreate() {
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createCaseType(
        {
          key: form.key.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        },
        authToken,
      );
      setDialogOpen(false);
      setForm({ key: "", name: "", description: "" });
      onSelect(created.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to create case type.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Case Types</Typography>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          New Case Type
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
                <TableCell>Key</TableCell>
                <TableCell>Version status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {caseTypes.map((ct) => (
                <TableRow key={ct.id} hover sx={{ cursor: "pointer" }} onClick={() => onSelect(ct.id)}>
                  <TableCell>{ct.name}</TableCell>
                  <TableCell>{ct.key}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {ct.publishedVersion && (
                        <Chip size="small" color="success" label={`Published v${ct.publishedVersion.versionNumber}`} />
                      )}
                      {ct.draftVersion && (
                        <Chip size="small" color="warning" label={`Draft v${ct.draftVersion.versionNumber}`} />
                      )}
                      {!ct.publishedVersion && !ct.draftVersion && (
                        <Chip size="small" label="No version" />
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {caseTypes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography color="text.secondary">No case types yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Case Type</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField
              label="Key"
              helperText="Stable identifier, e.g. complaint"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.key.trim() || !form.name.trim() || saving}
            onClick={handleCreate}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
