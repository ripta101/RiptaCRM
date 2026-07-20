export interface Queue {
  id: string;
  name: string;
  memberUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateQueueInput {
  name: string;
}

export type UpdateQueueInput = Partial<CreateQueueInput>;

export interface AddQueueMemberInput {
  userId: string;
}

// Mirrors auth-api's User model minus passwordHash — used by the queue-member picker.
export interface UserSummary {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
}
