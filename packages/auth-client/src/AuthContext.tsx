import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthProvider, AuthSession, LoginResult } from "./types";

interface AuthContextValue {
  user: AuthSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  selectProfile: (preAuthToken: string, profileId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderComponentProps {
  provider: AuthProvider;
  children: ReactNode;
}

export function AuthContextProvider({ provider, children }: AuthProviderComponentProps) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(provider.getSession());
    setLoading(false);
  }, [provider]);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await provider.login(username, password);
      if (result.status === "authenticated") {
        setUser(result.session);
      }
      return result;
    },
    [provider],
  );

  const selectProfile = useCallback(
    async (preAuthToken: string, profileId: string) => {
      const session = await provider.selectProfile(preAuthToken, profileId);
      setUser(session);
    },
    [provider],
  );

  const logout = useCallback(() => {
    provider.logout();
    setUser(null);
  }, [provider]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, loading, login, selectProfile, logout }),
    [user, loading, login, selectProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }
  return ctx;
}
