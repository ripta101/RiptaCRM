import type {
  AddProfileMemberInput,
  CreateProfileInput,
  Profile,
  UpdateProfileInput,
  UserSummary,
} from "@riptacrm/shared-types";

const BASE_URL = import.meta.env.VITE_ACCESS_MANAGEMENT_API_URL ?? "http://localhost:4314";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const listProfiles = (params: Record<string, string | undefined> = {}) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return request<{ results: Profile[] }>(`/api/profiles?${qs.toString()}`).then((r) => r.results);
};
export const getProfile = (id: string) => request<Profile>(`/api/profiles/${id}`);
export const createProfile = (input: CreateProfileInput) =>
  request<Profile>("/api/profiles", { method: "POST", body: JSON.stringify(input) });
export const updateProfile = (id: string, input: UpdateProfileInput) =>
  request<Profile>(`/api/profiles/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const archiveProfile = (id: string) =>
  request<Profile>(`/api/profiles/${id}/archive`, { method: "POST" });
export const deleteProfile = (id: string) => request<void>(`/api/profiles/${id}`, { method: "DELETE" });
export const addProfileMember = (profileId: string, input: AddProfileMemberInput) =>
  request<Profile>(`/api/profiles/${profileId}/members`, { method: "POST", body: JSON.stringify(input) });
export const removeProfileMember = (profileId: string, userId: string) =>
  request<void>(`/api/profiles/${profileId}/members/${userId}`, { method: "DELETE" });

// Users (for the member picker)
export const listUsers = () => request<{ results: UserSummary[] }>("/api/users").then((r) => r.results);
