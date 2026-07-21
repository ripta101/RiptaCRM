import jwt from "jsonwebtoken";

// Must match auth-api's JWT_SECRET — this service only ever verifies tokens auth-api
// issued, never signs its own. Same "known simplification" posture as auth-api's own
// comment on this constant: a single static secret, insecure dev-only fallback,
// acceptable for this increment (a demo/dev CRM, not a system holding real secrets).
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me";

export interface VerifiedAuthTokenPayload {
  sub: string;
  navItemIds: string[];
  [key: string]: unknown;
}

export function verifyAuthToken(token: string): VerifiedAuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as VerifiedAuthTokenPayload;
}
