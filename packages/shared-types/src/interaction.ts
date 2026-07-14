export interface InteractionTab {
  id: string;
  title: string;
  /** Free string so future modules (WebChat, Email, ...) can register their own kinds. */
  kind: string;
  openedAt: number;
}

export interface InteractionsState {
  tabs: InteractionTab[];
  activeTabId: string | null;
}
