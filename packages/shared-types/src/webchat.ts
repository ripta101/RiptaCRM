// Reused as-is from Case Management's configurable-field vocabulary — already generic (no
// case-specific members), so no new type system for pre-chat fields below.
import type { FieldType } from "./case";

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

// Admin-configurable, per-Site — asked of a visitor before their first conversation starts
// (see webchat-widget's PreChatForm). Mirrors Case Management's FieldDefinition shape.
export interface PreChatFieldDefinition {
  id: string;
  siteId: string;
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  options: string[] | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePreChatFieldInput {
  siteId: string;
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  options?: string[];
  displayOrder: number;
}

export type UpdatePreChatFieldInput = Partial<Omit<CreatePreChatFieldInput, "siteId">>;

// A single answer a visitor gave to a PreChatField, captured when their conversation was
// created. `label` is a snapshot from submission time, not a live join — see webchat-api's
// ConversationIntakeValue model.
export interface ConversationIntakeValue {
  fieldKey: string;
  label: string;
  value: string;
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
  intakeValues: ConversationIntakeValue[];
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
  // Only meaningful (and validated) when actually creating a fresh conversation on a site
  // that has PreChatFields configured — ignored when resuming an existing one.
  intakeValues?: { fieldKey: string; value: string }[];
}

export interface SendMessageRequest {
  siteKey: string;
  body: string;
}

// Links an identified customer to a conversation — see webchat-api's PATCH /conversations/:id.
export interface LinkConversationCustomerInput {
  customerAccountId: string;
}

// Supervisor Dashboard — see webchat-api's routes/supervisor.ts.
export interface SupervisorScopeQueue {
  id: string;
  name: string;
}

export interface SupervisorScopeProfile {
  id: string;
  name: string;
}

export interface SupervisorAgentSummary {
  userId: string;
  name: string;
  username: string;
  statusLabel: string | null;
  isAvailableForChats: boolean;
  // Which of the supervisor's granted queues/profiles make this agent visible — an agent
  // can be visible via more than one grant at once (union semantics).
  visibleViaQueueIds: string[];
  visibleViaProfileIds: string[];
  activeInteractionCount: number;
  answeredCount: number;
}

export interface SupervisorAgentsResponse {
  scope: {
    queues: SupervisorScopeQueue[];
    profiles: SupervisorScopeProfile[];
  };
  results: SupervisorAgentSummary[];
}
