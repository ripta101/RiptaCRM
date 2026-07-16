import { jwtDecode } from "jwt-decode";
import type { AuthProvider, AuthSession, UserRole } from "../types";

const STORAGE_KEY = "riptacrm.auth.token";

export interface ApiAuthProviderOptions {
  baseUrl?: string;
}

interface AuthTokenClaims {
  sub: string;
  name: string;
  email: string;
  role: UserRole;
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

  return { id: claims.sub, name: claims.name, email: claims.email, role: claims.role, token };
}

export function createApiAuthProvider(options: ApiAuthProviderOptions = {}): AuthProvider {
  const baseUrl = options.baseUrl ?? "http://localhost:4312";

  return {
    async login(username, password) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Invalid username or password");
      }

      const { token, user } = (await res.json()) as {
        token: string;
        user: { id: string; name: string; email: string; role: UserRole };
      };

      sessionStorage.setItem(STORAGE_KEY, token);
      return { id: user.id, name: user.name, email: user.email, role: user.role, token };
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
