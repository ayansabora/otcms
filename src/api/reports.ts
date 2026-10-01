import { api } from "./client";

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  caseType?: string;
  format?: "json" | "csv";
}

export interface CasesByStatusRow { status: string; count: number }
export interface CasesByTypeRow { caseType: string; count: number }

export const reportsApi = {
  casesByStatus: (filters: ReportFilters = {}) =>
    api.get<{ rows: CasesByStatusRow[] }>("/reports/cases-by-status", filters),

  casesByType: (filters: ReportFilters = {}) =>
    api.get<{ rows: CasesByTypeRow[] }>("/reports/cases-by-type", filters),

  pendingCases: (filters: ReportFilters = {}) =>
    api.get<{ rows: Record<string, unknown>[] }>("/reports/pending-cases", filters),

  hearingSchedule: (filters: ReportFilters = {}) =>
    api.get<{ rows: Record<string, unknown>[] }>("/reports/hearing-schedule", filters),

  decisionsSummary: (filters: ReportFilters = {}) =>
    api.get<{ rows: Record<string, unknown>[] }>("/reports/decisions-summary", filters),

  documentStatistics: () =>
    api.get<Record<string, unknown>>("/reports/document-statistics"),
};
