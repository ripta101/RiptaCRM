export interface AuthSession {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface AuthProvider {
  login(username: string, password: string): Promise<AuthSession>;
  logout(): void;
  getSession(): AuthSession | null;
}
