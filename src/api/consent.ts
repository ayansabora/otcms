import { api } from "./client";
import type { ConsentRecord } from "../types/api";

export const consentApi = {
  listByCase: (caseId: string) =>
    api.get<{ consents: ConsentRecord[] }>("/consent", { caseId }),

  record: (input: { caseId: string; communityMemberId: string; consentGiven: boolean; notes?: string }) =>
    api.post<{ consent: ConsentRecord }>("/consent", input),

  withdraw: (id: string, withdrawalReason: string) =>
    api.patch<{ consent: ConsentRecord }>(`/consent/${id}/withdraw`, { withdrawalReason }),
};
