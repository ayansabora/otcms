import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "../api/auth";
import { setAccessToken, setUnauthorizedHandler, api } from "../api/client";
import type { AuthUser } from "../types/api";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));

    // On load, try to silently restore a session from the httpOnly refresh
    // cookie (if any) before rendering protected routes.
    (async () => {
      try {
        const res = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "x-otcms-csrf": "1" },
        });
        if (res.ok) {
          const data = (await res.json()) as { accessToken: string };
          setAccessToken(data.accessToken);
          // Fetch full profile including email and fullName from the fixed /me endpoint.
          const me = await api.get<{ user: AuthUser }>("/auth/me");
          setUser(me.user);
        }
      } catch {
        // No valid session — user will see the login page.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const result = await authApi.login(email, password);
    setAccessToken(result.accessToken);
    setUser(result.user);
  }

  async function logout() {
    await authApi.logout().catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
