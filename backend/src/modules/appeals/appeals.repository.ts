import { prisma } from "../../database/prismaClient.js";
import type { Prisma, $Enums } from "@prisma/client";

const appealWithRelations = {
  include: {
    filedBy:       { select: { id: true, fullName: true } },
    transferredBy: { select: { id: true, fullName: true } },
  },
} satisfies Prisma.AppealDefaultArgs;

export const appealsRepository = {
  create(data: {
    caseId: string;
    filedByUserId: string;
    appellantPartyRole: $Enums.CasePartyRole;
    groundsForAppeal: string;
    appellateCourtName: string;
  }) {
    return prisma.appeal.create({
      data: {
        case:               { connect: { id: data.caseId } },
        filedBy:            { connect: { id: data.filedByUserId } },
        appellantPartyRole: data.appellantPartyRole,
        groundsForAppeal:   data.groundsForAppeal,
        appellateCourtName: data.appellateCourtName,
      },
      ...appealWithRelations,
    });
  },

  recordTransfer(id: string, transferredByUserId: string, transferredAt: Date, notes?: string) {
    const upd: Prisma.AppealUpdateInput = {
      transferredAt,
      transferredBy: { connect: { id: transferredByUserId } },
    };
    if (notes !== undefined) upd.outcomeNotes = notes;
    return prisma.appeal.update({ where: { id }, data: upd, ...appealWithRelations });
  },

  recordOutcome(id: string, data: { outcome: string; outcomeReceivedAt: Date; outcomeNotes?: string }) {
    const upd: Prisma.AppealUpdateInput = {
      outcome:           data.outcome,
      outcomeReceivedAt: data.outcomeReceivedAt,
    };
    if (data.outcomeNotes !== undefined) upd.outcomeNotes = data.outcomeNotes;
    return prisma.appeal.update({ where: { id }, data: upd, ...appealWithRelations });
  },

  findById(id: string) {
    return prisma.appeal.findUnique({ where: { id }, ...appealWithRelations });
  },

  findByCase(caseId: string) {
    return prisma.appeal.findMany({ where: { caseId }, orderBy: { filedAt: "desc" }, ...appealWithRelations });
  },

  async list(params: { skip: number; take: number; caseId?: string }) {
    const where: Prisma.AppealWhereInput = {};
    if (params.caseId) where.caseId = params.caseId;
    const [items, total] = await prisma.$transaction([
      prisma.appeal.findMany({ where, skip: params.skip, take: params.take,
        orderBy: { filedAt: "desc" }, ...appealWithRelations }),
      prisma.appeal.count({ where }),
    ]);
    return { items, total };
  },
};
