import { Router } from "express";
import type { Profile } from "@riptacrm/shared-types";

export const profilesRouter = Router();

const ACCESS_MANAGEMENT_API_URL = process.env.ACCESS_MANAGEMENT_API_URL ?? "http://localhost:4314";

// Powers only the composer's "target profiles" checkbox list — reads fail soft to an
// empty list, matching this codebase's usual cross-service-read convention. Broadcast
// creation/update never validates targetProfileIds against this, so a degraded picker
// here can't cause a valid broadcast to be rejected.
profilesRouter.get("/profiles", async (_req, res) => {
  try {
    const upstream = await fetch(`${ACCESS_MANAGEMENT_API_URL}/api/profiles`);
    if (!upstream.ok) return res.json({ results: [] });
    const data: { results: Profile[] } = await upstream.json();
    res.json({ results: data.results });
  } catch (err) {
    console.error("Failed to fetch profiles from access-management-api:", err);
    res.json({ results: [] });
  }
});
