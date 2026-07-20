import { Router } from "express";
import type { UserSummary } from "@riptacrm/shared-types";

export const usersRouter = Router();

const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://localhost:4312";

usersRouter.get("/users", async (_req, res) => {
  try {
    const upstream = await fetch(`${AUTH_API_URL}/api/users`);
    if (!upstream.ok) return res.json({ results: [] });
    const data: { results: UserSummary[] } = await upstream.json();
    res.json({ results: data.results });
  } catch (err) {
    console.error("Failed to fetch users from auth-api:", err);
    res.json({ results: [] });
  }
});
