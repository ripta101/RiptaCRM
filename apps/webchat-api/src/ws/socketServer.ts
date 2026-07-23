import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { prisma } from "../db";
import { verifyAuthToken } from "../lib/jwt";

// A room name like "conversation:<id>" or "agent:<userId>" only exists within a single
// namespace's own room registry — io.to(room) (bare, no .of(...)) operates on the DEFAULT
// "/" namespace, which nothing in this app ever connects to, so it silently emits to no
// one. Both the visitor and agent side join "conversation:<id>" rooms, but in their own
// separate namespaces (/visitor, /agents respectively), so a conversation-room broadcast
// must explicitly target both.
export function emitToConversationRoom(io: Server, conversationId: string, event: string, payload: unknown): void {
  const room = `conversation:${conversationId}`;
  io.of("/visitor").to(room).emit(event, payload);
  io.of("/agents").to(room).emit(event, payload);
}

export function emitToAgent(io: Server, userId: string, event: string, payload: unknown): void {
  io.of("/agents").to(`agent:${userId}`).emit(event, payload);
}

async function clearAgentStatus(userId: string): Promise<void> {
  await prisma.agentStatus.upsert({
    where: { userId },
    create: { userId, optionId: null },
    update: { optionId: null },
  });
}

// Two namespaces on one socket.io Server, attached to the same HTTP server Express already
// listens on — no extra process/port. Sockets never mutate data (see routes/public.ts and
// routes/conversations.ts, which do the writes and emit here); this file only handles
// connection auth and room membership. See docs/architecture.md's "WebChat: real-time via
// socket.io, writes stay REST" section.
export function attachSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    // Unlike the REST routes, both namespaces here gate on their own handshake auth
    // (siteKey+conversationId below for /visitor, a valid JWT for /agents), not on origin —
    // /visitor in particular must accept connections from arbitrary customer domains, the
    // same reason routes/public.ts uses a per-Site validator instead of a fixed allowlist.
    cors: { origin: true },
  });

  const visitorNamespace = io.of("/visitor");
  visitorNamespace.use(async (socket, next) => {
    const { siteKey, conversationId } = socket.handshake.auth as { siteKey?: string; conversationId?: string };
    if (!siteKey || !conversationId) return next(new Error("siteKey and conversationId are required"));

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    const site = await prisma.site.findUnique({ where: { siteKey } });
    if (!conversation || !site || conversation.siteId !== site.id) {
      return next(new Error("unauthorized"));
    }

    socket.data.conversationId = conversationId;
    next();
  });
  visitorNamespace.on("connection", (socket) => {
    socket.join(`conversation:${socket.data.conversationId}`);
  });

  const agentsNamespace = io.of("/agents");
  agentsNamespace.use((socket, next) => {
    const { token, scope } = socket.handshake.auth as { token?: string; scope?: string };
    if (!token) return next(new Error("token is required"));

    try {
      const claims = verifyAuthToken(token);
      if (!claims.navItemIds?.includes("webchat-agent") && !claims.navItemIds?.includes("webchat-config")) {
        return next(new Error("unauthorized"));
      }
      socket.data.userId = claims.sub;
      socket.data.scope = scope;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });
  agentsNamespace.on("connection", (socket) => {
    socket.join(`agent:${socket.data.userId}`);

    // This namespace is shared by two different kinds of client: AgentSocketProvider
    // (Host) opens exactly one connection per login session and disconnects it on logout —
    // a reliable proxy for "session start/end" — but WebChatAgentModule *also* connects
    // here, once per open chat tab, purely to receive that conversation's live messages.
    // Only the session-level connection should ever clear status (an agent must consciously
    // pick a status each session, per the confirmed requirement) — clearing it for every
    // per-conversation connect/disconnect too was a real bug: opening or closing a second
    // chat tab silently wiped the agent's live status out from under an already-open first
    // chat, so a subsequent claim/auto-route would fail with "not available" even though the
    // TopBar still showed "Available" (stale — nothing ever told it the status was cleared).
    // Both AgentSocketProvider's auth.scope:"session" tag and the upserts below are
    // idempotent, safe to run more than once (e.g. React StrictMode's dev-mode double-mount).
    const isSessionConnection = socket.data.scope === "session";
    if (isSessionConnection) clearAgentStatus(socket.data.userId);

    socket.on("join-conversation", ({ conversationId }: { conversationId: string }) => {
      socket.join(`conversation:${conversationId}`);
    });
    socket.on("leave-conversation", ({ conversationId }: { conversationId: string }) => {
      socket.leave(`conversation:${conversationId}`);
    });
    socket.on("disconnect", () => {
      if (isSessionConnection) clearAgentStatus(socket.data.userId);
    });
  });

  return io;
}
