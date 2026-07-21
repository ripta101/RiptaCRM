import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import type { CaseInstanceSummary } from "@riptacrm/shared-types";
import { formatDateTime } from "@riptacrm/ui";
import { listOpenCasesAssignedTo } from "../../api/caseManagementClient";

export function WorklistTable() {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseInstanceSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    listOpenCasesAssignedTo(user.id, user.token)
      .then(setCases)
      .catch(() => setError(true));
  }, [user?.id, user?.token]);

  if (error) {
    return <Alert severity="error">Unable to load your worklist.</Alert>;
  }

  if (cases === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Case Type</TableCell>
            <TableCell>Stage</TableCell>
            <TableCell>Customer Account</TableCell>
            <TableCell>SLA Due</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cases.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.caseTypeName}</TableCell>
              <TableCell>{c.currentStageName}</TableCell>
              <TableCell>{c.customerAccountId ?? "—"}</TableCell>
              <TableCell>{formatDateTime(c.slaDueAt)}</TableCell>
              <TableCell>
                {c.breached ? (
                  <Chip size="small" color="error" label="SLA breached" />
                ) : (
                  <Chip size="small" label="On track" />
                )}
              </TableCell>
            </TableRow>
          ))}
          {cases.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
                <Typography color="text.secondary">No cases assigned to you right now.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
