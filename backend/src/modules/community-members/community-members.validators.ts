import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";

export const registerMemberSchema = z.object({
  fullName: z.string().min(2).max(255),
  gender: z.string().max(32).optional(),
  dateOfBirth: z.coerce.date().optional(),
  phone: z.string().max(32).optional(),
  address: z.string().max(255).optional(),
  kebele: z.string().max(128).optional(),
  identificationRef: z.string().max(128).optional(),
});
export type RegisterMemberInput = z.infer<typeof registerMemberSchema>;

export const verifyMemberSchema = z.object({
  approve: z.boolean(),
  note: z.string().max(500).optional(),
});
export type VerifyMemberInput = z.infer<typeof verifyMemberSchema>;

export const listMembersQuerySchema = paginationSchema.extend({
  search: z.string().max(255).optional(),
  verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
});
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;
