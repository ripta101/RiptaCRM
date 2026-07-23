import { Router } from "express";
import { requirePermission } from "../lib/requirePermission";
import { fetchUsersFromAuthApi } from "../services/resolveUserSummaries";

export const usersRouter = Router();

// Bare requirePermission() (any authenticated user, not just webchat-config) — the
// Supervisor Dashboard's agent-search filter (UserAutocomplete) needs this proxy too, and a
// Supervisor-only Profile won't hold webchat-config. The underlying data is already
// non-sensitive directory info (name/username/email/role), same posture already documented
// on GET /agent-status-options' bare gate.
usersRouter.get("/users", requirePermission(), async (req, res) => {
  const query: Record<string, string> = {};
  for (const key of ["q", "limit", "ids"] as const) {
    const value = req.query[key];
    if (typeof value === "string" && value) query[key] = value;
  }
  const results = await fetchUsersFromAuthApi(query);
  res.json({ results });
});
