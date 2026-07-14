import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import type { ActionTrigger, RecipientMode, StageDefinition } from "@riptacrm/shared-types";
import { createAction, deleteAction } from "../api/client";

const TRIGGER_LABELS: Record<ActionTrigger, string> = {
  BEFORE_BREACH: "Before Breach",
  AT_BREACH: "At Breach",
  AFTER_BREACH: "After Breach",
};

interface ActionListEditorProps {
  stages: StageDefinition[];
  editable: boolean;
  onChanged: () => void;
}

function StageActions({
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
  const [form, setForm] = useState({
    trigger: "AT_BREACH" as ActionTrigger,
    offsetMinutes: "0",
    recipientMode: "CASE_CONTACT" as RecipientMode,
    recipientValue: "",
    subjectTemplate: "",
    bodyTemplate: "",
  });

  async function handleAdd() {
    try {
      await createAction(stage.id, {
        trigger: form.trigger,
        offsetMinutes: form.trigger === "AT_BREACH" ? 0 : Number(form.offsetMinutes),
        config: {
          subjectTemplate: form.subjectTemplate,
          bodyTemplate: form.bodyTemplate,
          recipientMode: form.recipientMode,
          recipientValue: form.recipientMode === "STATIC" ? form.recipientValue.trim() : undefined,
        },
      });
      setForm({
        trigger: "AT_BREACH",
        offsetMinutes: "0",
        recipientMode: "CASE_CONTACT",
        recipientValue: "",
        subjectTemplate: "",
        bodyTemplate: "",
      });
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to add action.");
    }
  }

  async function handleDelete(actionId: string) {
    try {
      await deleteAction(actionId);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete action.");
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {stage.name}
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Trigger</TableCell>
            <TableCell>Offset (min)</TableCell>
            <TableCell>Recipient</TableCell>
            <TableCell>Subject</TableCell>
            {editable && <TableCell align="right" />}
          </TableRow>
        </TableHead>
        <TableBody>
          {stage.actions.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <Chip size="small" label={TRIGGER_LABELS[a.trigger]} />
              </TableCell>
              <TableCell>{a.offsetMinutes}</TableCell>
              <TableCell>
                {a.config.recipientMode === "STATIC" ? a.config.recipientValue : "Case contact"}
              </TableCell>
              <TableCell>{a.config.subjectTemplate}</TableCell>
              {editable && (
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleDelete(a.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
          {stage.actions.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
                <Typography color="text.secondary" variant="body2">
                  No actions configured for this stage.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {editable && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField
              label="Trigger"
              select
              size="small"
              sx={{ minWidth: 160 }}
              value={form.trigger}
              onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value as ActionTrigger }))}
            >
              {(Object.keys(TRIGGER_LABELS) as ActionTrigger[]).map((t) => (
                <MenuItem key={t} value={t}>
                  {TRIGGER_LABELS[t]}
                </MenuItem>
              ))}
            </TextField>
            {form.trigger !== "AT_BREACH" && (
              <TextField
                label="Offset (min)"
                type="number"
                size="small"
                sx={{ width: 130 }}
                value={form.offsetMinutes}
                onChange={(e) => setForm((f) => ({ ...f, offsetMinutes: e.target.value }))}
              />
            )}
            <TextField
              label="Recipient"
              select
              size="small"
              sx={{ minWidth: 160 }}
              value={form.recipientMode}
              onChange={(e) => setForm((f) => ({ ...f, recipientMode: e.target.value as RecipientMode }))}
            >
              <MenuItem value="CASE_CONTACT">Case contact</MenuItem>
              <MenuItem value="STATIC">Static address</MenuItem>
            </TextField>
            {form.recipientMode === "STATIC" && (
              <TextField
                label="Recipient address"
                size="small"
                value={form.recipientValue}
                onChange={(e) => setForm((f) => ({ ...f, recipientValue: e.target.value }))}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <TextField
              label="Subject template"
              size="small"
              value={form.subjectTemplate}
              onChange={(e) => setForm((f) => ({ ...f, subjectTemplate: e.target.value }))}
              sx={{ flexGrow: 1, minWidth: 240 }}
            />
            <TextField
              label="Body template"
              size="small"
              value={form.bodyTemplate}
              onChange={(e) => setForm((f) => ({ ...f, bodyTemplate: e.target.value }))}
              sx={{ flexGrow: 1, minWidth: 240 }}
            />
            <Button
              variant="contained"
              disabled={!form.subjectTemplate.trim() || !form.bodyTemplate.trim()}
              onClick={handleAdd}
            >
              Add Action
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Use {"{{caseId}}"}, {"{{stageName}}"}, {"{{dueAt}}"} as placeholders.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export function ActionListEditor({ stages, editable, onChanged }: ActionListEditorProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {stages
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((stage) => (
          <StageActions
            key={stage.id}
            stage={stage}
            editable={editable}
            onChanged={onChanged}
            onError={setError}
          />
        ))}
      {stages.length === 0 && <Typography color="text.secondary">Add stages first to configure actions.</Typography>}
    </Box>
  );
}
