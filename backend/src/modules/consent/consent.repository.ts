import { prisma } from "../../database/prismaClient.js";
import type { Prisma } from "@prisma/client";

const consentWithRelations = {
  include: {
    communityMember: { select: { id: true, fullName: true, phone: true } },
    recordedBy:      { select: { id: true, fullName: true } },
  },
} satisfies Prisma.ConsentRecordDefaultArgs;

export const consentRepository = {
  upsert(data: {
    caseId: string;
    communityMemberId: string;
    consentGiven: boolean;
    recordedByUserId: string;
    notes?: string;
  }) {
    const d: Prisma.ConsentRecordCreateInput = {
      case:            { connect: { id: data.caseId } },
      communityMember: { connect: { id: data.communityMemberId } },
      consentGiven:    data.consentGiven,
      recordedBy:      { connect: { id: data.recordedByUserId } },
    };
    if (data.notes !== undefined) d.notes = data.notes;
    return prisma.consentRecord.upsert({
      where: { caseId_communityMemberId: { caseId: data.caseId, communityMemberId: data.communityMemberId } },
      create: d,
      update: {
        consentGiven:    data.consentGiven,
        recordedBy:      { connect: { id: data.recordedByUserId } },
        consentDate:     new Date(),
        withdrawnAt:     null,
        withdrawalReason: null,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      ...consentWithRelations,
    });
  },

  withdraw(id: string, reason: string) {
    return prisma.consentRecord.update({
      where: { id },
      data: { withdrawnAt: new Date(), withdrawalReason: reason },
      ...consentWithRelations,
    });
  },

  findById(id: string) {
    return prisma.consentRecord.findUnique({ where: { id }, ...consentWithRelations });
  },

  findByCaseAndMember(caseId: string, communityMemberId: string) {
    return prisma.consentRecord.findUnique({
      where: { caseId_communityMemberId: { caseId, communityMemberId } },
      ...consentWithRelations,
    });
  },

  listByCase(caseId: string) {
    return prisma.consentRecord.findMany({
      where: { caseId },
      orderBy: { consentDate: "asc" },
      ...consentWithRelations,
    });
  },

  async allPartiesConsented(caseId: string): Promise<boolean> {
    const consents = await prisma.consentRecord.findMany({ where: { caseId } });
    if (consents.length < 2) return false;
    return consents.every((c) => c.consentGiven && !c.withdrawnAt);
  },
};
