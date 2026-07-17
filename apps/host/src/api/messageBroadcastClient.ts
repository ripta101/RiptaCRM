import type { MessageBroadcastSummary } from "@riptacrm/shared-types";

const BASE_URL = import.meta.env.VITE_MESSAGE_BROADCAST_API_URL ?? "http://localhost:4313";

export async function listActiveBroadcasts(role: string): Promise<MessageBroadcastSummary[]> {
  const qs = new URLSearchParams({ role });
  const res = await fetch(`${BASE_URL}/api/broadcasts/active?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to load broadcasts (${res.status})`);
  }
  const data: { results: MessageBroadcastSummary[] } = await res.json();
  return data.results;
}
