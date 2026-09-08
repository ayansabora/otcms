import { communityMembersRepository } from "./community-members.repository.js";
import { NotFoundError, ConflictError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import { toSkipTake, paginate, type PaginationInput } from "../../utils/pagination.js";
import type { RegisterMemberInput, VerifyMemberInput, ListMembersQuery } from "./community-members.validators.js";

export const communityMembersService = {
  async register(input: RegisterMemberInput, actorUserId?: string) {
    const member = await communityMembersRepository.create(input);
    await recordAudit({
      ...(actorUserId ? { actorUserId } : {}),
      action: "member.registered",
      entityType: "community_member",
      entityId: member.id,
      after: { fullName: member.fullName },
    });
    return member;
  },

  async getById(id: string) {
    const member = await communityMembersRepository.findById(id);
    if (!member) throw new NotFoundError("Community member not found");
    return member;
  },

  /**
   * Verification per blueprint §11 rule 1 — required before the member can
   * request services tied to case types that mandate it (enforced in the
   * case module, see cases.service.ts). Only an elder/court-manager or
   * admin performs this (route-level requirePermission("member:verify")).
   */
  async setVerification(id: string, input: VerifyMemberInput, actorUserId: string) {
    const member = await communityMembersService.getById(id);
    if (member.verificationStatus !== "PENDING") {
      throw new ConflictError(`Member is already ${member.verificationStatus.toLowerCase()}`);
    }

    const status = input.approve ? "VERIFIED" : "REJECTED";
    const updated = await communityMembersRepository.setVerification(id, status, actorUserId);

    await recordAudit({
      actorUserId,
      action: "member.verification_decided",
      entityType: "community_member",
      entityId: id,
      before: { verificationStatus: "PENDING" },
      after: { verificationStatus: status, note: input.note },
    });

    return updated;
  },

  async list(query: ListMembersQuery) {
    const pagination: PaginationInput = { page: query.page, pageSize: query.pageSize };
    const { skip, take } = toSkipTake(pagination);
    const params: Parameters<typeof communityMembersRepository.list>[0] = { skip, take };
    if (query.search) params.search = query.search;
    if (query.verificationStatus) params.verificationStatus = query.verificationStatus;
    const { items, total } = await communityMembersRepository.list(params);
    return paginate(items, total, pagination);
  },
};
