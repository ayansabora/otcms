import type { Request, Response } from "express";
import { communityMembersService } from "./community-members.service.js";
import {
  registerMemberSchema,
  updateMemberSchema,
  verifyMemberSchema,
  listMembersQuerySchema,
} from "./community-members.validators.js";
import { UnauthorizedError, ValidationError } from "../../utils/appError.js";

function actorId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.sub;
}

function requireParamId(req: Request): string {
  const id = req.params["id"];
  if (!id || typeof id !== "string") throw new ValidationError("id is required");
  return id;
}

export const communityMembersController = {
  /** Returns the CommunityMember record linked to the authenticated user (if any). */
  async me(req: Request, res: Response) {
    const userId = actorId(req);
    const member = await communityMembersService.getByUserId(userId);
    res.status(200).json({ member });
  },

  /** Admin: link an existing CommunityMember record to a User account. */
  async linkUser(req: Request, res: Response) {
    const memberId = requireParamId(req);
    const userId   = req.body.userId;
    if (!userId || typeof userId !== "string") {
      throw new ValidationError("userId is required in request body");
    }
    const member = await communityMembersService.linkUserAccount(memberId, userId, actorId(req));
    res.status(200).json({ member });
  },

  async register(req: Request, res: Response) {
    const input = registerMemberSchema.parse(req.body);
    const member = await communityMembersService.register(input, actorId(req));
    res.status(201).json({ member });
  },

  async update(req: Request, res: Response) {
    const input = updateMemberSchema.parse(req.body);
    const member = await communityMembersService.update(requireParamId(req), input, actorId(req));
    res.status(200).json({ member });
  },

  async get(req: Request, res: Response) {
    const member = await communityMembersService.getById(requireParamId(req));
    res.status(200).json({ member });
  },

  async verify(req: Request, res: Response) {
    const input = verifyMemberSchema.parse(req.body);
    const member = await communityMembersService.setVerification(requireParamId(req), input, actorId(req));
    res.status(200).json({ member });
  },

  async list(req: Request, res: Response) {
    const query = listMembersQuerySchema.parse(req.query);
    const result = await communityMembersService.list(query);
    res.status(200).json(result);
  },
};
