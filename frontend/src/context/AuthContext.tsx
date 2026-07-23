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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
