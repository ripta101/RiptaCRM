import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ConversationWithMessages, Message } from "@riptacrm/shared-types";

const WEBCHAT_API_URL = import.meta.env.VITE_WEBCHAT_API_URL ?? "http://localhost:4315";
const STORAGE_KEY_PREFIX = "riptacrm-webchat-conversation-id";

// Scoped to the specific siteKey so a visitor who happens to have multiple of this app's
// widgets embedded on different sites in the same browser doesn't cross-resume conversations.
function storageKey(siteKey: string): string {
  return `${STORAGE_KEY_PREFIX}:${siteKey}`;
}

export interface ChatPanelProps {
  siteKey: string;
  // The page the visitor is actually on, for routing-rule matching. Must be threaded in
  // explicitly for the iframe embed path — ChatPanel runs inside the iframe's own document,
  // so its own window.location is the iframe's URL, not the embedding page's. The MFE embed
  // path (apps/webchat-widget/src/mfe/WebChatWidgetModule.tsx) runs directly in the
  // consuming page's own context, so window.location is already correct there — these
  // default to it precisely for that case.
  pageUrlPath?: string;
  pageUrlFull?: string;
}

export function ChatPanel({
  siteKey,
  pageUrlPath = window.location.pathname,
  pageUrlFull = window.location.href,
}: ChatPanelProps) {
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

    async function start() {
      setLoading(true);
      setError(null);
      try {
        const storedId = localStorage.getItem(storageKey(siteKey));
        const res = await fetch(`${WEBCHAT_API_URL}/api/public/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteKey,
            conversationId: storedId ?? undefined,
            pageUrlPath,
            pageUrlFull,
          }),
        });
        if (!res.ok) throw new Error(`Failed to start chat (${res.status})`);
        const data: ConversationWithMessages = await res.json();
        if (cancelled) return;

        localStorage.setItem(storageKey(siteKey), data.id);
        setConversation(data);
        setMessages(data.messages);

        const socket = io(`${WEBCHAT_API_URL}/visitor`, {
          auth: { siteKey, conversationId: data.id },
        });
        socket.on("message:new", (m: Message) => addMessage(m));
        socketRef.current = socket;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to start chat.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    start();
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [siteKey, pageUrlPath, pageUrlFull]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const body = input.trim();
    if (!body || !conversation || sending) return;

    setSending(true);
    setInput("");
    try {
      const res = await fetch(`${WEBCHAT_API_URL}/api/public/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteKey, body }),
      });
      if (!res.ok) throw new Error(`Failed to send message (${res.status})`);
      const message: Message = await res.json();
      addMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>Chat with us</div>

      <div style={styles.messages}>
        {loading && <div style={styles.status}>Connecting…</div>}
        {error && <div style={{ ...styles.status, color: "#c0392b" }}>{error}</div>}
        {!loading &&
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                ...styles.bubble,
                ...(m.senderType === "VISITOR" ? styles.bubbleVisitor : styles.bubbleOther),
              }}
            >
              {m.body}
            </div>
          ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          type="text"
          value={input}
          placeholder="Type a message…"
          disabled={loading || !conversation}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <button style={styles.sendButton} disabled={loading || !conversation || sending || !input.trim()} onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}

// Plain inline styles, not MUI/CSS classes — this component renders inside an iframe on
// arbitrary third-party sites, and inside a Module Federation host that shares no styling
// convention with this app. No external stylesheet, no class names that could collide with
// the embedding page.
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    fontSize: 14,
    boxSizing: "border-box",
  },
  header: {
    padding: "12px 16px",
    background: "#1565c0",
    color: "#fff",
    fontWeight: 600,
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "#f5f5f5",
  },
  status: {
    textAlign: "center",
    color: "#666",
    padding: 8,
  },
  bubble: {
    maxWidth: "80%",
    padding: "8px 12px",
    borderRadius: 12,
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  bubbleVisitor: {
    alignSelf: "flex-end",
    background: "#1565c0",
    color: "#fff",
  },
  bubbleOther: {
    alignSelf: "flex-start",
    background: "#fff",
    color: "#222",
    border: "1px solid #ddd",
  },
  inputRow: {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: "1px solid #ddd",
    background: "#fff",
  },
  input: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
  },
  sendButton: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    background: "#1565c0",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
};
