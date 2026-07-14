import type { FormEvent } from "react";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import type { CreateCustomerInput } from "@riptacrm/shared-types";

interface CreateCustomerFormProps {
  values: Partial<CreateCustomerInput>;
  onChange: (field: keyof CreateCustomerInput, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}

const REQUIRED_FIELDS: (keyof CreateCustomerInput)[] = ["firstName", "lastName", "phone", "dateOfBirth"];

export function CreateCustomerForm({
  values,
  onChange,
  onSubmit,
  onBack,
  submitting,
  error,
}: CreateCustomerFormProps) {
  const isValid = REQUIRED_FIELDS.every((field) => (values[field] ?? "").trim().length > 0);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isValid) onSubmit();
  }

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Create Customer
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        First name, last name, phone, and date of birth are required. The account ID is
        generated automatically.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}
        >
          {error && (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}

          <TextField
            label="First name"
            required
            value={values.firstName ?? ""}
            onChange={(e) => onChange("firstName", e.target.value)}
          />
          <TextField
            label="Last name"
            required
            value={values.lastName ?? ""}
            onChange={(e) => onChange("lastName", e.target.value)}
          />
          <TextField
            label="Phone number"
            required
            value={values.phone ?? ""}
            onChange={(e) => onChange("phone", e.target.value)}
          />
          <TextField
            label="Date of birth"
            type="date"
            required
            value={values.dateOfBirth ?? ""}
            onChange={(e) => onChange("dateOfBirth", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Email address"
            value={values.email ?? ""}
            onChange={(e) => onChange("email", e.target.value)}
          />
          <TextField
            label="Company / Organization"
            value={values.companyName ?? ""}
            onChange={(e) => onChange("companyName", e.target.value)}
          />

          <Box sx={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button variant="outlined" size="large" onClick={onBack} disabled={submitting}>
              Back to Search
            </Button>
            <Button type="submit" variant="contained" size="large" disabled={!isValid || submitting}>
              {submitting ? "Creating..." : "Create Customer"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
