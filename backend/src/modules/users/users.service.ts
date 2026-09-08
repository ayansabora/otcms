import { randomBytes } from "node:crypto";
import { usersRepository, rolesRepository } from "./users.repository.js";
import { hashPassword } from "../../utils/password.js";
import { ConflictError, ValidationError, NotFoundError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import { toSkipTake, paginate, type PaginationInput } from "../../utils/pagination.js";
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from "./users.validators.js";

export const usersService = {
  async create(input: CreateUserInput, actorUserId: string) {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing) throw new ConflictError("A user with this email already exists");

    const roles = await rolesRepository.findManyByIds(input.roleIds);
    if (roles.length !== input.roleIds.length) {
      throw new ValidationError("One or more role IDs are invalid");
    }

    // If no temp password supplied, generate a strong random one — the
    // admin communicates it out-of-band (in person / secure channel), never
    // returned in a way that ends up logged.
    const temporaryPassword = input.temporaryPassword ?? randomBytes(9).toString("base64url") + "Aa1!";
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

    // Only returned once, at creation time, so it can be handed to the new
    // user directly — never stored or logged in plaintext anywhere.
    return { user, temporaryPassword: input.temporaryPassword ? undefined : temporaryPassword };
  },

  async getById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError("User not found");
    return user;
  },

  async update(id: string, input: UpdateUserInput, actorUserId: string) {
    await usersService.getById(id);
    const user = await usersRepository.update(id, input);
    await recordAudit({ actorUserId, action: "user.updated", entityType: "user", entityId: id, after: input });
    return user;
  },

  async setStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED", actorUserId: string) {
    if (id === actorUserId && status !== "ACTIVE") {
      throw new ValidationError("You cannot deactivate your own account");
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
    await usersService.getById(id);
    const roles = await rolesRepository.findManyByIds(roleIds);
    if (roles.length !== roleIds.length) throw new ValidationError("One or more role IDs are invalid");

    await usersRepository.replaceRoles(id, roleIds);
    await recordAudit({ actorUserId, action: "user.roles_changed", entityType: "user", entityId: id, after: { roleIds } });
    return usersService.getById(id);
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
};
