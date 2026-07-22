export interface Site {
  id: string;
  name: string;
  siteKey: string;
  allowedOrigins: string | null;
  defaultQueueId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSiteInput {
  name: string;
  allowedOrigins?: string | null;
  defaultQueueId?: string | null;
}

export type UpdateSiteInput = Partial<CreateSiteInput> & { isActive?: boolean };

export type RoutingRuleMatchType = "EXACT" | "PREFIX";

export interface RoutingRule {
  id: string;
  siteId: string;
  pattern: string;
  matchType: RoutingRuleMatchType;
  priority: number;
  autoReplyText: string;
  targetQueueId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoutingRuleInput {
  siteId: string;
  pattern: string;
  matchType?: RoutingRuleMatchType;
  priority?: number;
  autoReplyText: string;
  targetQueueId: string;
  isActive?: boolean;
}

export type UpdateRoutingRuleInput = Partial<Omit<CreateRoutingRuleInput, "siteId">>;

export interface WebChatQueue {
  id: string;
  name: string;
  autoPopup: boolean;
  memberUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebChatQueueInput {
  name: string;
}

export type UpdateWebChatQueueInput = Partial<CreateWebChatQueueInput> & { autoPopup?: boolean };

export interface AddWebChatQueueMemberInput {
  userId: string;
}

export interface AgentCapacityOverride {
  userId: string;
  maxConcurrentChats: number;
}

// Admin-configurable list an agent picks from (e.g. Available, Lunch, Administration) —
// only options with isAvailableForChats are eligible to receive/claim chats.
export interface AgentStatusOption {
  id: string;
  label: string;
  isAvailableForChats: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentStatusOptionInput {
  label: string;
  isAvailableForChats?: boolean;
}

export type UpdateAgentStatusOptionInput = Partial<CreateAgentStatusOptionInput>;

// The logged-in agent's own current pick — always "mine," no userId needed client-side.
// Cleared (optionId: null) server-side on every login/logout — see webchat-api's
// ws/socketServer.ts.
export interface AgentStatus {
  optionId: string | null;
  updatedAt: string;
}

export interface SetAgentStatusInput {
  optionId: string | null;
}

export type ConversationStatus = "OPEN" | "CLOSED";

export type MessageSenderType = "VISITOR" | "AGENT" | "SYSTEM";

export interface Conversation {
  id: string;
  siteId: string;
  // Nullable forward-compat seam for a future authenticated-customer identity — always
  // null today, since there's no customer login anywhere in this app yet.
  customerAccountId: string | null;
  pageUrlPath: string;
  pageUrlFull: string | null;
  status: ConversationStatus;
  assignedToUserId: string | null;
  assignedQueueId: string | null;
  matchedRuleId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: MessageSenderType;
  senderUserId: string | null;
  body: string;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// Public (widget-facing) request/response shapes — these routes carry no JWT, siteKey is
// the only credential, and it's deliberately not a secret (see webchat-api's requirePermission
// carve-out).
export interface StartConversationRequest {
  siteKey: string;
  conversationId?: string;
  pageUrlPath: string;
  pageUrlFull?: string;
}

export interface SendMessageRequest {
  siteKey: string;
  body: string;
}
