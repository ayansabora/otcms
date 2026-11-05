import { api } from "./client";
import type { Appeal, PaginatedResult } from "../types/api";

export const appealsApi = {
  list: (params: { caseId?: string; page?: number; pageSize?: number } = {}) =>
    api.get<PaginatedResult<Appeal>>("/appeals", params),

  file: (input: {
    caseId: string;
    appellantPartyRole: "COMPLAINANT" | "RESPONDENT";
    groundsForAppeal: string;
    appellateCourtName: string;
  }) => api.post<{ appeal: Appeal }>("/appeals", input),

  recordTransfer: (id: string, input: { transferredAt: string; notes?: string }) =>
    api.patch<{ appeal: Appeal }>(`/appeals/${id}/transfer`, input),

  recordOutcome: (id: string, input: { outcome: string; outcomeReceivedAt: string; outcomeNotes?: string }) =>
    api.patch<{ appeal: Appeal }>(`/appeals/${id}/outcome`, input),
};
