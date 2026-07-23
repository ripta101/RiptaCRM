/**
 * Thin fetch wrappers against webchat-api, used only for E2E test setup/teardown (creating
 * throwaway fixtures before driving the UI, deleting them afterward) — never to replace the
 * UI interactions the specs are actually meant to exercise.
 */
const BASE_URL = "http://localhost:4315";
// Matches every service's INTERNAL_SERVICE_KEY dev-only fallback (see .env.e2e) — a known,
// hardcoded value, same spirit as this file already hardcoding seeded ids like "user-1".
const SERVICE_KEY_HEADERS = { "X-Internal-Service-Key": "dev-only-insecure-service-key-change-me" };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...SERVICE_KEY_HEADERS, ...init.headers }
      : { ...SERVICE_KEY_HEADERS, ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status}): ${body?.error ?? "unknown error"}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface ThrowawayQueue {
  id: string;
}

export async function createThrowawayQueue(name: string, autoPopup: boolean): Promise<ThrowawayQueue> {
  const queue = await request<{ id: string }>("/api/queues", { method: "POST", body: JSON.stringify({ name }) });
  if (autoPopup) {
    await request(`/api/queues/${queue.id}`, { method: "PATCH", body: JSON.stringify({ autoPopup: true }) });
  }
  return queue;
}

export async function addQueueMember(queueId: string, userId: string): Promise<void> {
  await request(`/api/queues/${queueId}/members`, { method: "POST", body: JSON.stringify({ userId }) });
}

export async function deleteQueue(queueId: string): Promise<void> {
  await request(`/api/queues/${queueId}`, { method: "DELETE" });
}

export interface ThrowawaySite {
  id: string;
  siteKey: string;
}

export async function createThrowawaySite(name: string, defaultQueueId: string): Promise<ThrowawaySite> {
  return request<ThrowawaySite>("/api/sites", { method: "POST", body: JSON.stringify({ name, defaultQueueId }) });
}

export async function deleteSite(siteId: string): Promise<void> {
  await request(`/api/sites/${siteId}`, { method: "DELETE" }).catch(() => undefined);
}

export async function createRoutingRule(input: {
  siteId: string;
  pattern: string;
  autoReplyText: string;
  targetQueueId: string;
}): Promise<{ id: string }> {
  return request<{ id: string }>("/api/routing-rules", { method: "POST", body: JSON.stringify(input) });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await request(`/api/conversations/${conversationId}`, { method: "DELETE" }).catch(() => undefined);
}

export async function closeConversation(conversationId: string): Promise<void> {
  await request(`/api/conversations/${conversationId}/close`, { method: "POST" });
}

export async function getConversation(conversationId: string): Promise<{ customerAccountId: string | null }> {
  return request(`/api/conversations/${conversationId}`);
}

export async function grantCapacityOverride(userId: string, maxConcurrentChats: number): Promise<void> {
  await request(`/api/capacity-overrides/${userId}`, { method: "PUT", body: JSON.stringify({ maxConcurrentChats }) });
}

export async function deleteCapacityOverride(userId: string): Promise<void> {
  await request(`/api/capacity-overrides/${userId}`, { method: "DELETE" }).catch(() => undefined);
}

export interface AgentStatusOption {
  id: string;
  label: string;
  isAvailableForChats: boolean;
}

export async function getAgentStatusOptions(): Promise<AgentStatusOption[]> {
  const { results } = await request<{ results: AgentStatusOption[] }>("/api/agent-status-options");
  return results;
}

// Uses the admin escape hatch (PUT /api/agent-status/:userId), not the self-service /me
// route — test setup here is about seeding a *different* user's status than whichever
// agent the spec logs in as, not exercising the TopBar status picker itself.
export async function setAgentStatus(userId: string, optionId: string | null): Promise<void> {
  await request(`/api/agent-status/${userId}`, { method: "PUT", body: JSON.stringify({ optionId }) });
}
