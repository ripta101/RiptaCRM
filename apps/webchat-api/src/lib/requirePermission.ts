import type { RequestHandler } from "express";
import { verifyAuthToken } from "./jwt";

// Same "known simplification" posture as JWT_SECRET: a single shared static key, insecure
// dev-only fallback. Lets a route accept a trusted service-to-service call without an
// end-user token — see docs/architecture.md's service-to-service auth section.
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY ?? "dev-only-insecure-service-key-change-me";

// Accepts either a trusted internal service call (X-Internal-Service-Key header) or an
// end-user JWT, optionally requiring a specific Profile-granted nav-item id. Omitting
// navItemId means "any authenticated user or trusted service" — no specific grant needed.
//
// NOTE: this middleware is intentionally NOT applied to routes/public.ts — the widget's
// customer-facing routes have no logged-in user at all and use a separate siteKey-based
// trust mechanism (see routes/public.ts and lib/originValidator.ts).
export function requirePermission(navItemId?: string): RequestHandler {
  return (req, res, next) => {
    if (req.headers["x-internal-service-key"] === INTERNAL_SERVICE_KEY) {
      return next();
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    let claims;
    try {
      claims = verifyAuthToken(token);
    } catch {
      return res.status(401).json({ error: "Invalid or expired session." });
    }

    if (navItemId && !claims.navItemIds?.includes(navItemId)) {
      return res.status(403).json({ error: "Not permitted to perform this action." });
    }

    next();
  };
}
