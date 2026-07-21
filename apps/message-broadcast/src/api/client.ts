import type {
  CreateMessageBroadcastInput,
  MessageBroadcastSummary,
  Profile,
  UpdateMessageBroadcastInput,
} from "@riptacrm/shared-types";

const BASE_URL = import.meta.env.VITE_MESSAGE_BROADCAST_API_URL ?? "http://localhost:4313";

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

export const listBroadcasts = (token?: string | null) =>
  request<{ results: MessageBroadcastSummary[] }>("/api/broadcasts", undefined, token).then((r) => r.results);
export const getBroadcast = (id: string, token?: string | null) =>
  request<MessageBroadcastSummary>(`/api/broadcasts/${id}`, undefined, token);
export const createBroadcast = (input: CreateMessageBroadcastInput, token?: string | null) =>
  request<MessageBroadcastSummary>(
    "/api/broadcasts",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
export const updateBroadcast = (id: string, input: UpdateMessageBroadcastInput, token?: string | null) =>
  request<MessageBroadcastSummary>(
    `/api/broadcasts/${id}`,
    { method: "PATCH", body: JSON.stringify(input) },
    token,
  );
export const cancelBroadcast = (id: string, token?: string | null) =>
  request<MessageBroadcastSummary>(`/api/broadcasts/${id}/cancel`, { method: "POST" }, token);
export const deleteBroadcast = (id: string, token?: string | null) =>
  request<void>(`/api/broadcasts/${id}`, { method: "DELETE" }, token);

// Powers the composer's "target profiles" checkbox list.
export const listProfiles = (token?: string | null) =>
  request<{ results: Profile[] }>("/api/profiles", undefined, token).then((r) => r.results);
