import type { Server } from "socket.io";
import { Router } from "express";
import type { WorklistItem } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { verifyAuthToken } from "../lib/jwt";
import { toConversation, toConversationWithMessages, toMessage } from "../lib/mappers";
import { requirePermission } from "../lib/requirePermission";
import { isAvailableForChats, resolveEffectiveCapacity } from "../services/routeConversation";
import { emitToAgent, emitToConversationRoom } from "../ws/socketServer";

export const conversationsRouter = Router();

function getIo(req: { app: { locals: { io?: Server } } }): Server | undefined {
  return req.app.locals.io;
}

conversationsRouter.get("/conversations", requirePermission("webchat-config"), async (req, res) => {
  const where: Record<string, unknown> = {};
  if (typeof req.query.status === "string") where.status = req.query.status;
  if (typeof req.query.assignedQueueId === "string") where.assignedQueueId = req.query.assignedQueueId;
  if (req.query.unassigned === "true") where.assignedToUserId = null;

  const conversations = await prisma.conversation.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json({ results: conversations.map(toConversation) });
});

conversationsRouter.get(
  "/conversations/worklist",
  requirePermission(),
  async (req, res) => {
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    if (!userId) return res.status(400).json({ error: "userId query parameter is required." });

    const [assigned, memberships] = await Promise.all([
      prisma.conversation.findMany({
        where: { assignedToUserId: userId, status: "OPEN" },
        include: { assignedQueue: true },
      }),
      prisma.webChatQueueMember.findMany({ where: { userId } }),
    ]);

    const memberQueueIds = memberships.map((m) => m.queueId);
    const claimable = memberQueueIds.length
      ? await prisma.conversation.findMany({
          where: { status: "OPEN", assignedToUserId: null, assignedQueueId: { in: memberQueueIds } },
          include: { assignedQueue: true },
        })
      : [];

    const items: WorklistItem[] = [
      ...assigned.map((c) => toWorklistItem(c, false)),
      ...claimable.map((c) => toWorklistItem(c, true)),
    ];
    res.json({ results: items });
  },
);

function toWorklistItem(
  c: { id: string; pageUrlPath: string; createdAt: Date; status: string; assignedQueue: { autoPopup: boolean } | null },
  claimable: boolean,
): WorklistItem {
  return {
    id: c.id,
    kind: "webchat",
    title: "Web Chat",
    subtitle: c.pageUrlPath,
    dueAt: null,
    breached: false,
    status: c.status,
    claimable,
    autoPopup: c.assignedQueue?.autoPopup ?? false,
  };
}

// Any authenticated user, not just webchat-config admins — this is also how an agent's
// own WebChatAgentModule (their live chat panel) reads a conversation's transcript once
// it's open in an interaction tab. No per-record ownership check (is this MY conversation)
// — consistent with this app's established "permission-level gating only" posture.
conversationsRouter.get("/conversations/:id", requirePermission(), async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: { messages: true },
  });
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });
  res.json(toConversationWithMessages(conversation));
});

// No frontline-facing UI ever deletes a conversation — this exists for admin/test cleanup,
// mirroring the orphan DELETE routes case-management-api keeps for the same reason.
conversationsRouter.delete("/conversations/:id", requirePermission("webchat-config"), async (req, res) => {
  await prisma.message.deleteMany({ where: { conversationId: req.params.id } });
  await prisma.conversation.deleteMany({ where: { id: req.params.id } });
  res.status(204).end();
});

conversationsRouter.post("/conversations/:id/assign", requirePermission("webchat-config"), async (req, res) => {
  const body = req.body as { assignedToUserId?: string };
  if (!body.assignedToUserId?.trim()) {
    return res.status(400).json({ error: "assignedToUserId is required." });
  }

  const existing = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Conversation not found." });

  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data: { assignedToUserId: body.assignedToUserId.trim(), assignedAt: new Date() },
  });

  await emitAssignment(getIo(req), updated.id, updated.assignedToUserId, updated.assignedQueueId);
  res.json(toConversation(updated));
});

// Self-claim: an agent picks up an unassigned conversation from their own Worklist, without
// an admin having to hand it off first (the frontline reality of live chat — customers
// don't wait for an admin to notice). Race-safe via a conditional update: two agents
// claiming the same conversation at once, only one succeeds; the loser gets 409.
conversationsRouter.post("/conversations/:id/claim", requirePermission("webchat-agent"), async (req, res) => {
  const claimantId = extractUserId(req.headers.authorization);
  if (!claimantId) return res.status(401).json({ error: "Authentication required." });

  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });
  if (conversation.status !== "OPEN") {
    return res.status(409).json({ error: "This conversation is no longer open." });
  }
  if (!conversation.assignedQueueId) {
    return res.status(409).json({ error: "This conversation has no queue to claim it from." });
  }

  const membership = await prisma.webChatQueueMember.findUnique({
    where: { queueId_userId: { queueId: conversation.assignedQueueId, userId: claimantId } },
  });
  if (!membership) {
    return res.status(403).json({ error: "You are not a member of this conversation's queue." });
  }

  if (!(await isAvailableForChats(claimantId))) {
    return res.status(409).json({ error: "Set your status to an available status before claiming chats." });
  }

  const [currentLoad, effectiveCapacity] = await Promise.all([
    prisma.conversation.count({ where: { assignedToUserId: claimantId, status: "OPEN" } }),
    resolveEffectiveCapacity(claimantId),
  ]);
  if (currentLoad >= effectiveCapacity) {
    return res.status(409).json({ error: "You are at your concurrent chat capacity." });
  }

  const result = await prisma.conversation.updateMany({
    where: { id: req.params.id, assignedToUserId: null },
    data: { assignedToUserId: claimantId, assignedAt: new Date() },
  });
  if (result.count === 0) {
    return res.status(409).json({ error: "This conversation was just claimed by someone else." });
  }

  await emitAssignment(getIo(req), req.params.id, claimantId, conversation.assignedQueueId);
  const updated = await prisma.conversation.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json(toConversation(updated));
});

// Marks a conversation resolved — the only product-facing way status ever becomes CLOSED
// (previously nothing did; "answered" counts on the Supervisor Dashboard depend on this).
// Gated webchat-agent, not restricted to the assignee specifically — same permission-level
// gating (no per-record ownership checks) as every other route in this file. Idempotent:
// closing an already-closed conversation just returns it unchanged.
conversationsRouter.post("/conversations/:id/close", requirePermission("webchat-agent"), async (req, res) => {
  const existing = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Conversation not found." });
  if (existing.status === "CLOSED") return res.json(toConversation(existing));

  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  res.json(toConversation(updated));
});

conversationsRouter.post("/conversations/:id/messages", requirePermission("webchat-agent"), async (req, res) => {
  const body = req.body as { body?: string };
  if (!body.body?.trim()) return res.status(400).json({ error: "body is required." });

  const claimantId = extractUserId(req.headers.authorization);
  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });

  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderType: "AGENT", senderUserId: claimantId, body: body.body.trim() },
  });

  const io = getIo(req);
  if (io) emitToConversationRoom(io, conversation.id, "message:new", toMessage(message));
  res.status(201).json(toMessage(message));
});

// Looks up the target queue's autoPopup setting so the client can decide, on its own,
// whether to screen-pop an interaction tab or just let the Worklist pick the chat up —
// the "chat:assigned" event carries that decision rather than the client having to make a
// second round trip to find out.
async function emitAssignment(
  io: Server | undefined,
  conversationId: string,
  assignedToUserId: string | null,
  queueId: string | null,
) {
  if (!io || !assignedToUserId) return;
  const queue = queueId ? await prisma.webChatQueue.findUnique({ where: { id: queueId } }) : null;

  emitToConversationRoom(io, conversationId, "conversation:assigned", { conversationId, assignedToUserId });
  emitToAgent(io, assignedToUserId, "chat:assigned", { conversationId, autoPopup: queue?.autoPopup ?? false });
}

// requirePermission verifies the JWT but (by design, see lib/requirePermission.ts) doesn't
// attach the decoded claims to the request — routes that only need the grant check never
// needed the sub. The claim/message routes are the first ones that also need "who is this,"
// so they re-verify the same token here rather than changing the shared middleware's
// contract for every other route in this service and its four siblings. A service-key call
// (no JWT at all) correctly yields null here — claiming/messaging needs a real agent identity.
export function extractUserId(authHeader: string | undefined): string | null {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return verifyAuthToken(token).sub;
  } catch {
    return null;
  }
}
