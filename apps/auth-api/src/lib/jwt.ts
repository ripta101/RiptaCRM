import jwt from "jsonwebtoken";
import type { UserRole } from "@riptacrm/shared-types";

// Known simplification: a single static secret from env, with an insecure dev-only
// fallback, no rotation, no per-environment secret management. Acceptable for this
// increment (a demo/dev CRM, not a system holding real secrets) — flagged here so it
// isn't mistaken for an oversight later.
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "8h";

export interface AuthTokenPayload {
  sub: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface VerifiedAuthTokenPayload extends AuthTokenPayload {
  iat: number;
  exp: number;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyAuthToken(token: string): VerifiedAuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as VerifiedAuthTokenPayload;
}
