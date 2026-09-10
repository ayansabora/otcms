import { api } from "./client";
import type { CommunityMember, PaginatedResult } from "../types/api";

export const communityMembersApi = {
  list: (params: { page?: number; pageSize?: number; search?: string } = {}) =>
    api.get<PaginatedResult<CommunityMember>>("/community-members", params),
  get: (id: string) => api.get<{ member: CommunityMember }>(`/community-members/${id}`),
  register: (input: { fullName: string; phone?: string; kebele?: string }) =>
    api.post<{ member: CommunityMember }>("/community-members", input),
  verify: (id: string, approve: boolean, note?: string) =>
    api.patch<{ member: CommunityMember }>(`/community-members/${id}/verification`, { approve, note }),
};
