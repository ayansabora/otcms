import { randomBytes } from "node:crypto";
import { prisma } from "../../database/prismaClient.js";
import { usersRepository, rolesRepository } from "./users.repository.js";
import { hashPassword } from "../../utils/password.js";
import { ConflictError, ValidationError, NotFoundError, ForbiddenError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import { toSkipTake, paginate, type PaginationInput } from "../../utils/pagination.js";
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
  AdminResetPasswordInput,
  CreateRoleInput,
  UpdateRoleInput,
} from "./users.validators.js";

export const usersService = {
  async create(input: CreateUserInput, actorUserId: string) {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing) throw new ConflictError("A user with this email already exists");

    const roles = await rolesRepository.findManyByIds(input.roleIds);
    if (roles.length !== input.roleIds.length) {
      throw new ValidationError("One or more role IDs are invalid");
    }

    const temporaryPassword =
      input.temporaryPassword ?? randomBytes(9).toString("base64url") + "Aa1!";
    const passwordHash = await hashPassword(temporaryPassword);

    const user = await usersRepository.create({
      email: input.email,
      fullName: input.fullName,
      ...(input.phone ? { phone: input.phone } : {}),
      passwordHash,
      roleIds: input.roleIds,
    });

    await recordAudit({
      actorUserId,
      action: "user.created",
      entityType: "user",
      entityId: user.id,
      after: { email: user.email, roles: input.roleIds },
    });

    return {
      user,
      temporaryPassword: input.temporaryPassword ? undefined : temporaryPassword,
    };
  },

  async getById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError("User not found");
    return user;
  },

  async update(id: string, input: UpdateUserInput, actorUserId: string) {
    await usersService.getById(id);
    const user = await usersRepository.update(id, {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    });
    await recordAudit({
      actorUserId,
      action: "user.updated",
      entityType: "user",
      entityId: id,
      after: input,
    });
    return user;
  },

  async setStatus(
    id: string,
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED",
    actorUserId: string,
  ) {
    if (id === actorUserId && status !== "ACTIVE") {
      throw new ValidationError("You cannot deactivate your own account");
    }

    // Prevent deactivating the last active administrator
    if (status !== "ACTIVE") {
      const target = await usersService.getById(id);
      const isAdmin = target.roles.some((ur) => ur.role.name === "ADMIN");
      if (isAdmin) {
        const activeAdmins = await prisma.user.count({
          where: {
            status: "ACTIVE",
            archivedAt: null,
            roles: { some: { role: { name: "ADMIN" } } },
          },
        });
        if (activeAdmins <= 1) {
          throw new ForbiddenError(
            "Cannot deactivate the last active administrator. Promote another user to ADMIN first.",
          );
        }
      }
    }

    const before = await usersService.getById(id);
    const user = await usersRepository.setStatus(id, status);
    await recordAudit({
      actorUserId,
      action: "user.status_changed",
      entityType: "user",
      entityId: id,
      before: { status: before.status },
      after: { status },
    });
    return user;
  },

  async assignRoles(id: string, roleIds: string[], actorUserId: string) {
    // Prevent actor from removing their own ADMIN role
    if (id === actorUserId) {
      const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
      if (adminRole && !roleIds.includes(adminRole.id)) {
        throw new ForbiddenError("You cannot remove your own ADMIN role.");
      }
    }

    await usersService.getById(id);
    const roles = await rolesRepository.findManyByIds(roleIds);
    if (roles.length !== roleIds.length) {
      throw new ValidationError("One or more role IDs are invalid");
    }

    await usersRepository.replaceRoles(id, roleIds);
    await recordAudit({
      actorUserId,
      action: "user.roles_changed",
      entityType: "user",
      entityId: id,
      after: { roleIds },
    });
    return usersService.getById(id);
  },

  async adminResetPassword(
    id: string,
    input: AdminResetPasswordInput,
    actorUserId: string,
  ) {
    await usersService.getById(id);
    const passwordHash = await hashPassword(input.newPassword);
    // Update hash and clear any lockout state
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    // Revoke all active refresh tokens so the user must re-login
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordAudit({
      actorUserId,
      action: "user.password_reset_by_admin",
      entityType: "user",
      entityId: id,
    });
  },

  async list(query: ListUsersQuery) {
    const pagination: PaginationInput = { page: query.page, pageSize: query.pageSize };
    const { skip, take } = toSkipTake(pagination);
    const params: Parameters<typeof usersRepository.list>[0] = { skip, take };
    if (query.search) params.search = query.search;
    if (query.status) params.status = query.status;
    if (query.roleId) params.roleId = query.roleId;
    const { items, total } = await usersRepository.list(params);
    return paginate(items, total, pagination);
  },
};

export const rolesService = {
  listAll() {
    return rolesRepository.findAll();
  },

  async create(input: CreateRoleInput, actorUserId: string) {
    const existing = await prisma.role.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError(`A role named "${input.name}" already exists`);

    const role = await prisma.role.create({
      data: {
        name: input.name,
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });

    // Attach permissions if supplied
    if (input.permissionCodes.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { code: { in: input.permissionCodes } },
      });
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }

    await recordAudit({
      actorUserId,
      action: "role.created",
      entityType: "role",
      entityId: role.id,
      after: { name: role.name, permissionCodes: input.permissionCodes },
    });

    return prisma.role.findUniqueOrThrow({
      where: { id: role.id },
      include: { permissions: { include: { permission: true } } },
    });
  },

  async update(id: string, input: UpdateRoleInput, actorUserId: string) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundError("Role not found");

    // Protect built-in roles from name/permission changes that could break the system
    const PROTECTED = ["ADMIN", "COURT_MANAGER", "RECORD_OFFICER", "COMMUNITY_MEMBER"];
    if (PROTECTED.includes(role.name) && input.permissionCodes !== undefined) {
      throw new ForbiddenError(
        `The "${role.name}" role is a system role. Its permissions cannot be changed through the UI. Update the seed file instead.`,
      );
    }

    if (input.description !== undefined) {
      await prisma.role.update({ where: { id }, data: { description: input.description } });
    }

    if (input.permissionCodes !== undefined) {
      const perms = await prisma.permission.findMany({
        where: { code: { in: input.permissionCodes } },
      });
      await prisma.$transaction([
        prisma.rolePermission.deleteMany({ where: { roleId: id } }),
        prisma.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
          skipDuplicates: true,
        }),
      ]);
    }

    await recordAudit({
      actorUserId,
      action: "role.updated",
      entityType: "role",
      entityId: id,
      after: input,
    });

    return prisma.role.findUniqueOrThrow({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
  },

  async delete(id: string, actorUserId: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { users: true },
    });
    if (!role) throw new NotFoundError("Role not found");

    const PROTECTED = ["ADMIN", "COURT_MANAGER", "RECORD_OFFICER", "COMMUNITY_MEMBER"];
    if (PROTECTED.includes(role.name)) {
      throw new ForbiddenError(`The "${role.name}" role is a system role and cannot be deleted.`);
    }

    if (role.users.length > 0) {
      throw new ConflictError(
        `Cannot delete role "${role.name}" — it is still assigned to ${role.users.length} user(s). Reassign those users first.`,
      );
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });

    await recordAudit({
      actorUserId,
      action: "role.deleted",
      entityType: "role",
      entityId: id,
      before: { name: role.name },
    });
  },
};
