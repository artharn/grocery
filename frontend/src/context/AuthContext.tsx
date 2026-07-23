import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "../types/api";
import { tokenStorage, setUnauthorizedHandler } from "../api/client";
import * as authApi from "../api/auth";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  // UX-only gate for showing/hiding entry points (buttons, nav links) —
  // the backend's own 403 on the actual request is the real enforcement.
  // Never assume a hidden control means the action is actually blocked.
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    tokenStorage.clearTokens();
    setUser(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, []);

  useEffect(() => {
    // Re-hydrate from a stored token via /auth/me rather than trusting
    // stale localStorage user data across reloads.
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .getMe()
      .then(({ user }) => setUser(user))
      .catch(() => tokenStorage.clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    tokenStorage.setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
  };

  const hasPermission = (code: string) => user?.permissions.includes(code) ?? false;

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
