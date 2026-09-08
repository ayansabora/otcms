import type { Request, Response } from "express";
import { communityMembersService } from "./community-members.service.js";
import { registerMemberSchema, verifyMemberSchema, listMembersQuerySchema } from "./community-members.validators.js";
import { UnauthorizedError, ValidationError } from "../../utils/appError.js";

function actorId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.sub;
}

export const communityMembersController = {
  async register(req: Request, res: Response) {
    const input = registerMemberSchema.parse(req.body);
    // Self-service (unauthenticated) registration is an open question — see
    // docs/architecture.md §27 Q7. Until confirmed, this endpoint requires
    // an authenticated Record Officer/Admin to register a member on someone's
    // behalf (route-level requirePermission("member:register")).
    const member = await communityMembersService.register(input, actorId(req));
    res.status(201).json({ member });
  },

  async get(req: Request, res: Response) {
    if (!req.params.id) throw new ValidationError("id is required");
    const member = await communityMembersService.getById(req.params.id);
    res.status(200).json({ member });
  },

  async verify(req: Request, res: Response) {
    if (!req.params.id) throw new ValidationError("id is required");
    const input = verifyMemberSchema.parse(req.body);
    const member = await communityMembersService.setVerification(req.params.id, input, actorId(req));
    res.status(200).json({ member });
  },

  async list(req: Request, res: Response) {
    const query = listMembersQuerySchema.parse(req.query);
    const result = await communityMembersService.list(query);
    res.status(200).json(result);
  },
};
