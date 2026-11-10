import { prisma } from "../../database/prismaClient.js";
import type { Prisma, $Enums } from "@prisma/client";

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
    caseType: $Enums.CaseType;
    title?: string;
    description: string;
    location?: string;
    jurisdictionBasis?: string;
    isRequest?: boolean;
    priority: $Enums.CasePriority;
    minWitnessesRequired: number;
    submittedByUserId?: string;
    parties: { communityMemberId: string; roleInCase: "COMPLAINANT" | "RESPONDENT" }[];
  }) {
    const historyCreate: Prisma.CaseHistoryCreateWithoutCaseInput = { toStatus: "SUBMITTED" };
    if (data.submittedByUserId !== undefined) historyCreate.actorUserId = data.submittedByUserId;

    const createData: Prisma.CaseCreateInput = {
      caseNumber:           data.caseNumber,
      caseType:             data.caseType,
      description:          data.description,
      priority:             data.priority,
      minWitnessesRequired: data.minWitnessesRequired,
      parties:              { create: data.parties },
      history:              { create: historyCreate },
    };
    if (data.title             !== undefined) (createData as Record<string,unknown>).title             = data.title;
    if (data.location          !== undefined) createData.location          = data.location;
    if (data.jurisdictionBasis !== undefined) createData.jurisdictionBasis = data.jurisdictionBasis;
    if (data.submittedByUserId !== undefined) createData.submittedByUserId = data.submittedByUserId;
    if (data.isRequest         !== undefined) (createData as Record<string,unknown>).isRequest = data.isRequest;

    return prisma.case.create({ data: createData, ...caseWithRelations });
  },

  findById(id: string) {
    return prisma.case.findUnique({ where: { id }, ...caseWithRelations });
  },

  updateStatus(id: string, status: $Enums.CaseStatus) {
    return prisma.case.update({ where: { id }, data: { status }, ...caseWithRelations });
  },

  addHistoryEntry(data: {
    caseId: string;
    fromStatus?: $Enums.CaseStatus;
    toStatus: $Enums.CaseStatus;
    actorUserId?: string;
    note?: string;
  }) {
    const entryData: Prisma.CaseHistoryCreateInput = {
      case:     { connect: { id: data.caseId } },
      toStatus: data.toStatus,
    };
    if (data.fromStatus  !== undefined) entryData.fromStatus  = data.fromStatus;
    if (data.actorUserId !== undefined) entryData.actorUserId = data.actorUserId;
    if (data.note        !== undefined) entryData.note        = data.note;
    return prisma.caseHistory.create({ data: entryData });
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

  addWitness(data: {
    caseId: string;
    witnessId: string;
    relationshipToCase?: string;
    testimonySummary?: string;
    communityMemberId?: string;
  }) {
    const witnessData: Prisma.CaseWitnessCreateInput = {
      case:    { connect: { id: data.caseId } },
      witness: { connect: { id: data.witnessId } },
    };
    if (data.relationshipToCase !== undefined) (witnessData as Record<string,unknown>).relationshipToCase = data.relationshipToCase;
    if (data.testimonySummary   !== undefined) { witnessData.testimonySummary = data.testimonySummary; witnessData.testifiedAt = new Date(); }
    if (data.communityMemberId  !== undefined) witnessData.communityMember = { connect: { id: data.communityMemberId } };
    return prisma.caseWitness.create({ data: witnessData });
  },

  createWitness(data: { fullName: string; sex?: string; age?: number; phone?: string; communityMemberId?: string }) {
    const d: Prisma.WitnessCreateInput = { fullName: data.fullName };
    if (data.sex               !== undefined) (d as Record<string,unknown>).sex = data.sex;
    if (data.age               !== undefined) (d as Record<string,unknown>).age = data.age;
    if (data.phone             !== undefined) d.phone             = data.phone;
    if (data.communityMemberId !== undefined) d.communityMemberId = data.communityMemberId;
    return prisma.witness.create({ data: d });
  },

  countWitnesses(caseId: string) {
    return prisma.caseWitness.count({ where: { caseId } });
  },

  /**
   * Creates multiple witnesses and links them to the given case inside a
   * single transaction. If any witness row fails, the whole batch rolls back
   * so the case is never left in a partially-witnessed state.
   */
  async createWitnessesForCase(
    caseId: string,
    witnesses: {
      fullName: string;
      sex?: string;
      age?: number;
      phone?: string;
      communityMemberId?: string;
      relationshipToCase?: string;
      testimonySummary?: string;
    }[],
  ) {
    return prisma.$transaction(async (tx) => {
      for (const w of witnesses) {
        const witnessData: Prisma.WitnessCreateInput = { fullName: w.fullName };
        if (w.sex               !== undefined) (witnessData as Record<string, unknown>).sex = w.sex;
        if (w.age               !== undefined) (witnessData as Record<string, unknown>).age = w.age;
        if (w.phone             !== undefined) witnessData.phone             = w.phone;
        if (w.communityMemberId !== undefined) witnessData.communityMemberId = w.communityMemberId;

        const witness = await tx.witness.create({ data: witnessData });

        const linkData: Prisma.CaseWitnessCreateInput = {
          case:    { connect: { id: caseId } },
          witness: { connect: { id: witness.id } },
        };
        if (w.relationshipToCase !== undefined) (linkData as Record<string, unknown>).relationshipToCase = w.relationshipToCase;
        if (w.testimonySummary   !== undefined) {
          linkData.testimonySummary = w.testimonySummary;
          linkData.testifiedAt      = new Date();
        }
        if (w.communityMemberId  !== undefined) linkData.communityMember = { connect: { id: w.communityMemberId } };

        await tx.caseWitness.create({ data: linkData });
      }
    });
  },

  findOpenCaseByParties(complainantId: string, respondentId: string, caseType: string) {
    return prisma.case.findFirst({
      where: {
        archivedAt: null,
        caseType:   caseType as never,
        status:     { notIn: ["CLOSED", "REJECTED", "WITHDRAWN"] },
        parties: {
          some: { communityMemberId: complainantId, roleInCase: "COMPLAINANT" },
        },
        AND: {
          parties: {
            some: { communityMemberId: respondentId, roleInCase: "RESPONDENT" },
          },
        },
      },
      select: { id: true, caseNumber: true },
    });
  },

  isUserAssigned(caseId: string, userId: string) {
    return prisma.caseAssignment.findUnique({ where: { caseId_userId: { caseId, userId } } });
  },

  async list(params: {
    skip: number;
    take: number;
    search?: string;
    status?: $Enums.CaseStatus;
    caseType?: $Enums.CaseType;
    dateFrom?: Date;
    dateTo?: Date;
    onlyAssignedToUserId?: string;
    onlySubmittedByUserId?: string;
    partyMemberId?: string;
    isRequest?: boolean;
  }) {
    const where: Prisma.CaseWhereInput = { archivedAt: null };
    if (params.status)   where.status   = params.status;
    if (params.caseType) where.caseType = params.caseType;
    if (params.isRequest !== undefined) (where as Record<string,unknown>).isRequest = params.isRequest;
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = params.dateFrom;
      if (params.dateTo)   where.createdAt.lte = params.dateTo;
    }
    if (params.search) {
      where.OR = [
        { caseNumber:  { contains: params.search } },
        { description: { contains: params.search } },
      ];
    }
    if (params.onlyAssignedToUserId) {
      where.assignments = { some: { userId: params.onlyAssignedToUserId, removedAt: null } };
    }
    if (params.onlySubmittedByUserId) where.submittedByUserId = params.onlySubmittedByUserId;
    // Filter to cases where this community member is a party (COMPLAINANT or RESPONDENT)
    if (params.partyMemberId) {
      where.parties = { some: { communityMemberId: params.partyMemberId } };
    }

    const [items, total] = await prisma.$transaction([
      prisma.case.findMany({ where, skip: params.skip, take: params.take, orderBy: { createdAt: "desc" }, ...caseWithRelations }),
      prisma.case.count({ where }),
    ]);
    return { items, total };
  },
};
