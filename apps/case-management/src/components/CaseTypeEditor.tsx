import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import type { CaseTypeSummary, CaseTypeVersionDetail, CaseTypeVersionSummary } from "@riptacrm/shared-types";
import {
  createDraftVersion,
  getCaseType,
  getCaseTypeVersion,
  listCaseTypeVersions,
  publishVersion,
} from "../api/client";
import { FieldListEditor } from "./FieldListEditor";
import { StageListEditor } from "./StageListEditor";
import { ActionListEditor } from "./ActionListEditor";
import { CaseInstancesPanel } from "./CaseInstancesPanel";

type EditorTab = "details" | "fields" | "stages" | "actions" | "instances";

interface CaseTypeEditorProps {
  caseTypeId: string;
  onBack: () => void;
}

export function CaseTypeEditor({ caseTypeId, onBack }: CaseTypeEditorProps) {
  const [caseType, setCaseType] = useState<CaseTypeSummary | null>(null);
  const [versionHistory, setVersionHistory] = useState<CaseTypeVersionSummary[]>([]);
  const [versionDetail, setVersionDetail] = useState<CaseTypeVersionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>("details");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ct, versions] = await Promise.all([
        getCaseType(caseTypeId),
        listCaseTypeVersions(caseTypeId),
      ]);
      setCaseType(ct);
      setVersionHistory(versions);

      const displayVersionId = ct.draftVersion?.id ?? ct.publishedVersion?.id ?? null;
      setVersionDetail(displayVersionId ? await getCaseTypeVersion(displayVersionId) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load case type.");
    } finally {
      setLoading(false);
    }
  }, [caseTypeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateDraft() {
    setActionError(null);
    try {
      await createDraftVersion(caseTypeId);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create draft.");
    }
  }

  async function handlePublish() {
    if (!versionDetail) return;
    setActionError(null);
    try {
      await publishVersion(versionDetail.id);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to publish.");
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !caseType) {
    return <Alert severity="error">{error ?? "Case type not found."}</Alert>;
  }

  const isEditable = versionDetail?.status === "DRAFT";
  const canPublish = isEditable && (versionDetail?.stages.length ?? 0) > 0;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
        Back to Case Types
      </Button>

      <Typography variant="h5">{caseType.name}</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {caseType.description || "No description."}
      </Typography>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: "wrap", rowGap: 1 }}>
        {caseType.publishedVersion && (
          <Chip color="success" label={`Published v${caseType.publishedVersion.versionNumber}`} />
        )}
        {caseType.draftVersion && <Chip color="warning" label={`Draft v${caseType.draftVersion.versionNumber}`} />}
        {!caseType.publishedVersion && !caseType.draftVersion && <Chip label="No version" />}

        {!caseType.draftVersion && caseType.publishedVersion && (
          <Button size="small" variant="outlined" onClick={handleCreateDraft}>
            Create Draft
          </Button>
        )}
        {isEditable && (
          <Tooltip title={canPublish ? "" : "Add at least one stage before publishing"}>
            <span>
              <Button size="small" variant="contained" disabled={!canPublish} onClick={handlePublish}>
                Publish
              </Button>
            </span>
          </Tooltip>
        )}
      </Stack>

      {versionHistory.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          History:{" "}
          {versionHistory
            .map((v) => `v${v.versionNumber} (${v.status.toLowerCase()})`)
            .join(" · ")}
        </Typography>
      )}

      <Tabs value={tab} onChange={(_e, v: EditorTab) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Details" value="details" />
        <Tab label="Fields" value="fields" disabled={!versionDetail} />
        <Tab label="Stages & SLA" value="stages" disabled={!versionDetail} />
        <Tab label="Actions" value="actions" disabled={!versionDetail} />
        <Tab label="Test Instances" value="instances" />
      </Tabs>

      {tab === "details" && (
        <Stack spacing={1}>
          <Typography>Key: {caseType.key}</Typography>
          <Typography>Active: {caseType.isActive ? "Yes" : "No"}</Typography>
          {!versionDetail && (
            <Alert severity="info">
              This case type has no version yet — it was created without a design (unexpected). Contact support.
            </Alert>
          )}
        </Stack>
      )}

      {tab === "fields" && versionDetail && (
        <FieldListEditor
          versionId={versionDetail.id}
          fields={versionDetail.fields}
          editable={isEditable}
          onChanged={load}
        />
      )}

      {tab === "stages" && versionDetail && (
        <StageListEditor
          versionId={versionDetail.id}
          stages={versionDetail.stages}
          editable={isEditable}
          onChanged={load}
        />
      )}

      {tab === "actions" && versionDetail && (
        <ActionListEditor stages={versionDetail.stages} editable={isEditable} onChanged={load} />
      )}

      {tab === "instances" && (
        <CaseInstancesPanel caseTypeId={caseTypeId} publishedVersion={caseType.publishedVersion} />
      )}
    </Box>
  );
}
