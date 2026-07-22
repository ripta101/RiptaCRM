import { ChatPanel } from "../core/ChatPanel";

export interface WebChatWidgetModuleProps {
  siteKey: string;
}

// The Module Federation embed path (decision #2's second option) — for customer sites that
// are themselves compatible React+MF apps and want to dynamically load this widget the
// same way apps/host/src/shell/widgets/DynamicRemote.tsx already loads admin-configured
// remotes, via @module-federation/runtime's loadRemote(). No @riptacrm/auth-client
// dependency, no Host-specific wiring — this component only needs a siteKey.
export default function WebChatWidgetModule({ siteKey }: WebChatWidgetModuleProps) {
  return <ChatPanel siteKey={siteKey} />;
}
