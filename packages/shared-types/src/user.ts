export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export type UserRole = "frontline" | "admin";

export interface AuthenticatedUser extends User {
  role: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}
