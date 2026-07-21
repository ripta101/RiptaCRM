import { jwtDecode } from "jwt-decode";
import type { CustomMenuItem, DashboardType } from "@riptacrm/shared-types";
import type { AuthProvider, AuthSession, LoginResult, ProfileChoice } from "../types";

const STORAGE_KEY = "riptacrm.auth.token";

export interface ApiAuthProviderOptions {
  baseUrl?: string;
}

interface AuthTokenClaims {
  sub: string;
  name: string;
  email: string;
  profileId: string;
  profileName: string;
  dashboardType: DashboardType;
  canStartInteractions: boolean;
  navItemIds: string[];
  customMenuItems: CustomMenuItem[];
  exp: number;
  iat: number;
}

function sessionFromToken(token: string): AuthSession | null {
  let claims: AuthTokenClaims;
  try {
    claims = jwtDecode<AuthTokenClaims>(token);
  } catch {
    return null;
  }

  // exp is seconds-since-epoch per the JWT spec; Date.now() is milliseconds.
  if (!claims.exp || claims.exp * 1000 <= Date.now()) {
    return null;
  }

  return {
    id: claims.sub,
    name: claims.name,
    email: claims.email,
    profileId: claims.profileId,
    profileName: claims.profileName,
    dashboardType: claims.dashboardType,
    canStartInteractions: claims.canStartInteractions,
    navItemIds: claims.navItemIds,
    customMenuItems: claims.customMenuItems,
    token,
  };
}

interface AuthEndpointUser {
  id: string;
  name: string;
  email: string;
  profileId: string;
  profileName: string;
  dashboardType: DashboardType;
  canStartInteractions: boolean;
  navItemIds: string[];
  customMenuItems: CustomMenuItem[];
}

interface AuthEndpointBody {
  token?: string;
  user?: AuthEndpointUser;
  status?: "choose-profile";
  preAuthToken?: string;
  profiles?: ProfileChoice[];
  error?: string;
}

function sessionFromUser(user: AuthEndpointUser, token: string): AuthSession {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profileId: user.profileId,
    profileName: user.profileName,
    dashboardType: user.dashboardType,
    canStartInteractions: user.canStartInteractions,
    navItemIds: user.navItemIds,
    customMenuItems: user.customMenuItems,
    token,
  };
}

export function createApiAuthProvider(options: ApiAuthProviderOptions = {}): AuthProvider {
  const baseUrl = options.baseUrl ?? "http://localhost:4312";

  async function postAuth(path: string, body: unknown): Promise<LoginResult> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => null)) as AuthEndpointBody | null;

    if (!res.ok) {
      throw new Error(data?.error ?? "Invalid username or password");
    }

    if (data?.status === "choose-profile") {
      return { status: "choose-profile", preAuthToken: data.preAuthToken!, profiles: data.profiles! };
    }

    const token = data!.token!;
    sessionStorage.setItem(STORAGE_KEY, token);
    return { status: "authenticated", session: sessionFromUser(data!.user!, token) };
  }

  return {
    login(username, password) {
      return postAuth("/api/auth/login", { username, password });
    },

    async selectProfile(preAuthToken, profileId) {
      const result = await postAuth("/api/auth/select-profile", { preAuthToken, profileId });
      // select-profile always resolves to a full session — the server never returns
      // choose-profile from this endpoint.
      if (result.status !== "authenticated") {
        throw new Error("Unexpected response while selecting a profile.");
      }
      return result.session;
    },

    logout() {
      sessionStorage.removeItem(STORAGE_KEY);
    },

    getSession() {
      const token = sessionStorage.getItem(STORAGE_KEY);
      if (!token) return null;

      const session = sessionFromToken(token);
      if (!session) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
      return session;
    },
  };
}
