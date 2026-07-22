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
import { useAuth } from "@riptacrm/auth-client";
import type { WorklistItem } from "@riptacrm/shared-types";
import { formatDateTime } from "@riptacrm/ui";
import { listOpenCasesAssignedTo } from "../../api/caseManagementClient";
import { claimConversation, listChatWorklist } from "../../api/webchatClient";
import { useInteractions } from "../../interactions/InteractionsContext";
import { caseToWorklistItem } from "./worklistAdapters";

const KIND_LABEL: Record<WorklistItem["kind"], string> = { case: "Case", webchat: "Web Chat" };

export function WorklistTable() {
  const { user } = useAuth();
  const { openInteraction } = useInteractions();
  const [items, setItems] = useState<WorklistItem[] | null>(null);
  const [error, setError] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const canWorkChats = Boolean(user?.navItemIds.includes("webchat-agent"));

  function load() {
    if (!user) return;
    const sources = [listOpenCasesAssignedTo(user.id, user.token).then((cases) => cases.map(caseToWorklistItem))];
    if (canWorkChats) {
      sources.push(listChatWorklist(user.id, user.token));
    }

    Promise.all(sources)
      .then((results) => {
        const merged = results.flat();
        merged.sort((a, b) => {
          if (a.dueAt === null) return b.dueAt === null ? 0 : 1;
          if (b.dueAt === null) return -1;
          return a.dueAt.localeCompare(b.dueAt);
        });
        setItems(merged);
      })
      .catch(() => setError(true));
  }

  useEffect(load, [user?.id, user?.token, canWorkChats]);

  async function handleClaim(item: WorklistItem) {
    setClaimError(null);
    setClaimingId(item.id);
    try {
      await claimConversation(item.id, user?.token);
      openInteraction({
        // A stable id derived from the conversation, not a fresh random one — so this
        // dedupes (via InteractionsContext's OPEN_TAB, which activates an existing tab of
        // the same id rather than opening a second one) against the same conversation
        // being screen-popped by AgentSocketProvider's chat:assigned handler.
        id: `webchat-${item.id}`,
        title: "Web Chat",
        kind: "webchat",
        openedAt: Date.now(),
        meta: { conversationId: item.id },
      });
      load();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Failed to claim this chat.");
      load(); // someone else may have just claimed it — refresh so the row reflects reality
    } finally {
      setClaimingId(null);
    }
  }

  function handleOpen(item: WorklistItem) {
    openInteraction({
      id: crypto.randomUUID(),
      title: "Web Chat",
      kind: "webchat",
      openedAt: Date.now(),
      meta: { conversationId: item.id },
    });
  }

  if (error) {
    return <Alert severity="error">Unable to load your worklist.</Alert>;
  }

  if (items === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {claimError && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setClaimError(null)}>
          {claimError}
        </Alert>
      )}
      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>Due</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${item.kind}-${item.id}`}>
                <TableCell>
                  <Chip size="small" variant="outlined" label={KIND_LABEL[item.kind]} />
                </TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.subtitle ?? "—"}</TableCell>
                <TableCell>{item.dueAt ? formatDateTime(item.dueAt) : "—"}</TableCell>
                <TableCell>
                  {item.breached ? (
                    <Chip size="small" color="error" label="SLA breached" />
                  ) : (
                    <Chip size="small" label={item.status === "OPEN" ? "On track" : item.status} />
                  )}
                </TableCell>
                <TableCell align="right">
                  {item.kind === "webchat" &&
                    (item.claimable ? (
                      <Button size="small" variant="outlined" disabled={claimingId === item.id} onClick={() => handleClaim(item)}>
                        Claim
                      </Button>
                    ) : (
                      <Button size="small" variant="outlined" onClick={() => handleOpen(item)}>
                        Open
                      </Button>
                    ))}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">Nothing in your worklist right now.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
