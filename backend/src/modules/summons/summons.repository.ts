import { prisma } from "../../database/prismaClient.js";
import type { Prisma } from "@prisma/client";

const summonsWithRelations = {
  include: {
    respondent:  { select: { id: true, fullName: true, phone: true } },
    issuedBy:    { select: { id: true, fullName: true } },
    servedByUser:{ select: { id: true, fullName: true } },
  },
} satisfies Prisma.SummonsDefaultArgs;

export const summonsRepository = {
  create(data: {
    caseId: string;
    respondentId: string;
    serviceMethod: "PERSONAL" | "REPRESENTATIVE" | "POSTED";
    issuedByUserId: string;
    attemptNumber: number;
    notes?: string;
  }) {
    const d: Prisma.SummonsCreateInput = {
      case:          { connect: { id: data.caseId } },
      respondent:    { connect: { id: data.respondentId } },
      serviceMethod: data.serviceMethod,
      issuedBy:      { connect: { id: data.issuedByUserId } },
      attemptNumber: data.attemptNumber,
    };
    if (data.notes !== undefined) d.notes = data.notes;
    return prisma.summons.create({ data: d, ...summonsWithRelations });
  },

  recordService(id: string, data: {
    servedAt: Date;
    servedToName: string;
    servedByUserId: string;
    notes?: string;
  }) {
    const upd: Prisma.SummonsUpdateInput = {
      servedAt:     data.servedAt,
      servedToName: data.servedToName,
      servedByUser: { connect: { id: data.servedByUserId } },
    };
    if (data.notes !== undefined) upd.notes = data.notes;
    return prisma.summons.update({ where: { id }, data: upd, ...summonsWithRelations });
  },

  findById(id: string) {
    return prisma.summons.findUnique({ where: { id }, ...summonsWithRelations });
  },

  countByCaseAndRespondent(caseId: string, respondentId: string) {
    return prisma.summons.count({ where: { caseId, respondentId } });
  },

  async list(params: { skip: number; take: number; caseId?: string }) {
    const where: Prisma.SummonsWhereInput = {};
    if (params.caseId) where.caseId = params.caseId;
    const [items, total] = await prisma.$transaction([
      prisma.summons.findMany({ where, skip: params.skip, take: params.take,
        orderBy: { issuedAt: "desc" }, ...summonsWithRelations }),
      prisma.summons.count({ where }),
    ]);
    return { items, total };
  },
};
