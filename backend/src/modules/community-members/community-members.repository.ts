import { prisma } from "../../database/prismaClient.js";
import type { Prisma } from "@prisma/client";

type CreateMemberData = {
  fullName: string;
  gender?: string;
  dateOfBirth?: Date;
  phone?: string;
  address?: string;
  region?: string;
  zone?: string;
  woreda?: string;
  kebele?: string;
  occupation?: string;
  identificationRef?: string;
};

export const communityMembersRepository = {
  create(data: CreateMemberData) {
    const d: Prisma.CommunityMemberCreateInput = { fullName: data.fullName };
    if (data.gender          !== undefined) d.gender          = data.gender;
    if (data.dateOfBirth     !== undefined) d.dateOfBirth     = data.dateOfBirth;
    if (data.phone           !== undefined) d.phone           = data.phone;
    if (data.address         !== undefined) d.address         = data.address;
    if (data.region          !== undefined) (d as Record<string,unknown>).region     = data.region;
    if (data.zone            !== undefined) (d as Record<string,unknown>).zone       = data.zone;
    if (data.woreda          !== undefined) (d as Record<string,unknown>).woreda     = data.woreda;
    if (data.kebele          !== undefined) d.kebele          = data.kebele;
    if (data.occupation      !== undefined) (d as Record<string,unknown>).occupation = data.occupation;
    if (data.identificationRef !== undefined) d.identificationRef = data.identificationRef;
    return prisma.communityMember.create({ data: d });
  },

  findById(id: string) {
    return prisma.communityMember.findUnique({ where: { id } });
  },

  findByUserId(userId: string) {
    return prisma.communityMember.findUnique({ where: { userId } });
  },

  update(id: string, data: Partial<CreateMemberData>) {
    const d: Prisma.CommunityMemberUpdateInput = {};
    if (data.fullName        !== undefined) d.fullName        = data.fullName;
    if (data.gender          !== undefined) d.gender          = data.gender;
    if (data.dateOfBirth     !== undefined) d.dateOfBirth     = data.dateOfBirth;
    if (data.phone           !== undefined) d.phone           = data.phone;
    if (data.address         !== undefined) d.address         = data.address;
    if (data.region          !== undefined) (d as Record<string,unknown>).region     = data.region;
    if (data.zone            !== undefined) (d as Record<string,unknown>).zone       = data.zone;
    if (data.woreda          !== undefined) (d as Record<string,unknown>).woreda     = data.woreda;
    if (data.kebele          !== undefined) d.kebele          = data.kebele;
    if (data.occupation      !== undefined) (d as Record<string,unknown>).occupation = data.occupation;
    if (data.identificationRef !== undefined) d.identificationRef = data.identificationRef;
    return prisma.communityMember.update({ where: { id }, data: d });
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
    const where: Prisma.CommunityMemberWhereInput = { archivedAt: null };
    if (params.verificationStatus) where.verificationStatus = params.verificationStatus;
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search } },
        { phone:    { contains: params.search } },
        { identificationRef: { contains: params.search } },
      ];
    }
    const [items, total] = await prisma.$transaction([
      prisma.communityMember.findMany({ where, skip: params.skip, take: params.take, orderBy: { createdAt: "desc" } }),
      prisma.communityMember.count({ where }),
    ]);
    return { items, total };
  },
};
