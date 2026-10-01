import { api } from "./client";
import type { Hearing, HearingStatus, PaginatedResult } from "../types/api";

export interface ScheduleHearingInput {
  caseId: string;
  startTime: string; // ISO datetime
  endTime: string;
  location: string;
  purpose?: string;
}

export interface RescheduleHearingInput {
  startTime: string;
  endTime: string;
  location?: string;
}

export const hearingsApi = {
  list: (params: {
    page?: number;
    pageSize?: number;
    caseId?: string;
    status?: HearingStatus;
    dateFrom?: string;
    dateTo?: string;
  } = {}) => api.get<PaginatedResult<Hearing>>("/hearings", params),

  get: (id: string) => api.get<{ hearing: Hearing }>(`/hearings/${id}`),

  schedule: (input: ScheduleHearingInput) =>
    api.post<{ hearing: Hearing }>("/hearings", input),

  reschedule: (id: string, input: RescheduleHearingInput) =>
    api.patch<{ hearing: Hearing }>(`/hearings/${id}/reschedule`, input),

  updateStatus: (
    id: string,
    status: Exclude<HearingStatus, "SCHEDULED">,
    notes?: string,
    outcomeRef?: string,
  ) =>
    api.patch<{ hearing: Hearing }>(`/hearings/${id}/status`, {
      status,
      ...(notes ? { notes } : {}),
      ...(outcomeRef ? { outcomeRef } : {}),
    }),

  addParticipant: (
    id: string,
    participant: {
      userId?: string;
      communityMemberId?: string;
      witnessId?: string;
      role: string;
    },
  ) => api.post<{ participant: unknown }>(`/hearings/${id}/participants`, participant),
};
