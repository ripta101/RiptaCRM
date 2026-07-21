import { Router } from "express";
import { Prisma } from "../../generated/prisma";
import { prisma } from "../db";
import { requirePermission } from "../lib/requirePermission";

export const usersRouter = Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function toSummary(u: { id: string; username: string; name: string; email: string; role: string }) {
  return { id: u.id, username: u.username, name: u.name, email: u.email, role: u.role };
}

usersRouter.get("/users", requirePermission(), async (req, res) => {
  const idsParam = typeof req.query.ids === "string" ? req.query.ids : "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length > 0) {
    // Exact bounded lookup by id — used to resolve known member ids for display (e.g. a
    // Profile's or Queue's member table), so it's deliberately NOT subject to the take
    // limit below: it's bounded by the caller-supplied id list, not by directory size.
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" } });
    return res.json({ results: users.map(toSummary) });
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const limitParam = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : NaN;
  const take = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), MAX_LIMIT) : DEFAULT_LIMIT;

  // SQLite's Prisma connector doesn't support `mode: "insensitive"` (Postgres/Mongo-only) —
  // SQLite's LIKE is case-insensitive for ASCII by default, so a bare `contains` here
  // matches the existing precedent in customer-api's /search route.
  const where: Prisma.UserWhereInput = q
    ? { OR: [{ name: { contains: q } }, { username: { contains: q } }, { email: { contains: q } }] }
    : {};

  const users = await prisma.user.findMany({ where, orderBy: { name: "asc" }, take });
  res.json({ results: users.map(toSummary) });
});
