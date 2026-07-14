import type { AuthProvider, AuthSession } from "../types";

const STORAGE_KEY = "riptacrm.auth.session";

const CREDENTIALS: Record<string, { password: string; session: AuthSession }> = {
  test: {
    password: "test",
    session: {
      id: "user-1",
      name: "Test User",
      email: "test@riptacrm.example",
      role: "frontline",
    },
  },
  admin: {
    password: "admin",
    session: {
      id: "user-2",
      name: "Admin User",
      email: "admin@riptacrm.example",
      role: "admin",
    },
  },
};

export function createHardcodedAuthProvider(): AuthProvider {
  return {
    async login(username, password) {
      const entry = CREDENTIALS[username];
      if (!entry || entry.password !== password) {
        throw new Error("Invalid username or password");
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry.session));
      return entry.session;
    },

    logout() {
      sessionStorage.removeItem(STORAGE_KEY);
    },

    getSession() {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as AuthSession;
      } catch {
        return null;
      }
    },
  };
}
