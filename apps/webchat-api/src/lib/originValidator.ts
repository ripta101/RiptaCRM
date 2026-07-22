import type { Request } from "express";
import type { CorsOptions } from "cors";
import { prisma } from "../db";

// The public router's CORS policy can't be a fixed allowlist like every other route in
// this app — a widget embedded on an arbitrary customer domain needs its actual origin
// validated per-Site, not against this service's own known dev ports. Looked up by the
// request body's siteKey (available because express.json() runs before this router — see
// app.ts) rather than any header, since siteKey is the only credential a public request
// carries at all.
export function publicCors(req: Request, callback: (err: Error | null, options?: CorsOptions) => void): void {
  const siteKey = typeof req.body?.siteKey === "string" ? req.body.siteKey : req.query?.siteKey;
  const origin = req.headers.origin;

  if (typeof siteKey !== "string" || !siteKey) {
    // No siteKey to validate against yet (e.g. malformed request) — let the route handler
    // itself return the real 400; CORS just needs to not block it outright here.
    return callback(null, { origin: true });
  }

  prisma.site
    .findUnique({ where: { siteKey } })
    .then((site) => {
      if (!site || !site.isActive) return callback(null, { origin: false });

      const allowed = site.allowedOrigins
        ?.split(",")
        .map((o) => o.trim())
        .filter(Boolean);

      if (!allowed || allowed.length === 0) {
        // No allowlist configured for this Site — accept any origin. Deliberate default
        // for a demo/dev CRM; a production deployment would want this to default closed.
        return callback(null, { origin: true });
      }

      callback(null, { origin: !origin || allowed.includes(origin) });
    })
    .catch((err) => callback(err as Error));
}
