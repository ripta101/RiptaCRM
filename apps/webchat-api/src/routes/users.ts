import { Router } from "express";
import type { UserSummary } from "@riptacrm/shared-types";
import { requirePermission } from "../lib/requirePermission";

export const usersRouter = Router();

const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://localhost:4312";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY ?? "dev-only-insecure-service-key-change-me";

usersRouter.get("/users", requirePermission("webchat-config"), async (req, res) => {
  try {
    const qs = new URLSearchParams();
    for (const key of ["q", "limit", "ids"] as const) {
      const value = req.query[key];
      if (typeof value === "string" && value) qs.set(key, value);
    }
    const upstream = await fetch(`${AUTH_API_URL}/api/users?${qs.toString()}`, {
      headers: { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY },
    });
    if (!upstream.ok) return res.json({ results: [] });
    const data: { results: UserSummary[] } = await upstream.json();
    res.json({ results: data.results });
  } catch (err) {
    console.error("Failed to fetch users from auth-api:", err);
    res.json({ results: [] });
  }
});
