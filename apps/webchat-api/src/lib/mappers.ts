import type {
  AgentCapacityOverride as PrismaAgentCapacityOverride,
  Conversation as PrismaConversation,
  Message as PrismaMessage,
  RoutingRule as PrismaRoutingRule,
  Site as PrismaSite,
  WebChatQueue as PrismaWebChatQueue,
  WebChatQueueMember as PrismaWebChatQueueMember,
} from "../../generated/prisma";
import type {
  AgentCapacityOverride,
  Conversation,
  ConversationWithMessages,
  Message,
  RoutingRule,
  RoutingRuleMatchType,
  Site,
  WebChatQueue,
} from "@riptacrm/shared-types";

export function toSite(s: PrismaSite): Site {
  return {
    id: s.id,
    name: s.name,
    siteKey: s.siteKey,
    allowedOrigins: s.allowedOrigins,
    defaultQueueId: s.defaultQueueId,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function toWebChatQueue(q: PrismaWebChatQueue & { members: PrismaWebChatQueueMember[] }): WebChatQueue {
  return {
    id: q.id,
    name: q.name,
    autoPopup: q.autoPopup,
    memberUserIds: q.members.map((m) => m.userId),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

export function toRoutingRule(r: PrismaRoutingRule): RoutingRule {
  return {
    id: r.id,
    siteId: r.siteId,
    pattern: r.pattern,
    matchType: r.matchType as RoutingRuleMatchType,
    priority: r.priority,
    autoReplyText: r.autoReplyText,
    targetQueueId: r.targetQueueId,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function toAgentCapacityOverride(o: PrismaAgentCapacityOverride): AgentCapacityOverride {
  return { userId: o.userId, maxConcurrentChats: o.maxConcurrentChats };
}

export function toConversation(c: PrismaConversation): Conversation {
  return {
    id: c.id,
    siteId: c.siteId,
    customerAccountId: c.customerAccountId,
    pageUrlPath: c.pageUrlPath,
    pageUrlFull: c.pageUrlFull,
    status: c.status as Conversation["status"],
    assignedToUserId: c.assignedToUserId,
    assignedQueueId: c.assignedQueueId,
    matchedRuleId: c.matchedRuleId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    closedAt: c.closedAt ? c.closedAt.toISOString() : null,
  };
}

export function toMessage(m: PrismaMessage): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderType: m.senderType as Message["senderType"],
    senderUserId: m.senderUserId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}

export function toConversationWithMessages(
  c: PrismaConversation & { messages: PrismaMessage[] },
): ConversationWithMessages {
  return {
    ...toConversation(c),
    messages: c.messages.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map(toMessage),
  };
}
