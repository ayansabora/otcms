import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";

export const scheduleHearingSchema = z
  .object({
    caseId: z.string().uuid(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    location: z.string().min(2).max(255),
    purpose: z.string().max(255).optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
export type ScheduleHearingInput = z.infer<typeof scheduleHearingSchema>;

export const rescheduleHearingSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    location: z.string().min(2).max(255).optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
export type RescheduleHearingInput = z.infer<typeof rescheduleHearingSchema>;

export const updateHearingStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED", "POSTPONED"]),
  notes: z.string().max(5000).optional(),
  outcomeRef: z.string().max(255).optional(),
});
export type UpdateHearingStatusInput = z.infer<typeof updateHearingStatusSchema>;

export const addHearingParticipantSchema = z.object({
  userId: z.string().uuid().optional(),
  communityMemberId: z.string().uuid().optional(),
  witnessId: z.string().uuid().optional(),
  role: z.string().min(2).max(64),
});
export type AddHearingParticipantInput = z.infer<typeof addHearingParticipantSchema>;

export const listHearingsQuerySchema = paginationSchema.extend({
  caseId: z.string().uuid().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "POSTPONED"]).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type ListHearingsQuery = z.infer<typeof listHearingsQuerySchema>;
