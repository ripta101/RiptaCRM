export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export type UserRole = "frontline" | "admin";

// Single source of truth for which roles exist — both message-broadcast-api's
// validation and the message-broadcast MFE's target-role checkboxes import this,
// so adding a role later is a one-line change here, not a duplicated constant.
export const ALL_USER_ROLES: UserRole[] = ["frontline", "admin"];

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
