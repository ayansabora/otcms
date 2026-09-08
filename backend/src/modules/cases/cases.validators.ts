import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";

const caseTypeEnum = z.enum([
  "MARRIAGE",
  "DIVORCE",
  "LAND_DISPUTE",
  "PROPERTY_DISPUTE",
  "DEBT",
  "ASSAULT",
  "DEFAMATION",
  "OTHER",
]);

const casePartySchema = z.object({
  communityMemberId: z.string().uuid(),
  roleInCase: z.enum(["COMPLAINANT", "RESPONDENT"]),
});

export const createCaseSchema = z.object({
  caseType: caseTypeEnum,
  description: z.string().min(10).max(10_000),
  location: z.string().max(255).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  parties: z.array(casePartySchema).min(1, "At least one party is required"),
  // Overrides the type-based default only if explicitly provided and only
  // by someone with case:create — the default itself comes from workflow
  // config, not the client.
  minWitnessesRequired: z.number().int().min(0).max(20).optional(),
});
export type CreateCaseInput = z.infer<typeof createCaseSchema>;

export const transitionCaseSchema = z.object({
  toStatus: z.enum([
    "SUBMITTED",
    "UNDER_REVIEW",
    "VERIFIED",
    "ASSIGNED",
    "HEARING_SCHEDULED",
    "HEARING_IN_PROGRESS",
    "DECISION_PENDING",
    "DECIDED",
    "CLOSED",
    "REJECTED",
    "WITHDRAWN",
  ]),
  note: z.string().max(1000).optional(),
});
export type TransitionCaseInput = z.infer<typeof transitionCaseSchema>;

export const assignPanelSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  leadUserId: z.string().uuid().optional(),
});
export type AssignPanelInput = z.infer<typeof assignPanelSchema>;

export const addWitnessSchema = z.object({
  fullName: z.string().min(2).max(255),
  phone: z.string().max(32).optional(),
  communityMemberId: z.string().uuid().optional(),
  testimonySummary: z.string().max(5000).optional(),
});
export type AddWitnessInput = z.infer<typeof addWitnessSchema>;

export const listCasesQuerySchema = paginationSchema.extend({
  search: z.string().max(255).optional(),
  status: z
    .enum([
      "SUBMITTED",
      "UNDER_REVIEW",
      "VERIFIED",
      "ASSIGNED",
      "HEARING_SCHEDULED",
      "HEARING_IN_PROGRESS",
      "DECISION_PENDING",
      "DECIDED",
      "CLOSED",
      "REJECTED",
      "WITHDRAWN",
    ])
    .optional(),
  caseType: caseTypeEnum.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type ListCasesQuery = z.infer<typeof listCasesQuerySchema>;
