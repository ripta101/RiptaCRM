import { Router } from "express";
import { requirePermission } from "../lib/requirePermission";

export const webchatQueuesRouter = Router();

const WEBCHAT_API_URL = process.env.WEBCHAT_API_URL ?? "http://localhost:4315";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY ?? "dev-only-insecure-service-key-change-me";

// Read-only proxy so ProfileEditor's Supervised Queues picker can show real queue names
// without this service owning any WebChat data — mirrors routes/users.ts's proxy to
// auth-api. Fails soft (empty list) since this only powers a picker's display, not a
// security decision. webchat-api's own GET /queues is already un-paginated and queues are
// expected to stay few, so no server-side search is added here.
webchatQueuesRouter.get("/webchat-queues", requirePermission("access-management-config"), async (_req, res) => {
  try {
    const upstream = await fetch(`${WEBCHAT_API_URL}/api/queues`, {
      headers: { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY },
    });
    if (!upstream.ok) return res.json({ results: [] });
    const data: { results: { id: string; name: string }[] } = await upstream.json();
    res.json({ results: data.results.map((q) => ({ id: q.id, name: q.name })) });
  } catch (err) {
    console.error("Failed to fetch queues from webchat-api:", err);
    res.json({ results: [] });
  }
});
