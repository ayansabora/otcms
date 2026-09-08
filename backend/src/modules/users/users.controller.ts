import type { Request, Response } from "express";
import { usersService, rolesService } from "./users.service.js";
import {
  createUserSchema,
  updateUserSchema,
  assignRolesSchema,
  setUserStatusSchema,
  listUsersQuerySchema,
} from "./users.validators.js";
import { UnauthorizedError, ValidationError } from "../../utils/appError.js";

function actorId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.sub;
}

export const usersController = {
  async create(req: Request, res: Response) {
    const input = createUserSchema.parse(req.body);
    const result = await usersService.create(input, actorId(req));
    res.status(201).json(result);
  },

  async get(req: Request, res: Response) {
    if (!req.params.id) throw new ValidationError("id is required");
    const user = await usersService.getById(req.params.id);
    res.status(200).json({ user });
  },

  async update(req: Request, res: Response) {
    if (!req.params.id) throw new ValidationError("id is required");
    const input = updateUserSchema.parse(req.body);
    const user = await usersService.update(req.params.id, input, actorId(req));
    res.status(200).json({ user });
  },

  async setStatus(req: Request, res: Response) {
    if (!req.params.id) throw new ValidationError("id is required");
    const input = setUserStatusSchema.parse(req.body);
    const user = await usersService.setStatus(req.params.id, input.status, actorId(req));
    res.status(200).json({ user });
  },

  async assignRoles(req: Request, res: Response) {
    if (!req.params.id) throw new ValidationError("id is required");
    const input = assignRolesSchema.parse(req.body);
    const user = await usersService.assignRoles(req.params.id, input.roleIds, actorId(req));
    res.status(200).json({ user });
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
};
