import type {
  AddProfileMemberInput,
  AddSupervisedProfileInput,
  AddSupervisedQueueInput,
  CreateMenuItemInput,
  CreateProfileInput,
  CustomMenuItem,
  Profile,
  UpdateMenuItemInput,
  UpdateProfileInput,
  UserSummary,
} from "@riptacrm/shared-types";

const BASE_URL = import.meta.env.VITE_ACCESS_MANAGEMENT_API_URL ?? "http://localhost:4314";

async function request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) };
  if (init?.body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const listProfiles = (params: Record<string, string | undefined> = {}, token?: string | null) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return request<{ results: Profile[] }>(`/api/profiles?${qs.toString()}`, undefined, token).then((r) => r.results);
};
export const getProfile = (id: string, token?: string | null) =>
  request<Profile>(`/api/profiles/${id}`, undefined, token);
export const createProfile = (input: CreateProfileInput, token?: string | null) =>
  request<Profile>("/api/profiles", { method: "POST", body: JSON.stringify(input) }, token);
export const updateProfile = (id: string, input: UpdateProfileInput, token?: string | null) =>
  request<Profile>(`/api/profiles/${id}`, { method: "PATCH", body: JSON.stringify(input) }, token);
export const archiveProfile = (id: string, token?: string | null) =>
  request<Profile>(`/api/profiles/${id}/archive`, { method: "POST" }, token);
export const deleteProfile = (id: string, token?: string | null) =>
  request<void>(`/api/profiles/${id}`, { method: "DELETE" }, token);
export const addProfileMember = (profileId: string, input: AddProfileMemberInput, token?: string | null) =>
  request<Profile>(`/api/profiles/${profileId}/members`, { method: "POST", body: JSON.stringify(input) }, token);
export const removeProfileMember = (profileId: string, userId: string, token?: string | null) =>
  request<void>(`/api/profiles/${profileId}/members/${userId}`, { method: "DELETE" }, token);

// Supervisor-scope grants: which WebChat queues and which other Profiles this Profile's
// members may see on the Supervisor Dashboard.
export const addSupervisedQueue = (profileId: string, input: AddSupervisedQueueInput, token?: string | null) =>
  request<Profile>(`/api/profiles/${profileId}/supervised-queues`, { method: "POST", body: JSON.stringify(input) }, token);
export const removeSupervisedQueue = (profileId: string, queueId: string, token?: string | null) =>
  request<void>(`/api/profiles/${profileId}/supervised-queues/${queueId}`, { method: "DELETE" }, token);
export const addSupervisedProfile = (profileId: string, input: AddSupervisedProfileInput, token?: string | null) =>
  request<Profile>(`/api/profiles/${profileId}/supervised-profiles`, { method: "POST", body: JSON.stringify(input) }, token);
export const removeSupervisedProfile = (profileId: string, supervisedProfileId: string, token?: string | null) =>
  request<void>(`/api/profiles/${profileId}/supervised-profiles/${supervisedProfileId}`, { method: "DELETE" }, token);

// Users (for the member picker)
export const listUsers = (params: Record<string, string | undefined> = {}, token?: string | null) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return request<{ results: UserSummary[] }>(`/api/users?${qs.toString()}`, undefined, token).then((r) => r.results);
};

// WebChat queues (for the Supervised Queues picker) — proxied through this service's own
// backend (routes/webchatQueues.ts), same reasoning as the Users proxy above.
export const listWebchatQueues = (token?: string | null) =>
  request<{ results: { id: string; name: string }[] }>("/api/webchat-queues", undefined, token).then((r) => r.results);

// Menu items
export const listMenuItems = (token?: string | null) =>
  request<{ results: CustomMenuItem[] }>("/api/menu-items", undefined, token).then((r) => r.results);
export const getMenuItem = (id: string, token?: string | null) =>
  request<CustomMenuItem>(`/api/menu-items/${id}`, undefined, token);
export const createMenuItem = (input: CreateMenuItemInput, token?: string | null) =>
  request<CustomMenuItem>("/api/menu-items", { method: "POST", body: JSON.stringify(input) }, token);
export const updateMenuItem = (id: string, input: UpdateMenuItemInput, token?: string | null) =>
  request<CustomMenuItem>(`/api/menu-items/${id}`, { method: "PATCH", body: JSON.stringify(input) }, token);
export const deleteMenuItem = (id: string, token?: string | null) =>
  request<void>(`/api/menu-items/${id}`, { method: "DELETE" }, token);
