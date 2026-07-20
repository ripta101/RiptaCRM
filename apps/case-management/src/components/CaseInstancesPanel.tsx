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
import type {
  CaseInstanceSummary,
  CaseTypeVersionDetail,
  CaseTypeVersionSummary,
} from "@riptacrm/shared-types";
import {
  createCaseInstance,
  deleteCaseInstance,
  getCaseTypeVersion,
  listCaseInstances,
  transitionCaseInstance,
} from "../api/client";
import { DynamicFieldForm, formatDateTime } from "@riptacrm/ui";

interface CaseInstancesPanelProps {
  caseTypeId: string;
  publishedVersion: CaseTypeVersionSummary | null;
}

function AdvanceCell({
  instance,
  version,
  onChanged,
  onError,
}: {
  instance: CaseInstanceSummary;
  version: CaseTypeVersionDetail | undefined;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [toStageId, setToStageId] = useState("");

  if (instance.status === "CLOSED" || !version) return <>—</>;

  const currentStage = version.stages.find((s) => s.id === instance.currentStageId);
  const allowedNextStages = currentStage?.allowedNextStages ?? [];
  if (allowedNextStages.length === 0) return <>—</>;

  async function handleGo() {
    if (!toStageId) return;
    try {
      await transitionCaseInstance(instance.id, { toStageId });
      setToStageId("");
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to advance case.");
    }
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <TextField
        select
        size="small"
        value={toStageId}
        onChange={(e) => setToStageId(e.target.value)}
        sx={{ minWidth: 140 }}
      >
        {allowedNextStages.map((t) => {
          const target = version.stages.find((s) => s.id === t.toStageId);
          return (
            <MenuItem key={t.id} value={t.toStageId}>
              {target?.name ?? t.toStageId}
            </MenuItem>
          );
        })}
      </TextField>
      <Button size="small" variant="outlined" disabled={!toStageId} onClick={handleGo}>
        Go
      </Button>
    </Stack>
  );
}

export function CaseInstancesPanel({ caseTypeId, publishedVersion }: CaseInstancesPanelProps) {
  const [instances, setInstances] = useState<CaseInstanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versionCache, setVersionCache] = useState<Record<string, CaseTypeVersionDetail>>({});
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [versionDetail, setVersionDetail] = useState<CaseTypeVersionDetail | null>(null);
  const [values, setValues] = useState<Record<string, string | number | boolean | null>>({});
  const [customerAccountId, setCustomerAccountId] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const results = await listCaseInstances({ caseTypeId });
      setInstances(results);

      const uncachedVersionIds = [...new Set(results.map((i) => i.caseTypeVersionId))].filter(
        (id) => !versionCache[id],
      );
      if (uncachedVersionIds.length > 0) {
        const fetched = await Promise.all(uncachedVersionIds.map((id) => getCaseTypeVersion(id)));
        setVersionCache((cache) => {
          const next = { ...cache };
          for (const v of fetched) next[v.id] = v;
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load case instances.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [caseTypeId]);

  async function openDialog() {
    if (!publishedVersion) return;
    const detail = await getCaseTypeVersion(publishedVersion.id);
    setVersionDetail(detail);
    setValues({});
    setCustomerAccountId("");
    setAssignedToUserId("");
    setContactEmail("");
    setSaveError(null);
    setDialogOpen(true);
  }

  async function handleCreate() {
    if (!versionDetail) return;
    setSaveError(null);
    try {
      await createCaseInstance({
        caseTypeId,
        customerAccountId: customerAccountId.trim() || undefined,
        assignedToUserId: assignedToUserId.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        fieldValues: versionDetail.fields.map((f) => ({
          fieldDefinitionId: f.id,
          value: values[f.id] ?? null,
        })),
      });
      setDialogOpen(false);
      load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to create case instance.");
    }
  }

  async function handleDelete(id: string) {
    await deleteCaseInstance(id);
    load();
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Test case instances, for exercising the SLA engine — not the frontline case-working experience.
        </Typography>
        <Button variant="contained" disabled={!publishedVersion} onClick={openDialog}>
          Create Test Instance
        </Button>
      </Box>

      {!publishedVersion && <Alert severity="info">Publish a version before creating case instances.</Alert>}
      {advanceError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAdvanceError(null)}>
          {advanceError}
        </Alert>
      )}

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
                <TableCell>ID</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>SLA due</TableCell>
                <TableCell>Assigned to</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Advance</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {instances.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.id.slice(0, 8)}</TableCell>
                  <TableCell>{i.currentStageName}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Chip size="small" label={i.status} />
                      {i.breached && <Chip size="small" color="error" label="Breached" />}
                    </Stack>
                  </TableCell>
                  <TableCell>{formatDateTime(i.slaDueAt)}</TableCell>
                  <TableCell>{i.assignedToUserId ?? "—"}</TableCell>
                  <TableCell>{i.customerAccountId ?? "—"}</TableCell>
                  <TableCell>
                    <AdvanceCell
                      instance={i}
                      version={versionCache[i.caseTypeVersionId]}
                      onChanged={load}
                      onError={setAdvanceError}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleDelete(i.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {instances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography color="text.secondary">No case instances yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Test Case Instance</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField
              label="Customer Account ID"
              size="small"
              value={customerAccountId}
              onChange={(e) => setCustomerAccountId(e.target.value)}
              fullWidth
            />
            <TextField
              label="Assigned To (user ID)"
              size="small"
              value={assignedToUserId}
              onChange={(e) => setAssignedToUserId(e.target.value)}
              fullWidth
            />
            <TextField
              label="Contact Email"
              size="small"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              fullWidth
            />
            {versionDetail && (
              <DynamicFieldForm
                fields={versionDetail.fields}
                values={values}
                onChange={(fieldId, value) => setValues((v) => ({ ...v, [fieldId]: value }))}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
