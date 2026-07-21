import type {
  CreateMessageBroadcastInput,
  MessageBroadcastSummary,
  Profile,
  UpdateMessageBroadcastInput,
} from "@riptacrm/shared-types";

const BASE_URL = import.meta.env.VITE_MESSAGE_BROADCAST_API_URL ?? "http://localhost:4313";

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

export const listBroadcasts = () =>
  request<{ results: MessageBroadcastSummary[] }>("/api/broadcasts").then((r) => r.results);
export const getBroadcast = (id: string) => request<MessageBroadcastSummary>(`/api/broadcasts/${id}`);
export const createBroadcast = (input: CreateMessageBroadcastInput) =>
  request<MessageBroadcastSummary>("/api/broadcasts", { method: "POST", body: JSON.stringify(input) });
export const updateBroadcast = (id: string, input: UpdateMessageBroadcastInput) =>
  request<MessageBroadcastSummary>(`/api/broadcasts/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const cancelBroadcast = (id: string) =>
  request<MessageBroadcastSummary>(`/api/broadcasts/${id}/cancel`, { method: "POST" });
export const deleteBroadcast = (id: string) =>
  request<void>(`/api/broadcasts/${id}`, { method: "DELETE" });

// Powers the composer's "target profiles" checkbox list.
export const listProfiles = () => request<{ results: Profile[] }>("/api/profiles").then((r) => r.results);
