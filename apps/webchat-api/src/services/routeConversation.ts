import { prisma } from "../db";
import { matchRule } from "../lib/routingRules";
import { pickAssignee } from "../lib/assignment";

const ACCESS_MANAGEMENT_API_URL = process.env.ACCESS_MANAGEMENT_API_URL ?? "http://localhost:4314";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY ?? "dev-only-insecure-service-key-change-me";

// Checks the local per-agent override first (no network call); falls back to
// access-management-api's Profile-level default. Fails CLOSED to 0 on any error talking to
// access-management-api — silently over-assigning a live customer chat is worse than
// leaving it queued for a moment longer.
export async function resolveEffectiveCapacity(userId: string): Promise<number> {
  const override = await prisma.agentCapacityOverride.findUnique({ where: { userId } });
  if (override) return override.maxConcurrentChats;

  try {
    const res = await fetch(
      `${ACCESS_MANAGEMENT_API_URL}/api/profiles/default-webchat-capacity?userId=${encodeURIComponent(userId)}`,
      { headers: { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY } },
    );
    if (!res.ok) return 0;
    const data: { maxConcurrentChats: number | null } = await res.json();
    return data.maxConcurrentChats ?? 0;
  } catch (err) {
    console.error("Failed to resolve default webchat capacity from access-management-api:", err);
    return 0;
  }
}

async function currentOpenLoad(userId: string): Promise<number> {
  return prisma.conversation.count({ where: { assignedToUserId: userId, status: "OPEN" } });
}

// Whether this agent has manually marked themselves ready for chats right now — a real,
// admin-configurable status (AgentStatusOption.isAvailableForChats), not raw WebSocket
// connectivity. No row (never set, or cleared on login/logout — see ws/socketServer.ts) or
// a status not flagged isAvailableForChats both mean "not eligible."
export async function isAvailableForChats(userId: string): Promise<boolean> {
  const status = await prisma.agentStatus.findUnique({ where: { userId }, include: { option: true } });
  return status?.option?.isAvailableForChats === true;
}

// Most recent time this user was assigned a conversation *in this queue* — the round-robin
// ranking signal (see lib/assignment.ts). Scoped per queue, same as capacity/membership.
async function lastAssignedAt(userId: string, queueId: string): Promise<Date | null> {
  const conversation = await prisma.conversation.findFirst({
    where: { assignedToUserId: userId, assignedQueueId: queueId },
    orderBy: { assignedAt: "desc" },
    select: { assignedAt: true },
  });
  return conversation?.assignedAt ?? null;
}

interface RouteResult {
  matchedRuleId: string | null;
  autoReplyText: string | null;
  assignedQueueId: string | null;
  assignedToUserId: string | null;
}

// Matches the new conversation's pageUrlPath against the site's active routing rules,
// falls back to the site's defaultQueueId if nothing matches, then attempts a
// status-and-capacity-aware, round-robin auto-assignment to a member of the resolved queue.
// Does NOT emit socket events — the caller (routes/public.ts) does that after this
// resolves, since only it knows whether a live socket server is attached (see
// app.locals.io).
export async function routeNewConversation(siteId: string, pageUrlPath: string): Promise<RouteResult> {
  const [rules, site] = await Promise.all([
    prisma.routingRule.findMany({ where: { siteId } }),
    prisma.site.findUniqueOrThrow({ where: { id: siteId } }),
  ]);

  const matched = matchRule(rules, pageUrlPath);
  const assignedQueueId = matched?.targetQueueId ?? site.defaultQueueId ?? null;
  const autoReplyText = matched?.autoReplyText ?? null;

  if (!assignedQueueId) {
    return { matchedRuleId: matched?.id ?? null, autoReplyText, assignedQueueId: null, assignedToUserId: null };
  }

  const members = await prisma.webChatQueueMember.findMany({
    where: { queueId: assignedQueueId },
    orderBy: { createdAt: "asc" }, // deterministic tie-break — whoever joined the queue first
  });

  // Status is a hard eligibility gate, checked before bothering to compute capacity/recency
  // for a member who isn't ready to work anyway.
  const readyMembers = (
    await Promise.all(members.map(async (m) => ((await isAvailableForChats(m.userId)) ? m : null)))
  ).filter((m): m is (typeof members)[number] => m !== null);

  const candidates = await Promise.all(
    readyMembers.map(async (m) => ({
      userId: m.userId,
      currentLoad: await currentOpenLoad(m.userId),
      effectiveCapacity: await resolveEffectiveCapacity(m.userId),
      lastAssignedAt: await lastAssignedAt(m.userId, assignedQueueId),
    })),
  );

  const assignedToUserId = pickAssignee(candidates);

  return { matchedRuleId: matched?.id ?? null, autoReplyText, assignedQueueId, assignedToUserId };
}
