import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@riptacrm/auth-client";
import { useInteractions } from "../interactions/InteractionsContext";

const WEBCHAT_API_URL = import.meta.env.VITE_WEBCHAT_API_URL ?? "http://localhost:4315";

interface ChatAssignedEvent {
  conversationId: string;
  autoPopup: boolean;
}

// A single, lightweight, always-on connection (while logged in with the webchat-agent
// grant) whose only job is delivering the "a chat was just assigned to you" screen-pop
// signal — regardless of whether any WebChat interaction tab is currently open. Distinct
// from WebChatAgentModule's own per-open-conversation socket connection (apps/webchat/src/
// WebChatAgentModule.tsx), which handles live message delivery for one specific,
// already-open chat. No visual output — pure side effect, rendered once near the root.
export function AgentSocketProvider() {
  const { user } = useAuth();
  const { openInteraction } = useInteractions();
  const canWorkChats = Boolean(user?.navItemIds.includes("webchat-agent"));
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!canWorkChats || !user?.token) return;

    // scope:"session" marks this as the one connection per login session that the server
    // treats as a status-clearing boundary — see webchat-api's ws/socketServer.ts. Every
    // WebChatAgentModule instance also connects to this same namespace (one per open chat
    // tab) but must NOT be tagged "session", or opening/closing a chat tab would silently
    // wipe the agent's live status out from under any other already-open chat.
    const socket = io(`${WEBCHAT_API_URL}/agents`, { auth: { token: user.token, scope: "session" } });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat:assigned", ({ conversationId, autoPopup }: ChatAssignedEvent) => {
      if (!autoPopup) return;
      openInteraction({
        // Same stable id convention as WorklistTable's Claim/Open handlers — dedupes
        // against a tab already open for this conversation instead of opening a second one.
        id: `webchat-${conversationId}`,
        title: "Web Chat",
        kind: "webchat",
        openedAt: Date.now(),
        meta: { conversationId },
      });
    });

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [canWorkChats, user?.token, openInteraction]);

  // Invisible marker, not a visual element — gives e2e tests a deterministic signal to wait
  // on ("the agent's socket has joined its room and can now receive chat:assigned") instead
  // of racing a fixed timeout against a real network handshake.
  return <span data-testid="webchat-agent-socket-status" data-connected={connected} style={{ display: "none" }} />;
}
