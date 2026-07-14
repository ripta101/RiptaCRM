import { Checkbox, FormControlLabel, MenuItem, Stack, TextField } from "@mui/material";
import type { FieldDefinition } from "@riptacrm/shared-types";

type FieldValue = string | number | boolean | null;

interface DynamicFieldFormProps {
  fields: FieldDefinition[];
  values: Record<string, FieldValue>;
  onChange: (fieldDefinitionId: string, value: FieldValue) => void;
}

export function DynamicFieldForm({ fields, values, onChange }: DynamicFieldFormProps) {
  return (
    <Stack spacing={2}>
      {fields
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((field) => {
          const value = values[field.id] ?? "";

          if (field.fieldType === "CHECKBOX") {
            return (
              <FormControlLabel
                key={field.id}
                control={
                  <Checkbox
                    checked={Boolean(value)}
                    onChange={(e) => onChange(field.id, e.target.checked)}
                  />
                }
                label={`${field.name}${field.required ? " *" : ""}`}
              />
            );
          }

          if (field.fieldType === "SELECT") {
            return (
              <TextField
                key={field.id}
                select
                label={field.name}
                required={field.required}
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
                fullWidth
              >
                {(field.options ?? []).map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            );
          }

          return (
            <TextField
              key={field.id}
              label={field.name}
              required={field.required}
              type={field.fieldType === "NUMBER" ? "number" : field.fieldType === "DATE" ? "date" : "text"}
              multiline={field.fieldType === "TEXTAREA"}
              minRows={field.fieldType === "TEXTAREA" ? 3 : undefined}
              value={value}
              onChange={(e) => onChange(field.id, e.target.value)}
              InputLabelProps={field.fieldType === "DATE" ? { shrink: true } : undefined}
              fullWidth
            />
          );
        })}
    </Stack>
  );
}
