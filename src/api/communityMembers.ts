import { api } from "./client";
import type { CommunityMember, PaginatedResult } from "../types/api";

export interface MemberInput {
  fullName: string;
  gender?: string;
  dateOfBirth?: string;   // ISO date string
  phone?: string;
  address?: string;
  region?: string;
  zone?: string;
  woreda?: string;
  kebele?: string;
  occupation?: string;
  identificationRef?: string;
}

// Keep old alias so existing call-sites don't break
export type RegisterMemberInput = MemberInput;

export const communityMembersApi = {
  list: (params: { page?: number; pageSize?: number; search?: string; verificationStatus?: string } = {}) =>
    api.get<PaginatedResult<CommunityMember>>("/community-members", params),

  get: (id: string) =>
    api.get<{ member: CommunityMember }>(`/community-members/${id}`),

  register: (input: MemberInput) =>
    api.post<{ member: CommunityMember }>("/community-members", input),

  update: (id: string, input: Partial<MemberInput>) =>
    api.patch<{ member: CommunityMember }>(`/community-members/${id}`, input),

  verify: (id: string, approve: boolean, note?: string) =>
    api.patch<{ member: CommunityMember }>(`/community-members/${id}/verification`, { approve, note }),
};
