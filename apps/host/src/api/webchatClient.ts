import type { Conversation, WorklistItem } from "@riptacrm/shared-types";

const BASE_URL = import.meta.env.VITE_WEBCHAT_API_URL ?? "http://localhost:4315";

export async function listChatWorklist(userId: string, token?: string | null): Promise<WorklistItem[]> {
  const qs = new URLSearchParams({ userId });
  const res = await fetch(`${BASE_URL}/api/conversations/worklist?${qs.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Failed to load webchat worklist (${res.status})`);
  }
  const data: { results: WorklistItem[] } = await res.json();
  return data.results;
}

export async function claimConversation(conversationId: string, token?: string | null): Promise<Conversation> {
  const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}/claim`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Failed to claim conversation (${res.status})`);
  }
  return res.json();
}
