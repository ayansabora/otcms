import type { Request, Response } from "express";
import { decisionsService } from "./decisions.service.js";
import { recordDecisionSchema, approveDecisionSchema } from "./decisions.validators.js";
import { UnauthorizedError, ValidationError } from "../../utils/appError.js";

function caller(req: Request) {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.sub, permissions: req.user.permissions };
}

function requireId(req: Request): string {
  if (!req.params.id) throw new ValidationError("id is required");
  return req.params.id;
}

export const decisionsController = {
  async record(req: Request, res: Response) {
    const input = recordDecisionSchema.parse(req.body);
    const decision = await decisionsService.record(input, caller(req));
    res.status(201).json({ decision });
  },

  async get(req: Request, res: Response) {
    const decision = await decisionsService.getById(requireId(req));
    res.status(200).json({ decision });
  },

  async approve(req: Request, res: Response) {
    const input = approveDecisionSchema.parse(req.body);
    const decision = await decisionsService.approve(requireId(req), input, caller(req));
    res.status(200).json({ decision });
  },

  async listByCase(req: Request, res: Response) {
    if (!req.query.caseId || typeof req.query.caseId !== "string") {
      throw new ValidationError("caseId query parameter is required");
    }
    const decisions = await decisionsService.listByCase(req.query.caseId);
    res.status(200).json({ decisions });
  },
};
