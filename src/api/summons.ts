import { api } from "./client";
import type { Summons, SummonsMethod, PaginatedResult } from "../types/api";

export const summonsApi = {
  list: (params: { caseId?: string; page?: number; pageSize?: number } = {}) =>
    api.get<PaginatedResult<Summons>>("/summons", params),

  issue: (input: { caseId: string; respondentId: string; serviceMethod?: SummonsMethod; notes?: string }) =>
    api.post<{ summons: Summons }>("/summons", input),

  recordService: (id: string, input: { servedAt: string; servedToName: string; notes?: string }) =>
    api.patch<{ summons: Summons }>(`/summons/${id}/serve`, input),
};
