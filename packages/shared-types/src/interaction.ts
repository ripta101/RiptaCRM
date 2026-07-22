export interface InteractionTab {
  id: string;
  title: string;
  /** Free string so future modules (WebChat, Email, ...) can register their own kinds. */
  kind: string;
  openedAt: number;
  // Kind-specific data a tab needs to render itself (e.g. a WebChat tab's conversationId) —
  // optional so existing kinds (customer-lookup) are unaffected.
  meta?: Record<string, string>;
}

export interface InteractionsState {
  tabs: InteractionTab[];
  activeTabId: string | null;
  closeRequestedTabId: string | null;
}
