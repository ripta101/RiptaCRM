import type { AuthProvider, AuthSession } from "../types";

const STORAGE_KEY = "riptacrm.auth.session";

const MOCK_USER: AuthSession = {
  id: "user-1",
  name: "Test User",
  email: "test@riptacrm.example",
};

export function createHardcodedAuthProvider(): AuthProvider {
  return {
    async login(username, password) {
      if (username !== "test" || password !== "test") {
        throw new Error("Invalid username or password");
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_USER));
      return MOCK_USER;
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
