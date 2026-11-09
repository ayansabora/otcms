import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";

const caseTypeEnum = z.enum([
  "MARRIAGE", "DIVORCE", "LAND_DISPUTE", "PROPERTY_DISPUTE",
  "DEBT", "ASSAULT", "DEFAMATION", "OTHER",
]);

const casePartySchema = z.object({
  communityMemberId: z.string().uuid(),
  roleInCase:        z.enum(["COMPLAINANT", "RESPONDENT"]),
});

const witnessInputSchema = z.object({
  fullName:            z.string().min(2).max(255),
  sex:                 z.string().max(16).optional(),
  age:                 z.number().int().min(0).max(150).optional(),
  phone:               z.string().max(32).optional(),
  communityMemberId:   z.string().uuid().optional(),
  relationshipToCase:  z.string().max(255).optional(),
  testimonySummary:    z.string().max(5000).optional(),
});
export type WitnessInput = z.infer<typeof witnessInputSchema>;

export const createCaseSchema = z.object({
  caseType:              caseTypeEnum,
  title:                 z.string().max(255).optional(),
  description:           z.string().min(10).max(10_000),
  location:              z.string().max(255).optional(),
  priority:              z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  jurisdictionBasis:     z.string().max(500).optional(),
  parties:               z.array(casePartySchema).default([]),
  witnesses:             z.array(witnessInputSchema).optional(),
  minWitnessesRequired:  z.number().int().min(0).max(20).optional(),
  // Community Member self-service request flag
  isRequest:             z.boolean().optional().default(false),
  // Opposing party information supplied by CM (stored in description if no community member record)
  opposingParty: z.object({
    fullName: z.string().max(255).optional(),
    phone:    z.string().max(32).optional(),
    kebele:   z.string().max(128).optional(),
    address:  z.string().max(255).optional(),
  }).optional(),
});
export type CreateCaseInput = z.infer<typeof createCaseSchema>;

export const transitionCaseSchema = z.object({
  toStatus: z.enum([
    "SUBMITTED","UNDER_REVIEW","VERIFIED","ASSIGNED","HEARING_SCHEDULED",
    "HEARING_IN_PROGRESS","DECISION_PENDING","DECIDED","CLOSED","REJECTED","WITHDRAWN",
  ]),
  note: z.string().max(1000).optional(),
});
export type TransitionCaseInput = z.infer<typeof transitionCaseSchema>;

export const assignPanelSchema = z.object({
  userIds:     z.array(z.string().uuid()).min(1),
  leadUserId:  z.string().uuid().optional(),
});
export type AssignPanelInput = z.infer<typeof assignPanelSchema>;

export const addWitnessSchema = witnessInputSchema;
export type AddWitnessInput = z.infer<typeof addWitnessSchema>;

export const listCasesQuerySchema = paginationSchema.extend({
  search:    z.string().max(255).optional(),
  status:    z.enum([
    "SUBMITTED","UNDER_REVIEW","VERIFIED","ASSIGNED","HEARING_SCHEDULED",
    "HEARING_IN_PROGRESS","DECISION_PENDING","DECIDED","CLOSED","REJECTED","WITHDRAWN",
  ]).optional(),
  caseType:  caseTypeEnum.optional(),
  dateFrom:  z.coerce.date().optional(),
  dateTo:    z.coerce.date().optional(),
  isRequest: z.coerce.boolean().optional(),
});
export type ListCasesQuery = z.infer<typeof listCasesQuerySchema>;
