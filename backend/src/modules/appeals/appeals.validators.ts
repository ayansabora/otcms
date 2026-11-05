import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";

export const fileAppealSchema = z.object({
  caseId:             z.string().uuid(),
  appellantPartyRole: z.enum(["COMPLAINANT", "RESPONDENT"]),
  groundsForAppeal:   z.string().min(10).max(5000),
  appellateCourtName: z.string().min(2).max(255),
});
export type FileAppealInput = z.infer<typeof fileAppealSchema>;

export const recordTransferSchema = z.object({
  transferredAt: z.coerce.date(),
  notes:         z.string().max(1000).optional(),
});
export type RecordTransferInput = z.infer<typeof recordTransferSchema>;

export const recordOutcomeSchema = z.object({
  outcome:           z.string().min(2).max(255),
  outcomeReceivedAt: z.coerce.date(),
  outcomeNotes:      z.string().max(5000).optional(),
});
export type RecordOutcomeInput = z.infer<typeof recordOutcomeSchema>;

export const listAppealsQuerySchema = paginationSchema.extend({
  caseId: z.string().uuid().optional(),
});
