import { useEffect, useState } from "react";
import { Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import type { MessageBroadcastSummary } from "@riptacrm/shared-types";
import { listActiveBroadcasts } from "../../api/messageBroadcastClient";

const POLL_INTERVAL_MS = 45_000;

const PRIORITY_COLOR: Record<string, "default" | "warning" | "error"> = {
  LOW: "default",
  NORMAL: "warning",
  HIGH: "error",
};

export function BroadcastPanelWidget() {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<MessageBroadcastSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    function load() {
      listActiveBroadcasts(user!.role)
        .then((results) => {
          if (!cancelled) {
            setBroadcasts(results);
            setError(false);
          }
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    }

    load();
    // Interval polling, not long-polling: each tick is a fresh stateless request, so
    // there's no stuck-connection state to manage on unmount/role-change — just clear
    // the timer.
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.role]);

  return (
    <Card>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Announcements
        </Typography>
        {error && <Typography color="text.secondary">Unable to load announcements.</Typography>}
        {!error && broadcasts === null && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        )}
        {!error && broadcasts?.length === 0 && (
          <Typography color="text.secondary">No active announcements.</Typography>
        )}
        {!error &&
          broadcasts?.map((b, i) => (
            <Box key={b.id} sx={{ mt: i === 0 ? 1 : 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2">{b.title}</Typography>
                {b.priority && <Chip size="small" label={b.priority} color={PRIORITY_COLOR[b.priority]} />}
              </Stack>
              {/* bodyHtml is sanitized server-side (sanitizeBroadcastHtml) before it's ever
                  persisted, so rendering it here is the one deliberately-trusted read path. */}
              <Box
                sx={{ typography: "body2", color: "text.secondary" }}
                dangerouslySetInnerHTML={{ __html: b.bodyHtml }}
              />
            </Box>
          ))}
      </CardContent>
    </Card>
  );
}
