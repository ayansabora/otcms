import { z } from "zod";

export const recordDecisionSchema = z.object({
  caseId: z.string().uuid(),
  outcome: z.string().min(2).max(255),
  description: z.string().min(10).max(10_000),
  remarks: z.string().max(5000).optional(),
  decisionDate: z.coerce.date().optional(),
  // Overrides the default (panel size) required-approvals count for this
  // decision — configurable per §11's consensus model, DEFAULT PENDING
  // CONFIRMATION (§27 Q1: unanimous vs. majority, and default panel size).
  requiredApprovals: z.number().int().min(1).max(20).optional(),
});
export type RecordDecisionInput = z.infer<typeof recordDecisionSchema>;

export const approveDecisionSchema = z.object({
  approved: z.boolean(),
  comment: z.string().max(2000).optional(),
});
export type ApproveDecisionInput = z.infer<typeof approveDecisionSchema>;
