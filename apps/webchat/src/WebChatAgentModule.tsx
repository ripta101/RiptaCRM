import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import { io, type Socket } from "socket.io-client";
import type { ConversationWithMessages, Message } from "@riptacrm/shared-types";
import { getConversation, sendAgentMessage } from "./api/client";

const WEBCHAT_API_URL = import.meta.env.VITE_WEBCHAT_API_URL ?? "http://localhost:4315";

interface WebChatAgentModuleProps {
  conversationId: string;
  authToken?: string | null;
  currentUserId?: string | null;
  closeRequested?: boolean;
  onInteractionEnded?: () => void;
}

// The agent-side live chat panel — loaded into a Host interaction tab (screen-popped or
// opened from the Worklist), one instance per open conversation. Opens its own scoped
// socket connection rather than sharing Host's always-on AgentSocketProvider connection
// (which only exists to deliver the "a chat was assigned to you" screen-pop signal while no
// tab is open) — keeps this module self-sufficient given just its props, the same
// ownership convention every other MFE in this codebase already follows (each module owns
// its own data/socket concerns rather than relying on Host to supply them).
export default function WebChatAgentModule({
  conversationId,
  authToken,
  closeRequested,
  onInteractionEnded,
}: WebChatAgentModuleProps) {
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  function addMessage(message: Message) {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
  }

  useEffect(() => {
    let cancelled = false;

    getConversation(conversationId, authToken)
      .then((data) => {
        if (cancelled) return;
        setConversation(data);
        setMessages(data.messages);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load conversation.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const socket = io(`${WEBCHAT_API_URL}/agents`, { auth: { token: authToken } });
    socket.on("connect", () => socket.emit("join-conversation", { conversationId }));
    socket.on("message:new", (m: Message) => {
      if (m.conversationId === conversationId) addMessage(m);
    });
    socketRef.current = socket;

    return () => {
      cancelled = true;
      socket.emit("leave-conversation", { conversationId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, authToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // No unsaved draft state worth confirming before closing — end the interaction as soon
  // as a close is requested (unlike Customer Lookup's confirm-before-close, which guards
  // against losing in-progress form entry).
  useEffect(() => {
    if (closeRequested) onInteractionEnded?.();
  }, [closeRequested, onInteractionEnded]);

  async function handleSend() {
    const body = input.trim();
    if (!body || sending) return;

    setSending(true);
    setInput("");
    try {
      const message = await sendAgentMessage(conversationId, body, authToken);
      addMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !conversation) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {conversation?.pageUrlPath}
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{ flex: 1, minHeight: 300, p: 2, mb: 2, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}
      >
        {messages.map((m) => (
          <Box
            key={m.id}
            sx={{
              alignSelf: m.senderType === "AGENT" ? "flex-end" : "flex-start",
              maxWidth: "75%",
              px: 1.5,
              py: 1,
              borderRadius: 2,
              bgcolor: m.senderType === "AGENT" ? "primary.main" : m.senderType === "SYSTEM" ? "grey.200" : "grey.100",
              color: m.senderType === "AGENT" ? "primary.contrastText" : "text.primary",
              fontStyle: m.senderType === "SYSTEM" ? "italic" : "normal",
            }}
          >
            {m.body}
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Paper>

      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <Button variant="contained" disabled={sending || !input.trim()} onClick={handleSend}>
          Send
        </Button>
      </Box>
    </Box>
  );
}
