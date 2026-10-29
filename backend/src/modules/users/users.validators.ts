import { z } from "zod";
import { paginationSchema } from "../../utils/pagination.js";

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  fullName: z.string().min(2).max(255),
  phone: z.string().max(32).optional(),
  roleIds: z.array(z.string().uuid()).min(1, "At least one role is required"),
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

// Admin-initiated password reset — sets a new temporary password for any user.
export const adminResetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128)
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one number"),
});
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

// Role CRUD
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[A-Z0-9_]+$/, "Role name must be uppercase letters, numbers and underscores only"),
  description: z.string().max(255).optional(),
  permissionCodes: z.array(z.string().max(128)).default([]),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  description: z.string().max(255).optional(),
  permissionCodes: z.array(z.string().max(128)).optional(),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
