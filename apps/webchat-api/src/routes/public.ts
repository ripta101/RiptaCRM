import type { Server } from "socket.io";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { SendMessageRequest, StartConversationRequest } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { toConversationWithMessages, toMessage } from "../lib/mappers";
import { routeNewConversation } from "../services/routeConversation";
import { emitToAgent, emitToConversationRoom } from "../ws/socketServer";

export const publicRouter = Router();

function keyBySiteKey(req: { body?: { siteKey?: unknown }; ip?: string }): string {
  const siteKey = req.body?.siteKey;
  return typeof siteKey === "string" && siteKey ? siteKey : (req.ip ?? "unknown");
}

const startConversationLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  keyGenerator: keyBySiteKey,
  standardHeaders: true,
  legacyHeaders: false,
});

const sendMessageLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  keyGenerator: keyBySiteKey,
  standardHeaders: true,
  legacyHeaders: false,
});

function getIo(req: { app: { locals: { io?: Server } } }): Server | undefined {
  return req.app.locals.io;
}

async function findActiveSite(siteKey: unknown) {
  if (typeof siteKey !== "string" || !siteKey) return null;
  const site = await prisma.site.findUnique({ where: { siteKey } });
  return site?.isActive ? site : null;
}

// No requirePermission() anywhere in this file — deliberately. A visitor on a customer's
// website has no logged-in session at all; siteKey (validated per-request against a
// registered Site, plus the CORS origin check in lib/originValidator.ts and the rate
// limiters above) is the only trust mechanism these routes have. See
// docs/architecture.md's "WebChat: the first public, unauthenticated endpoints" section.
publicRouter.post("/conversations", startConversationLimiter, async (req, res) => {
  const body = req.body as Partial<StartConversationRequest>;
  const site = await findActiveSite(body.siteKey);
  if (!site) return res.status(404).json({ error: "Unknown or inactive site." });
  if (!body.pageUrlPath?.trim()) return res.status(400).json({ error: "pageUrlPath is required." });

  if (body.conversationId) {
    const existing = await prisma.conversation.findUnique({
      where: { id: body.conversationId },
      include: { messages: true },
    });
    if (existing && existing.siteId === site.id && existing.status === "OPEN") {
      return res.json(toConversationWithMessages(existing));
    }
    // Unknown/closed/foreign conversationId — fall through and start a fresh one rather
    // than erroring; a stale localStorage id shouldn't strand a returning visitor.
  }

  const routed = await routeNewConversation(site.id, body.pageUrlPath.trim());

  const conversation = await prisma.conversation.create({
    data: {
      siteId: site.id,
      pageUrlPath: body.pageUrlPath.trim(),
      pageUrlFull: body.pageUrlFull?.trim() || null,
      assignedQueueId: routed.assignedQueueId,
      assignedToUserId: routed.assignedToUserId,
      matchedRuleId: routed.matchedRuleId,
      messages: routed.autoReplyText
        ? { create: [{ senderType: "SYSTEM", body: routed.autoReplyText }] }
        : undefined,
    },
    include: { messages: true },
  });

  if (routed.assignedToUserId) {
    const io = getIo(req);
    // Same "carry the autoPopup decision in the event" reasoning as
    // routes/conversations.ts's emitAssignment — one queue lookup here, not a second round
    // trip from the client.
    const queue = routed.assignedQueueId
      ? await prisma.webChatQueue.findUnique({ where: { id: routed.assignedQueueId } })
      : null;
    if (io) {
      emitToAgent(io, routed.assignedToUserId, "chat:assigned", {
        conversationId: conversation.id,
        autoPopup: queue?.autoPopup ?? false,
      });
    }
  }

  res.status(201).json(toConversationWithMessages(conversation));
});

publicRouter.post("/conversations/:id/messages", sendMessageLimiter, async (req, res) => {
  const body = req.body as Partial<SendMessageRequest>;
  const site = await findActiveSite(body.siteKey);
  if (!site) return res.status(404).json({ error: "Unknown or inactive site." });
  if (!body.body?.trim()) return res.status(400).json({ error: "body is required." });

  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation || conversation.siteId !== site.id) {
    return res.status(404).json({ error: "Conversation not found." });
  }
  if (conversation.status !== "OPEN") {
    return res.status(409).json({ error: "This conversation is closed." });
  }

  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderType: "VISITOR", body: body.body.trim() },
  });

  const io = getIo(req);
  if (io) emitToConversationRoom(io, conversation.id, "message:new", toMessage(message));

  res.status(201).json(toMessage(message));
});

publicRouter.get("/conversations/:id", async (req, res) => {
  const site = await findActiveSite(req.query.siteKey);
  if (!site) return res.status(404).json({ error: "Unknown or inactive site." });

  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: { messages: true },
  });
  if (!conversation || conversation.siteId !== site.id) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  res.json(toConversationWithMessages(conversation));
});
