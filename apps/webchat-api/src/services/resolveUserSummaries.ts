import type { UserSummary } from "@riptacrm/shared-types";

const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://localhost:4312";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY ?? "dev-only-insecure-service-key-change-me";

// Shared fetch-users-from-auth-api plumbing — used by both routes/users.ts's general-purpose
// proxy (q/limit/ids passthrough for picker UIs like UserAutocomplete) and
// resolveUserSummaries below (a bounded by-id lookup for internal aggregation). Fails soft
// (empty results) on any error — this only ever powers a display, never a security decision.
export async function fetchUsersFromAuthApi(query: Record<string, string>): Promise<UserSummary[]> {
  try {
    const qs = new URLSearchParams(query);
    const res = await fetch(`${AUTH_API_URL}/api/users?${qs.toString()}`, {
      headers: { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY },
    });
    if (!res.ok) return [];
    const data: { results: UserSummary[] } = await res.json();
    return data.results;
  } catch (err) {
    console.error("Failed to fetch users from auth-api:", err);
    return [];
  }
}

// Bounded lookup by known ids (e.g. to resolve display names for a Supervisor Dashboard
// roster) — deliberately not subject to auth-api's take/limit default, bounded instead by
// the caller-supplied id list, same reasoning as routes/users.ts's own `ids` branch.
export async function resolveUserSummaries(userIds: string[]): Promise<Map<string, UserSummary>> {
  if (userIds.length === 0) return new Map();
  const results = await fetchUsersFromAuthApi({ ids: userIds.join(",") });
  return new Map(results.map((u) => [u.id, u]));
}
