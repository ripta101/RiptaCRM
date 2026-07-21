import type { CustomMenuItem, DashboardType } from "@riptacrm/shared-types";

export type { CustomMenuItem, DashboardType };

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  profileId: string;
  profileName: string;
  dashboardType: DashboardType;
  canStartInteractions: boolean;
  navItemIds: string[];
  customMenuItems: CustomMenuItem[];
  token: string;
}

export interface ProfileChoice {
  id: string;
  name: string;
}

// A session's login can finish in one call (single-profile user) or require an
// intermediate profile pick — the caller (LoginPage) branches on `status`.
export type LoginResult =
  | { status: "authenticated"; session: AuthSession }
  | { status: "choose-profile"; preAuthToken: string; profiles: ProfileChoice[] };

export interface AuthProvider {
  login(username: string, password: string): Promise<LoginResult>;
  selectProfile(preAuthToken: string, profileId: string): Promise<AuthSession>;
  logout(): void;
  getSession(): AuthSession | null;
}
