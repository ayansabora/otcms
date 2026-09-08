import { prisma } from "../../database/prismaClient.js";
import type { Prisma } from "@prisma/client";

const decisionWithRelations = {
  include: { approvals: { include: { user: { select: { id: true, fullName: true } } } }, case: { select: { id: true, caseNumber: true, status: true } } },
} satisfies Prisma.DecisionDefaultArgs;

export const decisionsRepository = {
  create(data: {
    caseId: string;
    outcome: string;
    description: string;
    remarks?: string;
    decisionDate?: Date;
    requiredApprovals: number;
  }) {
    return prisma.decision.create({
      data: {
        caseId: data.caseId,
        outcome: data.outcome,
        description: data.description,
        ...(data.remarks ? { remarks: data.remarks } : {}),
        ...(data.decisionDate ? { decisionDate: data.decisionDate } : {}),
        requiredApprovals: data.requiredApprovals,
      },
      ...decisionWithRelations,
    });
  },

  findById(id: string) {
    return prisma.decision.findUnique({ where: { id }, ...decisionWithRelations });
  },

  upsertApproval(decisionId: string, userId: string, approved: boolean, comment?: string) {
    return prisma.decisionApproval.upsert({
      where: { decisionId_userId: { decisionId, userId } },
      update: { approved, ...(comment ? { comment } : {}) },
      create: { decisionId, userId, approved, ...(comment ? { comment } : {}) },
    });
  },

  finalize(id: string, status: "APPROVED" | "REJECTED") {
    return prisma.decision.update({
      where: { id },
      data: { approvalStatus: status, finalizedAt: new Date() },
      ...decisionWithRelations,
    });
  },

  listByCase(caseId: string) {
    return prisma.decision.findMany({ where: { caseId }, ...decisionWithRelations, orderBy: { createdAt: "desc" } });
  },
};
