/**
 * Thin fetch wrappers against access-management-api, used only for E2E test setup/teardown
 * (creating throwaway fixtures before driving the UI, deleting them afterward) — never
 * to replace the UI interactions the specs are actually meant to exercise.
 */
const BASE_URL = "http://localhost:4314";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status}): ${body?.error ?? "unknown error"}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface ThrowawayProfile {
  id: string;
}

export async function createThrowawayProfile(
  name: string,
  overrides: { dashboardType?: "frontline" | "admin"; canStartInteractions?: boolean } = {},
): Promise<ThrowawayProfile> {
  return request<ThrowawayProfile>("/api/profiles", {
    method: "POST",
    body: JSON.stringify({
      name,
      dashboardType: overrides.dashboardType ?? "frontline",
      canStartInteractions: overrides.canStartInteractions ?? false,
    }),
  });
}

export async function deleteProfile(profileId: string): Promise<void> {
  await request(`/api/profiles/${profileId}`, { method: "DELETE" });
}

export async function addProfileMember(profileId: string, userId: string): Promise<void> {
  await request(`/api/profiles/${profileId}/members`, { method: "POST", body: JSON.stringify({ userId }) });
}

export async function removeProfileMember(profileId: string, userId: string): Promise<void> {
  await request(`/api/profiles/${profileId}/members/${userId}`, { method: "DELETE" });
}
