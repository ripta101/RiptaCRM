export type UserRole = "frontline" | "admin";

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
}

export interface AuthProvider {
  login(username: string, password: string): Promise<AuthSession>;
  logout(): void;
  getSession(): AuthSession | null;
}
