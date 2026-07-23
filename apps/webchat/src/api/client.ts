import type {
  AddWebChatQueueMemberInput,
  AgentCapacityOverride,
  AgentStatusOption,
  Conversation,
  ConversationWithMessages,
  CreateAgentStatusOptionInput,
  CreatePreChatFieldInput,
  CreateRoutingRuleInput,
  CreateSiteInput,
  CreateWebChatQueueInput,
  Message,
  PreChatFieldDefinition,
  RoutingRule,
  Site,
  SupervisorAgentsResponse,
  UpdateAgentStatusOptionInput,
  UpdatePreChatFieldInput,
  UpdateRoutingRuleInput,
  UpdateSiteInput,
  UpdateWebChatQueueInput,
  UserSummary,
  WebChatQueue,
} from "@riptacrm/shared-types";

const BASE_URL = import.meta.env.VITE_WEBCHAT_API_URL ?? "http://localhost:4315";

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

// Sites
export const listSites = (token?: string | null) =>
  request<{ results: Site[] }>("/api/sites", undefined, token).then((r) => r.results);
export const getSite = (id: string, token?: string | null) => request<Site>(`/api/sites/${id}`, undefined, token);
export const createSite = (input: CreateSiteInput, token?: string | null) =>
  request<Site>("/api/sites", { method: "POST", body: JSON.stringify(input) }, token);
export const updateSite = (id: string, input: UpdateSiteInput, token?: string | null) =>
  request<Site>(`/api/sites/${id}`, { method: "PATCH", body: JSON.stringify(input) }, token);
export const regenerateSiteKey = (id: string, token?: string | null) =>
  request<Site>(`/api/sites/${id}/regenerate-key`, { method: "POST" }, token);

// Queues
export const listQueues = (token?: string | null) =>
  request<{ results: WebChatQueue[] }>("/api/queues", undefined, token).then((r) => r.results);
export const getQueue = (id: string, token?: string | null) =>
  request<WebChatQueue>(`/api/queues/${id}`, undefined, token);
export const createQueue = (input: CreateWebChatQueueInput, token?: string | null) =>
  request<WebChatQueue>("/api/queues", { method: "POST", body: JSON.stringify(input) }, token);
export const updateQueue = (id: string, input: UpdateWebChatQueueInput, token?: string | null) =>
  request<WebChatQueue>(`/api/queues/${id}`, { method: "PATCH", body: JSON.stringify(input) }, token);
export const addQueueMember = (queueId: string, input: AddWebChatQueueMemberInput, token?: string | null) =>
  request<WebChatQueue>(`/api/queues/${queueId}/members`, { method: "POST", body: JSON.stringify(input) }, token);
export const removeQueueMember = (queueId: string, userId: string, token?: string | null) =>
  request<void>(`/api/queues/${queueId}/members/${userId}`, { method: "DELETE" }, token);

// Routing rules
export const listRoutingRules = (siteId: string, token?: string | null) => {
  const qs = new URLSearchParams({ siteId });
  return request<{ results: RoutingRule[] }>(`/api/routing-rules?${qs.toString()}`, undefined, token).then(
    (r) => r.results,
  );
};
export const getRoutingRule = (id: string, token?: string | null) =>
  request<RoutingRule>(`/api/routing-rules/${id}`, undefined, token);
export const createRoutingRule = (input: CreateRoutingRuleInput, token?: string | null) =>
  request<RoutingRule>("/api/routing-rules", { method: "POST", body: JSON.stringify(input) }, token);
export const updateRoutingRule = (id: string, input: UpdateRoutingRuleInput, token?: string | null) =>
  request<RoutingRule>(`/api/routing-rules/${id}`, { method: "PATCH", body: JSON.stringify(input) }, token);
export const deleteRoutingRule = (id: string, token?: string | null) =>
  request<void>(`/api/routing-rules/${id}`, { method: "DELETE" }, token);

// Pre-chat fields
export const listPreChatFields = (siteId: string, token?: string | null) => {
  const qs = new URLSearchParams({ siteId });
  return request<{ results: PreChatFieldDefinition[] }>(`/api/prechat-fields?${qs.toString()}`, undefined, token).then(
    (r) => r.results,
  );
};
export const createPreChatField = (input: CreatePreChatFieldInput, token?: string | null) =>
  request<PreChatFieldDefinition>("/api/prechat-fields", { method: "POST", body: JSON.stringify(input) }, token);
export const updatePreChatField = (id: string, input: UpdatePreChatFieldInput, token?: string | null) =>
  request<PreChatFieldDefinition>(`/api/prechat-fields/${id}`, { method: "PATCH", body: JSON.stringify(input) }, token);
export const deletePreChatField = (id: string, token?: string | null) =>
  request<void>(`/api/prechat-fields/${id}`, { method: "DELETE" }, token);

// Capacity overrides
export const listCapacityOverrides = (params: Record<string, string | undefined> = {}, token?: string | null) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return request<{ results: AgentCapacityOverride[] }>(`/api/capacity-overrides?${qs.toString()}`, undefined, token).then(
    (r) => r.results,
  );
};
export const putCapacityOverride = (userId: string, maxConcurrentChats: number, token?: string | null) =>
  request<AgentCapacityOverride>(
    `/api/capacity-overrides/${userId}`,
    { method: "PUT", body: JSON.stringify({ maxConcurrentChats }) },
    token,
  );
export const deleteCapacityOverride = (userId: string, token?: string | null) =>
  request<void>(`/api/capacity-overrides/${userId}`, { method: "DELETE" }, token);

// Agent status options
export const listAgentStatusOptions = (token?: string | null) =>
  request<{ results: AgentStatusOption[] }>("/api/agent-status-options", undefined, token).then((r) => r.results);
export const createAgentStatusOption = (input: CreateAgentStatusOptionInput, token?: string | null) =>
  request<AgentStatusOption>("/api/agent-status-options", { method: "POST", body: JSON.stringify(input) }, token);
export const updateAgentStatusOption = (id: string, input: UpdateAgentStatusOptionInput, token?: string | null) =>
  request<AgentStatusOption>(`/api/agent-status-options/${id}`, { method: "PATCH", body: JSON.stringify(input) }, token);
export const deleteAgentStatusOption = (id: string, token?: string | null) =>
  request<void>(`/api/agent-status-options/${id}`, { method: "DELETE" }, token);

// Conversations
export const listConversations = (params: Record<string, string | undefined> = {}, token?: string | null) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return request<{ results: Conversation[] }>(`/api/conversations?${qs.toString()}`, undefined, token).then(
    (r) => r.results,
  );
};
export const getConversation = (id: string, token?: string | null) =>
  request<ConversationWithMessages>(`/api/conversations/${id}`, undefined, token);
export const assignConversation = (id: string, input: { assignedToUserId: string }, token?: string | null) =>
  request<Conversation>(`/api/conversations/${id}/assign`, { method: "POST", body: JSON.stringify(input) }, token);
export const sendAgentMessage = (id: string, body: string, token?: string | null) =>
  request<Message>(`/api/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ body }) }, token);
export const closeConversation = (id: string, token?: string | null) =>
  request<Conversation>(`/api/conversations/${id}/close`, { method: "POST" }, token);

// Supervisor Dashboard
export const getSupervisorAgents = (
  params: { closedFrom: string; closedTo: string; queueId?: string; supervisedProfileId?: string; userId?: string },
  token?: string | null,
) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return request<SupervisorAgentsResponse>(`/api/supervisor/agents?${qs.toString()}`, undefined, token);
};

// Users (for the member/agent pickers)
export const listUsers = (params: Record<string, string | undefined> = {}, token?: string | null) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return request<{ results: UserSummary[] }>(`/api/users?${qs.toString()}`, undefined, token).then((r) => r.results);
};
