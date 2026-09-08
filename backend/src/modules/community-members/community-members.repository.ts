import { prisma } from "../../database/prismaClient.js";
import type { Prisma } from "@prisma/client";

export const communityMembersRepository = {
  create(data: {
    fullName: string;
    gender?: string;
    dateOfBirth?: Date;
    phone?: string;
    address?: string;
    kebele?: string;
    identificationRef?: string;
  }) {
    return prisma.communityMember.create({ data });
  },

  findById(id: string) {
    return prisma.communityMember.findUnique({ where: { id } });
  },

  findByUserId(userId: string) {
    return prisma.communityMember.findUnique({ where: { userId } });
  },

  setVerification(id: string, status: "VERIFIED" | "REJECTED", verifiedByUserId: string) {
    return prisma.communityMember.update({
      where: { id },
      data: { verificationStatus: status, verifiedByUserId, verifiedAt: new Date() },
    });
  },

  async list(params: {
    skip: number;
    take: number;
    search?: string;
    verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  }) {
    const where: Prisma.CommunityMemberWhereInput = {
      archivedAt: null,
      ...(params.verificationStatus ? { verificationStatus: params.verificationStatus } : {}),
      ...(params.search
        ? {
            OR: [
              { fullName: { contains: params.search } },
              { phone: { contains: params.search } },
              { identificationRef: { contains: params.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.communityMember.findMany({ where, skip: params.skip, take: params.take, orderBy: { createdAt: "desc" } }),
      prisma.communityMember.count({ where }),
    ]);

    return { items, total };
  },
};
