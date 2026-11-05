import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";

export const issueSummonsSchema = z.object({
  caseId:          z.string().uuid(),
  respondentId:    z.string().uuid(),
  serviceMethod:   z.enum(["PERSONAL", "REPRESENTATIVE", "POSTED"]).default("PERSONAL"),
  notes:           z.string().max(1000).optional(),
});
export type IssueSummonsInput = z.infer<typeof issueSummonsSchema>;

export const recordServiceSchema = z.object({
  servedAt:      z.coerce.date(),
  servedToName:  z.string().min(2).max(255),
  notes:         z.string().max(1000).optional(),
});
export type RecordServiceInput = z.infer<typeof recordServiceSchema>;

export const listSummonsQuerySchema = paginationSchema.extend({
  caseId: z.string().uuid().optional(),
});
