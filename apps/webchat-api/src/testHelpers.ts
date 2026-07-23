import jwt from "jsonwebtoken";

// Test-only helpers for exercising requirePermission-gated routes in vitest. Not shipped.
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY ?? "dev-only-insecure-service-key-change-me";

export function signTestToken(navItemIds: string[] = [], extraClaims: Record<string, unknown> = {}): string {
  return jwt.sign({ sub: "test-user", navItemIds, ...extraClaims }, JWT_SECRET, { expiresIn: "1h" });
}

export const SERVICE_KEY_HEADER = { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY } as const;
