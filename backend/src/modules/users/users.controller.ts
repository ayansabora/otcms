import type { Request, Response } from "express";
import { usersService, rolesService } from "./users.service.js";
import {
  createUserSchema,
  updateUserSchema,
  assignRolesSchema,
  setUserStatusSchema,
  listUsersQuerySchema,
  adminResetPasswordSchema,
  createRoleSchema,
  updateRoleSchema,
} from "./users.validators.js";
import { UnauthorizedError, ValidationError } from "../../utils/appError.js";

function actorId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.sub;
}

function requireId(req: Request, name = "id"): string {
  const value = req.params[name];
  if (!value || typeof value !== "string") throw new ValidationError(`${name} is required`);
  return value;
}

export const usersController = {
  async create(req: Request, res: Response) {
    const input = createUserSchema.parse(req.body);
    const result = await usersService.create(input, actorId(req));
    res.status(201).json(result);
  },

  async get(req: Request, res: Response) {
    const user = await usersService.getById(requireId(req));
    res.status(200).json({ user });
  },

  async update(req: Request, res: Response) {
    const input = updateUserSchema.parse(req.body);
    const user = await usersService.update(requireId(req), input, actorId(req));
    res.status(200).json({ user });
  },

  async setStatus(req: Request, res: Response) {
    const input = setUserStatusSchema.parse(req.body);
    const user = await usersService.setStatus(requireId(req), input.status, actorId(req));
    res.status(200).json({ user });
  },

  async assignRoles(req: Request, res: Response) {
    const input = assignRolesSchema.parse(req.body);
    const user = await usersService.assignRoles(requireId(req), input.roleIds, actorId(req));
    res.status(200).json({ user });
  },

  async adminResetPassword(req: Request, res: Response) {
    const input = adminResetPasswordSchema.parse(req.body);
    await usersService.adminResetPassword(requireId(req), input, actorId(req));
    res.status(204).send();
  },

  async list(req: Request, res: Response) {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await usersService.list(query);
    res.status(200).json(result);
  },

  async listRoles(_req: Request, res: Response) {
    const roles = await rolesService.listAll();
    res.status(200).json({ roles });
  },

  async createRole(req: Request, res: Response) {
    const input = createRoleSchema.parse(req.body);
    const role = await rolesService.create(input, actorId(req));
    res.status(201).json({ role });
  },

  async updateRole(req: Request, res: Response) {
    const input = updateRoleSchema.parse(req.body);
    const role = await rolesService.update(requireId(req, "roleId"), input, actorId(req));
    res.status(200).json({ role });
  },

  async deleteRole(req: Request, res: Response) {
    await rolesService.delete(requireId(req, "roleId"), actorId(req));
    res.status(204).send();
  },
};
