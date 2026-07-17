import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import type { MessageBroadcastSummary } from "@riptacrm/shared-types";
import { listBroadcasts } from "../api/client";
import { getBroadcastStatus, type BroadcastStatus } from "../lib/broadcastStatus";

interface BroadcastListProps {
  onSelect: (id: string) => void;
  onNew: () => void;
}

const STATUS_COLOR: Record<BroadcastStatus, "info" | "success" | "default" | "warning"> = {
  Scheduled: "info",
  Active: "success",
  Expired: "default",
  Canceled: "warning",
};

const PRIORITY_COLOR: Record<string, "default" | "warning" | "error"> = {
  LOW: "default",
  NORMAL: "warning",
  HIGH: "error",
};

export function BroadcastList({ onSelect, onNew }: BroadcastListProps) {
  const [broadcasts, setBroadcasts] = useState<MessageBroadcastSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBroadcasts()
      .then(setBroadcasts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Broadcasts</Typography>
        <Button variant="contained" onClick={onNew}>
          New Broadcast
        </Button>
      </Box>

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
                <TableCell>Title</TableCell>
                <TableCell>Target Roles</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start</TableCell>
                <TableCell>End</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {broadcasts.map((b) => {
                const status = getBroadcastStatus(b);
                return (
                  <TableRow key={b.id} hover sx={{ cursor: "pointer" }} onClick={() => onSelect(b.id)}>
                    <TableCell>{b.title}</TableCell>
                    <TableCell>
                      {b.targetRoles.map((role) => (
                        <Chip key={role} size="small" label={role} sx={{ mr: 0.5 }} />
                      ))}
                    </TableCell>
                    <TableCell>
                      {b.priority && (
                        <Chip size="small" color={PRIORITY_COLOR[b.priority]} label={b.priority} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={STATUS_COLOR[status]} label={status} />
                    </TableCell>
                    <TableCell>{new Date(b.startAt).toLocaleString()}</TableCell>
                    <TableCell>{new Date(b.endAt).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
              {broadcasts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">No broadcasts yet.</Typography>
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
