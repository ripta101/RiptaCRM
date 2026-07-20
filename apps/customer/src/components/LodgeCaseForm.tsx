import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { DynamicFieldForm } from "@riptacrm/ui";
import type { CaseInstanceDetail, CaseTypeSummary, CaseTypeVersionDetail, CustomerDetail } from "@riptacrm/shared-types";
import { createCaseInstance, getCaseTypeVersion, getCustomerById, listLodgeableCaseTypes } from "../api/client";

interface LodgeCaseFormProps {
  customer: CustomerDetail;
  currentUserId: string | null;
  onCustomerUpdated: (detail: CustomerDetail) => void;
}

type FieldValue = string | number | boolean | null;

export function LodgeCaseForm({ customer, currentUserId, onCustomerUpdated }: LodgeCaseFormProps) {
  const [caseTypes, setCaseTypes] = useState<CaseTypeSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<CaseTypeSummary | null>(null);
  const [versionDetail, setVersionDetail] = useState<CaseTypeVersionDetail | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lodged, setLodged] = useState<CaseInstanceDetail | null>(null);

  useEffect(() => {
    listLodgeableCaseTypes()
      .then(setCaseTypes)
      .catch((err) => setListError(err instanceof Error ? err.message : "Failed to load case types."));
  }, []);

  async function handlePickType(caseType: CaseTypeSummary) {
    setSelectedType(caseType);
    setVersionLoading(true);
    setSubmitError(null);
    try {
      const detail = await getCaseTypeVersion(caseType.publishedVersion!.id);
      setVersionDetail(detail);
      setFieldValues({});
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to load case type fields.");
    } finally {
      setVersionLoading(false);
    }
  }

  function resetToPickType() {
    setSelectedType(null);
    setVersionDetail(null);
    setFieldValues({});
    setSubmitError(null);
    setLodged(null);
  }

  async function handleSubmit() {
    if (!selectedType || !versionDetail) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const instance = await createCaseInstance({
        caseTypeId: selectedType.id,
        customerAccountId: customer.accountId,
        contactEmail: customer.email ?? undefined,
        lodgedByUserId: currentUserId ?? undefined,
        fieldValues: versionDetail.fields.map((f) => ({
          fieldDefinitionId: f.id,
          value: fieldValues[f.id] ?? null,
        })),
      });
      setLodged(instance);
      const updated = await getCustomerById(customer.id);
      onCustomerUpdated(updated);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to lodge case.");
    } finally {
      setSubmitting(false);
    }
  }

  if (lodged) {
    const message =
      lodged.assignedToUserId && lodged.assignedToUserId === currentUserId
        ? "Case lodged and assigned to you."
        : lodged.assignedQueueId
          ? `Case lodged and routed to the "${lodged.assignedQueueName}" queue.`
          : "Case lodged.";

    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Alert severity={lodged.assignedQueueId ? "info" : "success"} sx={{ mb: 2 }}>
          {message}
        </Alert>
        <Button variant="outlined" onClick={resetToPickType}>
          Lodge another case
        </Button>
      </Paper>
    );
  }

  if (!selectedType) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Lodge a Case
        </Typography>
        {listError && <Alert severity="error">{listError}</Alert>}
        {!listError && caseTypes === null && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {!listError && caseTypes?.length === 0 && (
          <Typography color="text.secondary">No case types are available to lodge right now.</Typography>
        )}
        {!listError && caseTypes && caseTypes.length > 0 && (
          <Grid container spacing={2}>
            {caseTypes.map((ct) => (
              <Grid key={ct.id} size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => handlePickType(ct)}>
                    <CardContent>
                      <Typography variant="subtitle1">{ct.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {ct.description ?? "No description."}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Lodge a Case — {selectedType.name}
      </Typography>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      {versionLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!versionLoading && versionDetail && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <DynamicFieldForm
            fields={versionDetail.fields}
            values={fieldValues}
            onChange={(fieldId, value) => setFieldValues((prev) => ({ ...prev, [fieldId]: value }))}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
            <Button onClick={resetToPickType} disabled={submitting}>
              Choose a different case type
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Lodging..." : "Lodge Case"}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
