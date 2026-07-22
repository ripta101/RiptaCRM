import { useEffect, useState } from "react";
import { MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import type { AgentStatusOption } from "@riptacrm/shared-types";
import { getMyAgentStatus, listAgentStatusOptions, listChatWorklist, setMyAgentStatus } from "../api/webchatClient";
import { useInteractions } from "../interactions/InteractionsContext";

const UNSET = "__unset__";

// Rendered in TopBar, only for users with the webchat-agent grant (same gate
// AgentSocketProvider uses). The agent's actual status is cleared server-side on every
// login/logout (see webchat-api's ws/socketServer.ts) — this control just lets them pick a
// fresh one each session; it doesn't own the "cleared" behavior itself.
export function AgentStatusSelector() {
  const { user } = useAuth();
  const { openInteraction } = useInteractions();
  const canWorkChats = Boolean(user?.navItemIds.includes("webchat-agent"));
  const [options, setOptions] = useState<AgentStatusOption[]>([]);
  const [optionId, setOptionId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // "chat:assigned" (AgentSocketProvider) only reaches an agent whose socket happens to
  // already be connected and joined at the exact instant a chat is assigned — it's a
  // one-shot emit with no persistence or replay. Status is also always cleared on every
  // connect (see socketServer.ts), so "just connected" and "actually available" are never
  // simultaneously true — becoming available is the only reliable moment to catch up on
  // anything assigned in the meantime. This only ever reads conversations already assigned
  // to *this* userId (assignment itself is unchanged, still exclusive/atomic server-side),
  // so it can't cause a chat to end up handed to more than one agent.
  async function catchUpOnMissedAssignments(token: string, userId: string) {
    try {
      const items = await listChatWorklist(userId, token);
      for (const item of items) {
        if (item.kind !== "webchat" || item.claimable || !item.autoPopup) continue;
        openInteraction({
          // Same stable id convention as AgentSocketProvider/WorklistTable — dedupes against
          // a tab already open for this conversation instead of opening a second one.
          id: `webchat-${item.id}`,
          title: "Web Chat",
          kind: "webchat",
          openedAt: Date.now(),
          meta: { conversationId: item.id },
        });
      }
    } catch {
      // Best-effort catch-up — a failure here shouldn't block the status picker itself; the
      // chat is still safely sitting in the Worklist either way.
    }
  }

  useEffect(() => {
    if (!canWorkChats || !user?.token) return;
    let cancelled = false;

    Promise.all([listAgentStatusOptions(user.token), getMyAgentStatus(user.token)])
      .then(([opts, status]) => {
        if (cancelled) return;
        setOptions(opts);
        setOptionId(status?.optionId ?? null);
        setLoaded(true);

        const isAlreadyAvailable = opts.find((o) => o.id === status?.optionId)?.isAvailableForChats;
        if (isAlreadyAvailable && user.id) void catchUpOnMissedAssignments(user.token!, user.id);
      })
      .catch(() => {
        // Non-critical widget — a failure here shouldn't block the rest of the shell from
        // rendering, same posture as every other Dashboard widget's fail-soft reads.
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [canWorkChats, user?.token]);

  if (!canWorkChats || !loaded) return null;

  async function handleChange(event: SelectChangeEvent) {
    const nextId = event.target.value === UNSET ? null : event.target.value;
    setOptionId(nextId); // optimistic — this is a low-stakes, easily-corrected preference
    try {
      await setMyAgentStatus(nextId, user?.token);
      const becameAvailable = options.find((o) => o.id === nextId)?.isAvailableForChats;
      if (becameAvailable && user?.token && user.id) await catchUpOnMissedAssignments(user.token, user.id);
    } catch {
      setOptionId((prev) => prev); // leave as-is; a stale display is better than reverting mid-click
    }
  }

  return (
    <Select
      value={optionId ?? UNSET}
      onChange={handleChange}
      size="small"
      displayEmpty
      data-testid="agent-status-selector"
      inputProps={{ "aria-label": "Agent status" }}
      sx={{
        mr: 2,
        minWidth: 140,
        color: "inherit",
        ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.5)" },
        ".MuiSvgIcon-root": { color: "inherit" },
      }}
    >
      <MenuItem value={UNSET}>
        <em>Set status</em>
      </MenuItem>
      {options.map((o) => (
        <MenuItem key={o.id} value={o.id}>
          {o.label}
        </MenuItem>
      ))}
    </Select>
  );
}
