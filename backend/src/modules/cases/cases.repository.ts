import { prisma } from "../../database/prismaClient.js";
import type { Prisma } from "@prisma/client";

const caseWithRelations = {
  include: {
    parties: { include: { communityMember: true } },
    witnesses: { include: { witness: true } },
    assignments: { include: { user: { select: { id: true, fullName: true, email: true } } } },
    hearings: true,
    decisions: true,
  },
} satisfies Prisma.CaseDefaultArgs;

export const casesRepository = {
  async nextCaseNumber(year: number): Promise<string> {
    const prefix = `OTCMS-${year}-`;
    const count = await prisma.case.count({ where: { caseNumber: { startsWith: prefix } } });
    const sequence = String(count + 1).padStart(4, "0");
    return `${prefix}${sequence}`;
  },

  create(data: {
    caseNumber: string;
    caseType: Prisma.CaseCreateInput["caseType"];
    description: string;
    location?: string;
    priority: Prisma.CaseCreateInput["priority"];
    minWitnessesRequired: number;
    submittedByUserId?: string;
    parties: { communityMemberId: string; roleInCase: "COMPLAINANT" | "RESPONDENT" }[];
  }) {
    return prisma.case.create({
      data: {
        caseNumber: data.caseNumber,
        caseType: data.caseType,
        description: data.description,
        ...(data.location ? { location: data.location } : {}),
        priority: data.priority,
        minWitnessesRequired: data.minWitnessesRequired,
        ...(data.submittedByUserId ? { submittedByUserId: data.submittedByUserId } : {}),
        parties: { create: data.parties },
        history: {
          create: {
            toStatus: "SUBMITTED",
            ...(data.submittedByUserId ? { actorUserId: data.submittedByUserId } : {}),
          },
        },
      },
      ...caseWithRelations,
    });
  },

  findById(id: string) {
    return prisma.case.findUnique({ where: { id }, ...caseWithRelations });
  },

  updateStatus(id: string, status: Prisma.CaseUpdateInput["status"]) {
    return prisma.case.update({ where: { id }, data: { status }, ...caseWithRelations });
  },

  addHistoryEntry(data: {
    caseId: string;
    fromStatus?: Prisma.CaseHistoryCreateInput["fromStatus"];
    toStatus: Prisma.CaseHistoryCreateInput["toStatus"];
    actorUserId?: string;
    note?: string;
  }) {
    return prisma.caseHistory.create({
      data: {
        caseId: data.caseId,
        ...(data.fromStatus ? { fromStatus: data.fromStatus } : {}),
        toStatus: data.toStatus,
        ...(data.actorUserId ? { actorUserId: data.actorUserId } : {}),
        ...(data.note ? { note: data.note } : {}),
      },
    });
  },

  getHistory(caseId: string) {
    return prisma.caseHistory.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
  },

  assignPanel(caseId: string, assignments: { userId: string; roleInPanel: "LEAD" | "MEMBER" }[]) {
    return prisma.$transaction([
      prisma.caseAssignment.deleteMany({ where: { caseId } }),
      prisma.caseAssignment.createMany({ data: assignments.map((a) => ({ caseId, ...a })) }),
    ]);
  },

  addWitness(data: { caseId: string; witnessId: string; testimonySummary?: string; communityMemberId?: string }) {
    return prisma.caseWitness.create({
      data: {
        caseId: data.caseId,
        witnessId: data.witnessId,
        ...(data.testimonySummary ? { testimonySummary: data.testimonySummary, testifiedAt: new Date() } : {}),
        ...(data.communityMemberId ? { communityMemberId: data.communityMemberId } : {}),
      },
    });
  },

  createWitness(data: { fullName: string; phone?: string; communityMemberId?: string }) {
    return prisma.witness.create({ data });
  },

  countWitnesses(caseId: string) {
    return prisma.caseWitness.count({ where: { caseId } });
  },

  isUserAssigned(caseId: string, userId: string) {
    return prisma.caseAssignment.findUnique({ where: { caseId_userId: { caseId, userId } } });
  },

  async list(params: {
    skip: number;
    take: number;
    search?: string;
    status?: Prisma.CaseWhereInput["status"];
    caseType?: Prisma.CaseWhereInput["caseType"];
    dateFrom?: Date;
    dateTo?: Date;
    onlyAssignedToUserId?: string;
    onlySubmittedByUserId?: string;
  }) {
    const where: Prisma.CaseWhereInput = {
      archivedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.caseType ? { caseType: params.caseType } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            createdAt: {
              ...(params.dateFrom ? { gte: params.dateFrom } : {}),
              ...(params.dateTo ? { lte: params.dateTo } : {}),
            },
          }
        : {}),
      ...(params.search
        ? { OR: [{ caseNumber: { contains: params.search } }, { description: { contains: params.search } }] }
        : {}),
      ...(params.onlyAssignedToUserId
        ? { assignments: { some: { userId: params.onlyAssignedToUserId, removedAt: null } } }
        : {}),
      ...(params.onlySubmittedByUserId ? { submittedByUserId: params.onlySubmittedByUserId } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.case.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        ...caseWithRelations,
      }),
      prisma.case.count({ where }),
    ]);

    return { items, total };
  },
};
