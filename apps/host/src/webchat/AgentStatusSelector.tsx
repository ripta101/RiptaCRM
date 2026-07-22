import { useEffect, useState } from "react";
import { MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { useAuth } from "@riptacrm/auth-client";
import type { AgentStatusOption } from "@riptacrm/shared-types";
import { getMyAgentStatus, listAgentStatusOptions, setMyAgentStatus } from "../api/webchatClient";

const UNSET = "__unset__";

// Rendered in TopBar, only for users with the webchat-agent grant (same gate
// AgentSocketProvider uses). The agent's actual status is cleared server-side on every
// login/logout (see webchat-api's ws/socketServer.ts) — this control just lets them pick a
// fresh one each session; it doesn't own the "cleared" behavior itself.
export function AgentStatusSelector() {
  const { user } = useAuth();
  const canWorkChats = Boolean(user?.navItemIds.includes("webchat-agent"));
  const [options, setOptions] = useState<AgentStatusOption[]>([]);
  const [optionId, setOptionId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!canWorkChats || !user?.token) return;
    let cancelled = false;

    Promise.all([listAgentStatusOptions(user.token), getMyAgentStatus(user.token)])
      .then(([opts, status]) => {
        if (cancelled) return;
        setOptions(opts);
        setOptionId(status?.optionId ?? null);
        setLoaded(true);
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
