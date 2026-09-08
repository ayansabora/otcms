import { prisma } from "../../database/prismaClient.js";
import type { Prisma } from "@prisma/client";

const hearingWithRelations = {
  include: { participants: true, case: { select: { id: true, caseNumber: true, status: true } } },
} satisfies Prisma.HearingDefaultArgs;

export const hearingsRepository = {
  create(data: {
    caseId: string;
    scheduledDate: Date;
    startTime: Date;
    endTime: Date;
    location: string;
    purpose?: string;
  }) {
    return prisma.hearing.create({
      data: {
        caseId: data.caseId,
        scheduledDate: data.scheduledDate,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        ...(data.purpose ? { purpose: data.purpose } : {}),
      },
      ...hearingWithRelations,
    });
  },

  findById(id: string) {
    return prisma.hearing.findUnique({ where: { id }, ...hearingWithRelations });
  },

  update(
    id: string,
    data: Partial<{
      startTime: Date;
      endTime: Date;
      scheduledDate: Date;
      location: string;
      status: Prisma.HearingUpdateInput["status"];
      notes: string;
      outcomeRef: string;
    }>,
  ) {
    return prisma.hearing.update({ where: { id }, data, ...hearingWithRelations });
  },

  addParticipant(data: { hearingId: string; userId?: string; communityMemberId?: string; witnessId?: string; role: string }) {
    return prisma.hearingParticipant.create({ data });
  },

  /**
   * Location double-booking check: any non-cancelled hearing at the same
   * location whose [start,end) interval overlaps the proposed one.
   */
  findConflictingByLocation(location: string, startTime: Date, endTime: Date, excludeHearingId?: string) {
    return prisma.hearing.findMany({
      where: {
        location,
        status: { notIn: ["CANCELLED"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeHearingId ? { id: { not: excludeHearingId } } : {}),
      },
    });
  },

  /**
   * Elder double-booking check: any non-cancelled hearing where one of the
   * given users is a participant and the time interval overlaps.
   */
  findConflictingByParticipants(userIds: string[], startTime: Date, endTime: Date, excludeHearingId?: string) {
    if (userIds.length === 0) return Promise.resolve([]);
    return prisma.hearing.findMany({
      where: {
        status: { notIn: ["CANCELLED"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        participants: { some: { userId: { in: userIds } } },
        ...(excludeHearingId ? { id: { not: excludeHearingId } } : {}),
      },
      include: { participants: true },
    });
  },

  async list(params: {
    skip: number;
    take: number;
    caseId?: string;
    status?: Prisma.HearingWhereInput["status"];
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Prisma.HearingWhereInput = {
      ...(params.caseId ? { caseId: params.caseId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            scheduledDate: {
              ...(params.dateFrom ? { gte: params.dateFrom } : {}),
              ...(params.dateTo ? { lte: params.dateTo } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.hearing.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { startTime: "asc" },
        ...hearingWithRelations,
      }),
      prisma.hearing.count({ where }),
    ]);

    return { items, total };
  },
};
