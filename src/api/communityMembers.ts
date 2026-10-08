import { api } from "./client";
import type { CommunityMember, PaginatedResult } from "../types/api";

export interface RegisterMemberInput {
  fullName: string;
  gender?: string;
  phone?: string;
  address?: string;
  kebele?: string;
  identificationRef?: string;
}

export const communityMembersApi = {
  list: (params: { page?: number; pageSize?: number; search?: string; verificationStatus?: string } = {}) =>
    api.get<PaginatedResult<CommunityMember>>("/community-members", params),
  get: (id: string) => api.get<{ member: CommunityMember }>(`/community-members/${id}`),
  register: (input: RegisterMemberInput) =>
    api.post<{ member: CommunityMember }>("/community-members", input),
  verify: (id: string, approve: boolean, note?: string) =>
    api.patch<{ member: CommunityMember }>(`/community-members/${id}/verification`, { approve, note }),
};
