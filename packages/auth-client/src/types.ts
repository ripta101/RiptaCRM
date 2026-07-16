import type { UserRole } from "@riptacrm/shared-types";

export type { UserRole };

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  token: string;
}

export interface AuthProvider {
  login(username: string, password: string): Promise<AuthSession>;
  logout(): void;
  getSession(): AuthSession | null;
}
