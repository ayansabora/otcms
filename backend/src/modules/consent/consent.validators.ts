import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";

export const recordConsentSchema = z.object({
  caseId:            z.string().uuid(),
  communityMemberId: z.string().uuid(),
  consentGiven:      z.boolean(),
  notes:             z.string().max(500).optional(),
});
export type RecordConsentInput = z.infer<typeof recordConsentSchema>;

export const withdrawConsentSchema = z.object({
  withdrawalReason: z.string().min(2).max(500),
});
export type WithdrawConsentInput = z.infer<typeof withdrawConsentSchema>;

export const listConsentQuerySchema = paginationSchema.extend({
  caseId: z.string().uuid().optional(),
});
