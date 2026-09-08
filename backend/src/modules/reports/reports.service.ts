import { prisma } from "../../database/prismaClient.js";

export interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  caseType?: string;
}

function dateRangeWhere(filters: ReportFilters) {
  if (!filters.dateFrom && !filters.dateTo) return {};
  return {
    createdAt: {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    },
  };
}

export const reportsService = {
  /** Cases grouped by status — the standard "what's in the pipeline" view. */
  async casesByStatus(filters: ReportFilters) {
    const results = await prisma.case.groupBy({
      by: ["status"],
      where: { archivedAt: null, ...dateRangeWhere(filters), ...(filters.caseType ? { caseType: filters.caseType as never } : {}) },
      _count: { _all: true },
    });
    return results.map((r) => ({ status: r.status, count: r._count._all }));
  },

  /** Cases grouped by type. */
  async casesByType(filters: ReportFilters) {
    const results = await prisma.case.groupBy({
      by: ["caseType"],
      where: { archivedAt: null, ...dateRangeWhere(filters) },
      _count: { _all: true },
    });
    return results.map((r) => ({ caseType: r.caseType, count: r._count._all }));
  },

  /** Detailed list of currently-pending (not closed/rejected/withdrawn) cases. */
  async pendingCases(filters: ReportFilters) {
    return prisma.case.findMany({
      where: {
        archivedAt: null,
        status: { notIn: ["CLOSED", "REJECTED", "WITHDRAWN"] },
        ...dateRangeWhere(filters),
        ...(filters.caseType ? { caseType: filters.caseType as never } : {}),
      },
      select: { caseNumber: true, caseType: true, status: true, priority: true, location: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  },

  /** Hearings scheduled within a date range — the court's sitting calendar. */
  async hearingSchedule(filters: ReportFilters) {
    return prisma.hearing.findMany({
      where: {
        status: { notIn: ["CANCELLED"] },
        ...(filters.dateFrom || filters.dateTo
          ? {
              scheduledDate: {
                ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
                ...(filters.dateTo ? { lte: filters.dateTo } : {}),
              },
            }
          : {}),
      },
      select: {
        scheduledDate: true,
        startTime: true,
        endTime: true,
        location: true,
        status: true,
        case: { select: { caseNumber: true, caseType: true } },
      },
      orderBy: { startTime: "asc" },
    });
  },

  /** Decisions recorded within a date range, with approval status. */
  async decisionsSummary(filters: ReportFilters) {
    return prisma.decision.findMany({
      where: dateRangeWhere(filters),
      select: {
        outcome: true,
        approvalStatus: true,
        decisionDate: true,
        createdAt: true,
        case: { select: { caseNumber: true, caseType: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async documentStatistics() {
    const [total, byCategory] = await Promise.all([
      prisma.document.count({ where: { archivedAt: null } }),
      prisma.document.groupBy({ by: ["category"], where: { archivedAt: null }, _count: { _all: true } }),
    ]);
    return { total, byCategory: byCategory.map((c) => ({ category: c.category ?? "uncategorized", count: c._count._all })) };
  },
};
