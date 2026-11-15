import { communityMembersRepository } from "./community-members.repository.js";
import { NotFoundError, ConflictError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import { notify } from "../notifications/notifications.service.js";
import { prisma } from "../../database/prismaClient.js";
import { toSkipTake, paginate, type PaginationInput } from "../../utils/pagination.js";
import type {
  RegisterMemberInput,
  UpdateMemberInput,
  VerifyMemberInput,
  ListMembersQuery,
} from "./community-members.validators.js";

export const communityMembersService = {
  async register(input: RegisterMemberInput, actorUserId?: string) {
    const member = await communityMembersRepository.create({
      fullName:          input.fullName,
      ...(input.gender           !== undefined ? { gender:           input.gender }           : {}),
      ...(input.dateOfBirth      !== undefined ? { dateOfBirth:      input.dateOfBirth }      : {}),
      ...(input.phone            !== undefined ? { phone:            input.phone }            : {}),
      ...(input.address          !== undefined ? { address:          input.address }          : {}),
      ...(input.region           !== undefined ? { region:           input.region }           : {}),
      ...(input.zone             !== undefined ? { zone:             input.zone }             : {}),
      ...(input.woreda           !== undefined ? { woreda:           input.woreda }           : {}),
      ...(input.kebele           !== undefined ? { kebele:           input.kebele }           : {}),
      ...(input.occupation       !== undefined ? { occupation:       input.occupation }       : {}),
      ...(input.identificationRef !== undefined ? { identificationRef: input.identificationRef } : {}),
    });
    await recordAudit({
      ...(actorUserId ? { actorUserId } : {}),
      action:     "member.registered",
      entityType: "community_member",
      entityId:   member.id,
      after:      { fullName: member.fullName },
    });

    // Notify all ADMINs about the new community member registration
    if (actorUserId) {
      const admins = await prisma.user.findMany({
        where: { status: "ACTIVE", archivedAt: null, roles: { some: { role: { name: "ADMIN" } } } },
        select: { id: true },
      });
      for (const admin of admins) {
        await notify({
          userId: admin.id,
          type: "member_registered",
          title: `New community member registered: ${member.fullName}`,
          body: `A new community member has been registered${member.kebele ? ` from Kebele ${member.kebele}` : ""}.`,
          data: { memberId: member.id, fullName: member.fullName },
        });
      }
    }

    return member;
  },

  async update(id: string, input: UpdateMemberInput, actorUserId: string) {
    await communityMembersService.getById(id);
    const member = await communityMembersRepository.update(id, {
      ...(input.fullName          !== undefined ? { fullName:          input.fullName }          : {}),
      ...(input.gender            !== undefined ? { gender:            input.gender }            : {}),
      ...(input.dateOfBirth       !== undefined ? { dateOfBirth:       input.dateOfBirth }       : {}),
      ...(input.phone             !== undefined ? { phone:             input.phone }             : {}),
      ...(input.address           !== undefined ? { address:           input.address }           : {}),
      ...(input.region            !== undefined ? { region:            input.region }            : {}),
      ...(input.zone              !== undefined ? { zone:              input.zone }              : {}),
      ...(input.woreda            !== undefined ? { woreda:            input.woreda }            : {}),
      ...(input.kebele            !== undefined ? { kebele:            input.kebele }            : {}),
      ...(input.occupation        !== undefined ? { occupation:        input.occupation }        : {}),
      ...(input.identificationRef !== undefined ? { identificationRef: input.identificationRef } : {}),
    });
    await recordAudit({
      actorUserId,
      action:     "member.updated",
      entityType: "community_member",
      entityId:   id,
      after:      input,
    });
    return member;
  },

  async getById(id: string) {
    const member = await communityMembersRepository.findById(id);
    if (!member) throw new NotFoundError("Community member not found");
    return member;
  },

  /**
   * Returns the CommunityMember linked to a User account, or null if none.
   * Used by the /me endpoint so a logged-in community member can retrieve
   * their own profile without knowing their CM id.
   */
  async getByUserId(userId: string): Promise<Awaited<ReturnType<typeof communityMembersRepository.findById>>> {
    return communityMembersRepository.findByUserId(userId);
  },

  /**
   * Links a CommunityMember record to a User account.
   * Admin-only. Used to associate an existing member record with a login account.
   */
  async linkUserAccount(memberId: string, userId: string, actorUserId: string) {
    // Verify no other member already has this userId
    const existing = await communityMembersRepository.findByUserId(userId);
    if (existing && existing.id !== memberId) {
      throw new ConflictError(`User account is already linked to community member ${existing.fullName}`);
    }
    const member = await communityMembersService.getById(memberId);
    const updated = await communityMembersRepository.linkUserId(memberId, userId);
    await recordAudit({
      actorUserId,
      action: "member.user_linked",
      entityType: "community_member",
      entityId: memberId,
      after: { userId, fullName: member.fullName },
    });
    return updated;
  },

  async setVerification(id: string, input: VerifyMemberInput, actorUserId: string) {
    const member = await communityMembersService.getById(id);
    if (member.verificationStatus !== "PENDING") {
      throw new ConflictError(`Member is already ${member.verificationStatus.toLowerCase()}`);
    }
    const status  = input.approve ? "VERIFIED" : "REJECTED";
    const updated = await communityMembersRepository.setVerification(id, status, actorUserId);
    await recordAudit({
      actorUserId,
      action:     "member.verification_decided",
      entityType: "community_member",
      entityId:   id,
      before:     { verificationStatus: "PENDING" },
      after:      { verificationStatus: status, note: input.note },
    });
    return updated;
  },

  /**
   * Returns live stat counts for a community member's own dashboard.
   * All numbers come directly from the database — no fake/hardcoded values.
   */
  async getMyCmStats(userId: string) {
    const member = await communityMembersRepository.findByUserId(userId);
    if (!member) {
      return { totalRequests: 0, pendingRequests: 0, registeredCases: 0, activeCases: 0, completedCases: 0, witnessCases: 0 };
    }
    const [totalRequests, pendingRequests, registeredCases, activeCases, completedCases, witnessCases] = await Promise.all([
      prisma.case.count({ where: { archivedAt: null, isRequest: true, submittedByUserId: userId } }),
      prisma.case.count({ where: { archivedAt: null, isRequest: true, submittedByUserId: userId, status: "SUBMITTED" } }),
      prisma.case.count({ where: { archivedAt: null, isRequest: false, parties: { some: { communityMemberId: member.id } } } }),
      prisma.case.count({ where: { archivedAt: null, isRequest: false, parties: { some: { communityMemberId: member.id } }, status: { in: ["ASSIGNED","HEARING_SCHEDULED","HEARING_IN_PROGRESS","DECISION_PENDING"] } } }),
      prisma.case.count({ where: { archivedAt: null, isRequest: false, parties: { some: { communityMemberId: member.id } }, status: { in: ["DECIDED","CLOSED"] } } }),
      prisma.case.count({ where: { archivedAt: null, witnesses: { some: { communityMemberId: member.id } } } }),
    ]);
    return { totalRequests, pendingRequests, registeredCases, activeCases, completedCases, witnessCases };
  },

  async list(query: ListMembersQuery) {
    const pagination: PaginationInput = { page: query.page, pageSize: query.pageSize };
    const { skip, take } = toSkipTake(pagination);
    const params: Parameters<typeof communityMembersRepository.list>[0] = { skip, take };
    if (query.search)             params.search             = query.search;
    if (query.verificationStatus) params.verificationStatus = query.verificationStatus;
    const { items, total } = await communityMembersRepository.list(params);
    return paginate(items, total, pagination);
  },
};
