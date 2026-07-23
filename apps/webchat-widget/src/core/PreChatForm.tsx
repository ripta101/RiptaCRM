import type { PreChatFieldDefinition } from "@riptacrm/shared-types";

export interface PreChatFormProps {
  fields: PreChatFieldDefinition[];
  values: Record<string, string>;
  onChange: (fieldKey: string, value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}

// Visitor-facing gate shown before a brand-new conversation starts, when the site has
// admin-configured PreChatFields. Plain inline styles, same convention as ChatPanel.tsx —
// this renders inside an iframe on arbitrary third-party sites, so no external stylesheet or
// class names that could collide with the embedding page. Mirrors packages/ui's
// DynamicFieldForm's field-type switch, but that component is MUI-based and can't be reused
// here.
export function PreChatForm({ fields, values, onChange, onSubmit, submitting, error }: PreChatFormProps) {
  return (
    <form
      style={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div style={styles.intro}>Please tell us a bit about yourself before we start.</div>

      {error && <div style={styles.error}>{error}</div>}

      {fields.map((field) => (
        <label key={field.id} style={styles.fieldRow}>
          <span style={styles.label}>
            {field.label}
            {field.required && <span style={styles.required}> *</span>}
          </span>
          {renderInput(field, values[field.fieldKey] ?? "", (v) => onChange(field.fieldKey, v))}
        </label>
      ))}

      <button type="submit" style={styles.submitButton} disabled={submitting}>
        {submitting ? "Starting…" : "Start chat"}
      </button>
    </form>
  );
}

function renderInput(field: PreChatFieldDefinition, value: string, onChange: (value: string) => void) {
  switch (field.fieldType) {
    case "CHECKBOX":
      return (
        <input
          type="checkbox"
          checked={value === "true"}
          required={field.required}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        />
      );
    case "SELECT":
      return (
        <select style={styles.input} value={value} required={field.required} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            Select…
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "TEXTAREA":
      return (
        <textarea
          style={{ ...styles.input, ...styles.textarea }}
          value={value}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "NUMBER":
      return (
        <input
          style={styles.input}
          type="number"
          value={value}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "DATE":
      return (
        <input
          style={styles.input}
          type="date"
          value={value}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <input
          style={styles.input}
          type="text"
          value={value}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
    overflowY: "auto",
    flex: 1,
  },
  intro: {
    color: "#444",
    marginBottom: 4,
  },
  error: {
    color: "#c0392b",
    fontSize: 13,
  },
  fieldRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 13,
    color: "#333",
    fontWeight: 600,
  },
  required: {
    color: "#c0392b",
  },
  input: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    fontFamily: "inherit",
  },
  textarea: {
    minHeight: 60,
    resize: "vertical",
  },
  submitButton: {
    padding: "10px 16px",
    borderRadius: 6,
    border: "none",
    background: "#1565c0",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },
};
