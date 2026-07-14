import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
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
import type { ActionLogEntry } from "@riptacrm/shared-types";
import { listActionLog } from "../api/client";

export function ActionLogViewer() {
  const [entries, setEntries] = useState<ActionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseInstanceId, setCaseInstanceId] = useState("");
  const [caseTypeId, setCaseTypeId] = useState("");

  function load() {
    setLoading(true);
    listActionLog({ caseInstanceId: caseInstanceId.trim() || undefined, caseTypeId: caseTypeId.trim() || undefined })
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Action Log
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Filter by Case Instance ID"
          size="small"
          value={caseInstanceId}
          onChange={(e) => setCaseInstanceId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <TextField
          label="Filter by Case Type ID"
          size="small"
          value={caseTypeId}
          onChange={(e) => setCaseTypeId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <Chip label="Search" onClick={load} color="primary" clickable />
      </Stack>

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
                <TableCell>Fired At</TableCell>
                <TableCell>Trigger</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Case Instance</TableCell>
                <TableCell>Simulated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.firedAt).toLocaleString()}</TableCell>
                  <TableCell>{e.trigger}</TableCell>
                  <TableCell>{e.recipient}</TableCell>
                  <TableCell>{e.subject}</TableCell>
                  <TableCell>{e.caseInstanceId.slice(0, 8)}</TableCell>
                  <TableCell>{e.simulated ? <Chip size="small" label="Simulated" /> : "Real"}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">No action log entries yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
