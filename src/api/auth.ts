import { api } from "./client";
import type { AuthUser } from "../types/api";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: AuthUser }>("/auth/login", { email, password }),
  logout: () => api.post<void>("/auth/logout"),
  me: () => api.get<{ user: AuthUser }>("/auth/me"),
};
