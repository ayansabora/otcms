import { api } from "./client";
import type { Decision } from "../types/api";

export interface RecordDecisionInput {
  caseId: string;
  outcome: string;
  description: string;
  remarks?: string;
  decisionDate?: string; // ISO date
  requiredApprovals?: number;
}

export const decisionsApi = {
  listByCase: (caseId: string) =>
    api.get<{ decisions: Decision[] }>("/decisions", { caseId }),

  get: (id: string) => api.get<{ decision: Decision }>(`/decisions/${id}`),

  record: (input: RecordDecisionInput) =>
    api.post<{ decision: Decision }>("/decisions", input),

  approve: (id: string, approved: boolean, comment?: string) =>
    api.post<{ decision: Decision }>(`/decisions/${id}/approve`, {
      approved,
      ...(comment ? { comment } : {}),
    }),
};
