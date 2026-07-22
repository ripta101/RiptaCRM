import type { AgentStatus, AgentStatusOption, Conversation, WorklistItem } from "@riptacrm/shared-types";

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

export async function listAgentStatusOptions(token?: string | null): Promise<AgentStatusOption[]> {
  const res = await fetch(`${BASE_URL}/api/agent-status-options`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Failed to load agent status options (${res.status})`);
  const data: { results: AgentStatusOption[] } = await res.json();
  return data.results;
}

export async function getMyAgentStatus(token?: string | null): Promise<AgentStatus | null> {
  const res = await fetch(`${BASE_URL}/api/agent-status/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Failed to load agent status (${res.status})`);
  return res.json();
}

export async function setMyAgentStatus(optionId: string | null, token?: string | null): Promise<AgentStatus> {
  const res = await fetch(`${BASE_URL}/api/agent-status/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : undefined),
    },
    body: JSON.stringify({ optionId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Failed to set agent status (${res.status})`);
  }
  return res.json();
}
