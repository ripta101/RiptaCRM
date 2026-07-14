import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import SaveIcon from "@mui/icons-material/Save";
import type { StageDefinition } from "@riptacrm/shared-types";
import { createStage, deleteStage, updateStage } from "../api/client";

interface StageListEditorProps {
  versionId: string;
  stages: StageDefinition[];
  editable: boolean;
  onChanged: () => void;
}

function StageRow({
  stage,
  editable,
  onChanged,
  onError,
}: {
  stage: StageDefinition;
  editable: boolean;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [slaMinutes, setSlaMinutes] = useState(String(stage.slaMinutes));
  const [isTerminal, setIsTerminal] = useState(stage.isTerminal);

  useEffect(() => {
    setSlaMinutes(String(stage.slaMinutes));
    setIsTerminal(stage.isTerminal);
  }, [stage.slaMinutes, stage.isTerminal]);

  const dirty = Number(slaMinutes) !== stage.slaMinutes || isTerminal !== stage.isTerminal;

  async function handleSave() {
    try {
      await updateStage(stage.id, { slaMinutes: Number(slaMinutes), isTerminal });
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update stage.");
    }
  }

  async function handleDelete() {
    try {
      await deleteStage(stage.id);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete stage.");
    }
  }

  return (
    <TableRow>
      <TableCell>{stage.name}</TableCell>
      <TableCell>{stage.key}</TableCell>
      <TableCell>
        {editable ? (
          <TextField
            type="number"
            size="small"
            value={slaMinutes}
            disabled={isTerminal}
            onChange={(e) => setSlaMinutes(e.target.value)}
            sx={{ width: 100 }}
          />
        ) : (
          stage.slaMinutes
        )}
      </TableCell>
      <TableCell>
        {editable ? (
          <Checkbox checked={isTerminal} onChange={(e) => setIsTerminal(e.target.checked)} />
        ) : stage.isTerminal ? (
          "Yes"
        ) : (
          "No"
        )}
      </TableCell>
      <TableCell>{stage.actions.length}</TableCell>
      {editable && (
        <TableCell align="right">
          {dirty && (
            <IconButton size="small" onClick={handleSave}>
              <SaveIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={handleDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </TableCell>
      )}
    </TableRow>
  );
}

export function StageListEditor({ versionId, stages, editable, onChanged }: StageListEditorProps) {
  const [form, setForm] = useState({ key: "", name: "", slaMinutes: "60" });
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    try {
      await createStage(versionId, {
        key: form.key.trim(),
        name: form.name.trim(),
        slaMinutes: Number(form.slaMinutes),
        displayOrder: stages.length,
      });
      setForm({ key: "", name: "", slaMinutes: "60" });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stage.");
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
              <TableCell>SLA (minutes)</TableCell>
              <TableCell>Terminal</TableCell>
              <TableCell>Actions configured</TableCell>
              {editable && <TableCell align="right" />}
            </TableRow>
          </TableHead>
          <TableBody>
            {stages
              .slice()
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((s) => (
                <StageRow key={s.id} stage={s} editable={editable} onChanged={onChanged} onError={setError} />
              ))}
            {stages.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">No stages defined yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {editable && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Add Stage
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField
              label="Key"
              size="small"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            />
            <TextField
              label="Name"
              size="small"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="SLA (minutes)"
              type="number"
              size="small"
              value={form.slaMinutes}
              onChange={(e) => setForm((f) => ({ ...f, slaMinutes: e.target.value }))}
              sx={{ width: 140 }}
            />
            <Button variant="contained" disabled={!form.key.trim() || !form.name.trim()} onClick={handleAdd}>
              Add
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
