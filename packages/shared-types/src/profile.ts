export type DashboardType = "frontline" | "admin";

export interface Profile {
  id: string;
  name: string;
  isProtected: boolean;
  dashboardType: DashboardType;
  canStartInteractions: boolean;
  navItemIds: string[];
  memberUserIds: string[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileInput {
  name: string;
  dashboardType: DashboardType;
  canStartInteractions: boolean;
}

export type UpdateProfileInput = Partial<CreateProfileInput> & { navItemIds?: string[] };

export interface AddProfileMemberInput {
  userId: string;
}

// A user's own account is authoritative in auth-api; this is the shape access-management-api
// exposes for the "which profile(s) does this user hold" lookup auth-api's login flow calls.
export interface ProfileChoice {
  id: string;
  name: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  profileId: string;
  profileName: string;
  dashboardType: DashboardType;
  canStartInteractions: boolean;
  navItemIds: string[];
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}

// Returned instead of LoginResponse when the authenticated user holds more than one
// profile — the client must call POST /auth/select-profile with a chosen profileId
// before receiving a full session token.
export interface ChooseProfileResponse {
  status: "choose-profile";
  preAuthToken: string;
  profiles: ProfileChoice[];
}

export interface SelectProfileRequest {
  preAuthToken: string;
  profileId: string;
}
