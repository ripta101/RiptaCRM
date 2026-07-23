const ACCESS_MANAGEMENT_API_URL = process.env.ACCESS_MANAGEMENT_API_URL ?? "http://localhost:4314";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY ?? "dev-only-insecure-service-key-change-me";

export interface SupervisorScope {
  supervisedQueueIds: string[];
  supervisedProfiles: { id: string; name: string; memberUserIds: string[] }[];
}

const EMPTY_SCOPE: SupervisorScope = { supervisedQueueIds: [], supervisedProfiles: [] };

// Fails soft to an empty scope on any error — unlike resolveEffectiveCapacity's fail-CLOSED
// (routing money-critical work), this only powers a display, so a temporarily-unreachable
// access-management-api should show an empty dashboard, not 500 the whole page. Two round
// trips: the supervisor's own Profile (for its grant lists), then one GET /profiles/:id per
// supervised profile (small N) for names + membership — both existing, unchanged
// access-management-api routes.
export async function resolveSupervisorScope(profileId: string): Promise<SupervisorScope> {
  try {
    const ownProfileRes = await fetch(`${ACCESS_MANAGEMENT_API_URL}/api/profiles/${profileId}`, {
      headers: { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY },
    });
    if (!ownProfileRes.ok) return EMPTY_SCOPE;
    const own: { supervisedQueueIds: string[]; supervisedProfileIds: string[] } = await ownProfileRes.json();

    const supervisedProfiles = await Promise.all(
      own.supervisedProfileIds.map(async (id) => {
        const res = await fetch(`${ACCESS_MANAGEMENT_API_URL}/api/profiles/${id}`, {
          headers: { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY },
        });
        if (!res.ok) return null;
        const p: { id: string; name: string; memberUserIds: string[] } = await res.json();
        return { id: p.id, name: p.name, memberUserIds: p.memberUserIds };
      }),
    );

    return {
      supervisedQueueIds: own.supervisedQueueIds,
      supervisedProfiles: supervisedProfiles.filter((p): p is NonNullable<typeof p> => p !== null),
    };
  } catch (err) {
    console.error("Failed to resolve supervisor scope from access-management-api:", err);
    return EMPTY_SCOPE;
  }
}
