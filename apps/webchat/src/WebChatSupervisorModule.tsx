import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
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
import type { SupervisorAgentsResponse, UserSummary } from "@riptacrm/shared-types";
import { UserAutocomplete } from "@riptacrm/ui";
import { getSupervisorAgents, listUsers } from "./api/client";

const ALL = "__all__";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface WebChatSupervisorModuleProps {
  authToken?: string | null;
}

export default function WebChatSupervisorModule({ authToken }: WebChatSupervisorModuleProps) {
  const [queueFilter, setQueueFilter] = useState(ALL);
  const [profileFilter, setProfileFilter] = useState(ALL);
  const [agentFilter, setAgentFilter] = useState<UserSummary | null>(null);
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());

  const [response, setResponse] = useState<SupervisorAgentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getSupervisorAgents(
      {
        closedFrom: `${fromDate}T00:00:00.000`,
        closedTo: `${toDate}T23:59:59.999`,
        queueId: queueFilter === ALL ? undefined : queueFilter,
        supervisedProfileId: profileFilter === ALL ? undefined : profileFilter,
        userId: agentFilter?.id,
      },
      authToken,
    )
      .then(setResponse)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load the supervisor dashboard."))
      .finally(() => setLoading(false));
  }, [authToken, queueFilter, profileFilter, agentFilter, fromDate, toDate]);

  const queueNameById = new Map((response?.scope.queues ?? []).map((q) => [q.id, q.name]));
  const profileNameById = new Map((response?.scope.profiles ?? []).map((p) => [p.id, p.name]));
  const noScope = response && response.scope.queues.length === 0 && response.scope.profiles.length === 0;

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {noScope && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Your profile has no supervised queues or profiles configured. Contact an administrator.
        </Alert>
      )}

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <TextField
          select
          label="Queue"
          size="small"
          value={queueFilter}
          onChange={(e) => setQueueFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value={ALL}>All queues</MenuItem>
          {(response?.scope.queues ?? []).map((q) => (
            <MenuItem key={q.id} value={q.id}>
              {q.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Profile"
          size="small"
          value={profileFilter}
          onChange={(e) => setProfileFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value={ALL}>All profiles</MenuItem>
          {(response?.scope.profiles ?? []).map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>

        <UserAutocomplete
          label="Agent"
          value={agentFilter}
          onChange={setAgentFilter}
          search={(q) => listUsers({ q, limit: "20" }, authToken)}
        />

        <TextField
          label="Answered from"
          type="date"
          size="small"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Answered to"
          type="date"
          size="small"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && response && (
        <Paper variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Agent</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Queue(s)</TableCell>
                <TableCell>Profile(s)</TableCell>
                <TableCell>Active Interactions</TableCell>
                <TableCell>Answered</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {response.results.map((agent) => (
                <TableRow key={agent.userId}>
                  <TableCell>
                    {agent.name}
                    <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                      ({agent.username})
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {agent.statusLabel ? (
                      <Chip size="small" color={agent.isAvailableForChats ? "success" : "default"} label={agent.statusLabel} />
                    ) : (
                      <Typography color="text.secondary" fontStyle="italic">
                        No status set
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{agent.visibleViaQueueIds.map((id) => queueNameById.get(id) ?? id).join(", ") || "—"}</TableCell>
                  <TableCell>{agent.visibleViaProfileIds.map((id) => profileNameById.get(id) ?? id).join(", ") || "—"}</TableCell>
                  <TableCell>{agent.activeInteractionCount}</TableCell>
                  <TableCell>{agent.answeredCount}</TableCell>
                </TableRow>
              ))}
              {response.results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">No agents visible for the current filters.</Typography>
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
