import { Router } from "express";
import type { SupervisorAgentsResponse } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { verifyAuthToken } from "../lib/jwt";
import { toAgentStatusOption } from "../lib/mappers";
import { requirePermission } from "../lib/requirePermission";
import { resolveVisibleUserIds } from "../lib/supervisorVisibility";
import { resolveSupervisorScope } from "../services/resolveSupervisorScope";
import { countAgentInteractions } from "../services/supervisorAgents";
import { resolveUserSummaries } from "../services/resolveUserSummaries";

export const supervisorRouter = Router();

// The route needs to know WHICH supervisor is calling, to resolve THEIR own supervised
// scope — decoded from the bearer token itself (re-verify for identity), same posture as
// conversations.ts's extractUserId, rather than trusting a client-supplied profileId query
// param. A service-key call (no JWT) correctly yields null here.
function extractSupervisorProfileId(authHeader: string | undefined): string | null {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const claims = verifyAuthToken(token);
    return typeof claims.profileId === "string" ? claims.profileId : null;
  } catch {
    return null;
  }
}

supervisorRouter.get("/supervisor/agents", requirePermission("webchat-supervisor"), async (req, res) => {
  const profileId = extractSupervisorProfileId(req.headers.authorization);
  if (!profileId) return res.status(401).json({ error: "Authentication required." });

  const closedFromRaw = typeof req.query.closedFrom === "string" ? req.query.closedFrom : "";
  const closedToRaw = typeof req.query.closedTo === "string" ? req.query.closedTo : "";
  const closedFrom = new Date(closedFromRaw);
  const closedTo = new Date(closedToRaw);
  if (!closedFromRaw || !closedToRaw || Number.isNaN(closedFrom.getTime()) || Number.isNaN(closedTo.getTime())) {
    return res.status(400).json({ error: "closedFrom and closedTo (ISO datetimes) are required." });
  }

  const scope = await resolveSupervisorScope(profileId);

  const [queues, queueMemberships] = await Promise.all([
    scope.supervisedQueueIds.length
      ? prisma.webChatQueue.findMany({ where: { id: { in: scope.supervisedQueueIds } } })
      : Promise.resolve([]),
    scope.supervisedQueueIds.length
      ? prisma.webChatQueueMember.findMany({ where: { queueId: { in: scope.supervisedQueueIds } } })
      : Promise.resolve([]),
  ]);

  // Optional narrowing filters — these can only narrow within the resolved scope, never
  // expand beyond it (a supervisor can't filter their way into seeing an agent outside
  // their granted queues/profiles).
  const queueIdFilter = typeof req.query.queueId === "string" ? req.query.queueId : null;
  const profileIdFilter = typeof req.query.supervisedProfileId === "string" ? req.query.supervisedProfileId : null;
  const userIdFilter = typeof req.query.userId === "string" ? req.query.userId : null;

  const filteredQueueMemberships = queueIdFilter ? queueMemberships.filter((m) => m.queueId === queueIdFilter) : queueMemberships;
  const filteredProfiles = profileIdFilter ? scope.supervisedProfiles.filter((p) => p.id === profileIdFilter) : scope.supervisedProfiles;

  let candidateUserIds = resolveVisibleUserIds(
    filteredQueueMemberships.map((m) => m.userId),
    filteredProfiles,
  );
  if (userIdFilter) candidateUserIds = candidateUserIds.filter((id) => id === userIdFilter);

  const [statuses, counts, users] = await Promise.all([
    candidateUserIds.length
      ? prisma.agentStatus.findMany({ where: { userId: { in: candidateUserIds } }, include: { option: true } })
      : Promise.resolve([]),
    countAgentInteractions(candidateUserIds, closedFrom, closedTo),
    resolveUserSummaries(candidateUserIds),
  ]);
  const statusByUserId = new Map(statuses.map((s) => [s.userId, s]));

  const results = candidateUserIds.map((userId) => {
    const status = statusByUserId.get(userId);
    const option = status?.option ? toAgentStatusOption(status.option) : null;
    const agentCounts = counts.get(userId);
    const user = users.get(userId);
    return {
      userId,
      name: user?.name ?? userId,
      username: user?.username ?? "—",
      statusLabel: option?.label ?? null,
      isAvailableForChats: option?.isAvailableForChats ?? false,
      visibleViaQueueIds: filteredQueueMemberships.filter((m) => m.userId === userId).map((m) => m.queueId),
      visibleViaProfileIds: filteredProfiles.filter((p) => p.memberUserIds.includes(userId)).map((p) => p.id),
      activeInteractionCount: agentCounts?.activeInteractionCount ?? 0,
      answeredCount: agentCounts?.answeredCount ?? 0,
    };
  });

  const response: SupervisorAgentsResponse = {
    scope: {
      queues: queues.map((q) => ({ id: q.id, name: q.name })),
      profiles: scope.supervisedProfiles.map((p) => ({ id: p.id, name: p.name })),
    },
    results,
  };
  res.json(response);
});
