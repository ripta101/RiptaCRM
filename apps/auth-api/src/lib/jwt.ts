import jwt from "jsonwebtoken";
import type { CustomMenuItem, DashboardType } from "@riptacrm/shared-types";

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
  profileId: string;
  profileName: string;
  dashboardType: DashboardType;
  canStartInteractions: boolean;
  navItemIds: string[];
  customMenuItems: CustomMenuItem[];
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

// Short-lived, purpose-scoped token issued when a user has more than one profile and
// must pick one before a real session begins. Kept structurally distinct from
// AuthTokenPayload (different claims, no capabilities baked in) so it can never be
// mistaken for — or accepted in place of — a full session token.
export interface PreAuthTokenPayload {
  sub: string;
  purpose: "profile-selection";
}

export interface VerifiedPreAuthTokenPayload extends PreAuthTokenPayload {
  iat: number;
  exp: number;
}

export function signPreAuthToken(payload: PreAuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "5m" });
}

export function verifyPreAuthToken(token: string): VerifiedPreAuthTokenPayload {
  const claims = jwt.verify(token, JWT_SECRET) as VerifiedPreAuthTokenPayload;
  if (claims.purpose !== "profile-selection") {
    throw new Error("Not a pre-auth token.");
  }
  return claims;
}
