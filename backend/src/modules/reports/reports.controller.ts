import type { Request, Response } from "express";
import { z } from "zod";
import { reportsService, type ReportFilters } from "./reports.service.js";
import { toCsv } from "../../utils/csv.js";

const filtersSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  caseType: z.string().max(64).optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

function parseFilters(req: Request): { filters: ReportFilters; format: "json" | "csv" } {
  const q = filtersSchema.parse(req.query);
  const filters: ReportFilters = {};
  if (q.dateFrom) filters.dateFrom = q.dateFrom;
  if (q.dateTo) filters.dateTo = q.dateTo;
  if (q.caseType) filters.caseType = q.caseType;
  return { filters, format: q.format };
}

function respond(res: Response, filename: string, rows: Record<string, unknown>[], format: "json" | "csv") {
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    res.status(200).send(toCsv(rows));
    return;
  }
  res.status(200).json({ rows });
}

export const reportsController = {
  async casesByStatus(req: Request, res: Response) {
    const { filters, format } = parseFilters(req);
    const rows = await reportsService.casesByStatus(filters);
    respond(res, "cases-by-status", rows, format);
  },

  async casesByType(req: Request, res: Response) {
    const { filters, format } = parseFilters(req);
    const rows = await reportsService.casesByType(filters);
    respond(res, "cases-by-type", rows, format);
  },

  async pendingCases(req: Request, res: Response) {
    const { filters, format } = parseFilters(req);
    const rows = await reportsService.pendingCases(filters);
    respond(res, "pending-cases", rows, format);
  },

  async hearingSchedule(req: Request, res: Response) {
    const { filters, format } = parseFilters(req);
    const rows = await reportsService.hearingSchedule(filters);
    // flatten nested case fields for CSV friendliness
    const flat = rows.map((r) => ({
      caseNumber: r.case.caseNumber,
      caseType: r.case.caseType,
      scheduledDate: r.scheduledDate,
      startTime: r.startTime,
      endTime: r.endTime,
      location: r.location,
      status: r.status,
    }));
    respond(res, "hearing-schedule", flat, format);
  },

  async decisionsSummary(req: Request, res: Response) {
    const { filters, format } = parseFilters(req);
    const rows = await reportsService.decisionsSummary(filters);
    const flat = rows.map((r) => ({
      caseNumber: r.case.caseNumber,
      caseType: r.case.caseType,
      outcome: r.outcome,
      approvalStatus: r.approvalStatus,
      decisionDate: r.decisionDate,
      createdAt: r.createdAt,
    }));
    respond(res, "decisions-summary", flat, format);
  },

  async documentStatistics(_req: Request, res: Response) {
    const stats = await reportsService.documentStatistics();
    res.status(200).json(stats);
  },
};
