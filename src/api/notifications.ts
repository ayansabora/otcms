import { api } from "./client";
import type { Notification, PaginatedResult } from "../types/api";

export const notificationsApi = {
  list: (params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}) =>
    api.get<PaginatedResult<Notification>>("/notifications", params),

  markRead: (id: string) => api.patch<void>(`/notifications/${id}/read`),

  markAllRead: () => api.patch<void>("/notifications/read-all"),
};
