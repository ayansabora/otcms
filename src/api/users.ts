import { api } from "./client";
import type { User, Role, PaginatedResult } from "../types/api";

export interface CreateUserInput {
  email: string;
  fullName: string;
  phone?: string;
  roleIds: string[];
  temporaryPassword?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  phone?: string;
}

export const usersApi = {
  list: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    roleId?: string;
  } = {}) => api.get<PaginatedResult<User>>("/users", params),

  get: (id: string) => api.get<{ user: User }>(`/users/${id}`),

  create: (input: CreateUserInput) =>
    api.post<{ user: User; temporaryPassword?: string }>("/users", input),

  update: (id: string, input: UpdateUserInput) =>
    api.patch<{ user: User }>(`/users/${id}`, input),

  setStatus: (id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") =>
    api.patch<{ user: User }>(`/users/${id}/status`, { status }),

  assignRoles: (id: string, roleIds: string[]) =>
    api.patch<{ user: User }>(`/users/${id}/roles`, { roleIds }),

  listRoles: () => api.get<{ roles: Role[] }>("/roles"),
};
