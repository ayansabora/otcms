import { api } from "./client";
import type { Case, CaseHistoryEntry, CaseStatus, CaseType, PaginatedResult } from "../types/api";

export interface CreateCaseInput {
  caseType: CaseType;
  description: string;
  location?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  parties: { communityMemberId: string; roleInCase: "COMPLAINANT" | "RESPONDENT" }[];
}

export const casesApi = {
  list: (params: { page?: number; pageSize?: number; status?: CaseStatus; search?: string } = {}) =>
    api.get<PaginatedResult<Case>>("/cases", params),
  get: (id: string) => api.get<{ case: Case }>(`/cases/${id}`),
  create: (input: CreateCaseInput) => api.post<{ case: Case }>("/cases", input),
  transition: (id: string, toStatus: CaseStatus, note?: string) =>
    api.post<{ case: Case }>(`/cases/${id}/transition`, { toStatus, note }),
  assignPanel: (id: string, userIds: string[], leadUserId?: string) =>
    api.post<{ case: Case }>(`/cases/${id}/assign-panel`, { userIds, leadUserId }),
  history: (id: string) => api.get<{ history: CaseHistoryEntry[] }>(`/cases/${id}/history`),
};
