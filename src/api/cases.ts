import { api } from "./client";
import type { Case, CaseHistoryEntry, CaseStatus, CaseType, PaginatedResult } from "../types/api";

export interface CreateCaseInput {
  caseType: CaseType;
  title?: string;
  description: string;
  location?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  jurisdictionBasis?: string;
  registrationNotes?: string;
  isRequest?: boolean;
  opposingParty?: {
    fullName?: string;
    phone?: string;
    kebele?: string;
    address?: string;
  };
  parties: { communityMemberId: string; roleInCase: "COMPLAINANT" | "RESPONDENT" }[];
  witnesses?: {
    fullName: string;
    sex?: string;
    age?: number;
    phone?: string;
    relationshipToCase?: string;
    testimonySummary?: string;
  }[];
}

export const casesApi = {
  list: (params: { page?: number; pageSize?: number; status?: CaseStatus; caseType?: CaseType; search?: string; isRequest?: boolean; dateFrom?: string; dateTo?: string } = {}) =>
    api.get<PaginatedResult<Case>>("/cases", params),
  get: (id: string) => api.get<{ case: Case }>(`/cases/${id}`),
  create: (input: CreateCaseInput) =>
    api.post<{ case: Case; duplicateWarning?: string }>("/cases", input),
  transition: (id: string, toStatus: CaseStatus, note?: string) =>
    api.post<{ case: Case }>(`/cases/${id}/transition`, { toStatus, note }),
  assignPanel: (id: string, userIds: string[], leadUserId?: string) =>
    api.post<{ case: Case }>(`/cases/${id}/assign-panel`, { userIds, leadUserId }),
  history: (id: string) => api.get<{ history: CaseHistoryEntry[] }>(`/cases/${id}/history`),
};
