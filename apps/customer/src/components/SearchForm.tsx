import type { FormEvent } from "react";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import type { CustomerSearchParams } from "@riptacrm/shared-types";

interface SearchFormProps {
  values: CustomerSearchParams;
  onChange: (field: keyof CustomerSearchParams, value: string) => void;
  onSubmit: () => void;
  searching: boolean;
  error: string | null;
}

export function SearchForm({ values, onChange, onSubmit, searching, error }: SearchFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Find a Customer
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Fill in one or more fields to search. Results narrow as you add more criteria.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
        >
          {error && (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Alert severity="warning">{error}</Alert>
            </Box>
          )}

          <TextField
            label="First name"
            value={values.firstName ?? ""}
            onChange={(e) => onChange("firstName", e.target.value)}
          />
          <TextField
            label="Last name"
            value={values.lastName ?? ""}
            onChange={(e) => onChange("lastName", e.target.value)}
          />
          <TextField
            label="Phone number"
            value={values.phone ?? ""}
            onChange={(e) => onChange("phone", e.target.value)}
          />
          <TextField
            label="Date of birth"
            type="date"
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
            label="Customer / Account ID"
            value={values.accountId ?? ""}
            onChange={(e) => onChange("accountId", e.target.value)}
          />
          <TextField
            label="Company / Organization"
            value={values.companyName ?? ""}
            onChange={(e) => onChange("companyName", e.target.value)}
          />

          <Box sx={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" variant="contained" size="large" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
