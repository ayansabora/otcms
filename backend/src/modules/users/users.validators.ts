import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  fullName: z.string().min(2).max(255),
  phone: z.string().max(32).optional(),
  roleIds: z.array(z.string().uuid()).min(1, "At least one role is required"),
  // Admin sets a temporary password; user should change it on first login.
  // Server-generated is safer, but an admin-supplied temp password is
  // supported for in-person onboarding at the court office.
  temporaryPassword: z
    .string()
    .min(12)
    .max(128)
    .regex(/[A-Za-z]/)
    .regex(/\d/)
    .optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  phone: z.string().max(32).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const assignRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()).min(1),
});
export type AssignRolesInput = z.infer<typeof assignRolesSchema>;

export const setUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;

export const listUsersQuerySchema = paginationSchema.extend({
  search: z.string().max(255).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  roleId: z.string().uuid().optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
