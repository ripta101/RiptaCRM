import { Router } from "express";
import type { Profile } from "@riptacrm/shared-types";
import { requirePermission } from "../lib/requirePermission";

export const profilesRouter = Router();

const ACCESS_MANAGEMENT_API_URL = process.env.ACCESS_MANAGEMENT_API_URL ?? "http://localhost:4314";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY ?? "dev-only-insecure-service-key-change-me";

// Powers only the composer's "target profiles" checkbox list — reads fail soft to an
// empty list, matching this codebase's usual cross-service-read convention. Broadcast
// creation/update never validates targetProfileIds against this, so a degraded picker
// here can't cause a valid broadcast to be rejected.
profilesRouter.get("/profiles", requirePermission("broadcast-config"), async (_req, res) => {
  try {
    const upstream = await fetch(`${ACCESS_MANAGEMENT_API_URL}/api/profiles`, {
      headers: { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY },
    });
    if (!upstream.ok) return res.json({ results: [] });
    const data: { results: Profile[] } = await upstream.json();
    res.json({ results: data.results });
  } catch (err) {
    console.error("Failed to fetch profiles from access-management-api:", err);
    res.json({ results: [] });
  }
});
