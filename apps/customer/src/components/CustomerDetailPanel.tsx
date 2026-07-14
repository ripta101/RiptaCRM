import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import type { CustomerDetail } from "@riptacrm/shared-types";

interface CustomerDetailPanelProps {
  detail: CustomerDetail | null;
  loading: boolean;
  error: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export function CustomerDetailPanel({ detail, loading, error }: CustomerDetailPanelProps) {
  if (loading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  if (!detail) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography color="text.secondary">Select a customer to view their details.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {detail.firstName} {detail.lastName}
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
          <Typography color="text.secondary">Phone: {detail.phone}</Typography>
          <Typography color="text.secondary">DOB: {formatDate(detail.dateOfBirth)}</Typography>
          <Typography color="text.secondary">Email: {detail.email ?? "—"}</Typography>
          <Typography color="text.secondary">Account ID: {detail.accountId}</Typography>
          <Typography color="text.secondary">Company: {detail.companyName ?? "—"}</Typography>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="overline" color="text.secondary">
          Open Cases
        </Typography>
        {detail.cases.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            No open cases.
          </Typography>
        ) : (
          <List dense disablePadding>
            {detail.cases.map((c, i) => (
              <Box key={c.id}>
                {i > 0 && <Divider component="li" />}
                <ListItem disableGutters>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {c.caseTypeName}
                        <Chip size="small" label={c.currentStageName} color={c.breached ? "warning" : "default"} />
                        {c.breached && <Chip size="small" label="SLA breached" color="error" />}
                      </Box>
                    }
                    secondary={`Opened ${formatDate(c.createdAt)} · SLA due ${formatDateTime(c.slaDueAt)}`}
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">
          Recent Interactions
        </Typography>
        {detail.interactions.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            No recorded interactions.
          </Typography>
        ) : (
          <List dense disablePadding>
            {detail.interactions.map((entry, i) => (
              <Box key={entry.id}>
                {i > 0 && <Divider component="li" />}
                <ListItem disableGutters>
                  <ListItemText
                    primary={entry.summary}
                    secondary={`${entry.channel} · ${formatDateTime(entry.occurredAt)}`}
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
