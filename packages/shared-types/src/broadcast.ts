export type BroadcastPriority = "LOW" | "NORMAL" | "HIGH";

export interface MessageBroadcastSummary {
  id: string;
  title: string;
  bodyHtml: string;
  priority: BroadcastPriority | null;
  targetRoles: string[];
  startAt: string;
  endAt: string;
  canceledAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageBroadcastInput {
  title: string;
  bodyHtml: string;
  priority?: BroadcastPriority;
  targetRoles: string[];
  startAt: string;
  endAt: string;
  createdByUserId?: string;
}

export type UpdateMessageBroadcastInput = Partial<CreateMessageBroadcastInput>;
