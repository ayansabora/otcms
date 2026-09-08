import type { Request, Response } from "express";
import { casesService } from "./cases.service.js";
import {
  createCaseSchema,
  transitionCaseSchema,
  assignPanelSchema,
  addWitnessSchema,
  listCasesQuerySchema,
} from "./cases.validators.js";
import { UnauthorizedError, ValidationError } from "../../utils/appError.js";

function callerContext(req: Request) {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.sub, roles: req.user.roles, permissions: req.user.permissions };
}

function requireId(req: Request): string {
  if (!req.params.id) throw new ValidationError("id is required");
  return req.params.id;
}

export const casesController = {
  async create(req: Request, res: Response) {
    const input = createCaseSchema.parse(req.body);
    const createdCase = await casesService.create(input, callerContext(req));
    res.status(201).json({ case: createdCase });
  },

  async get(req: Request, res: Response) {
    const found = await casesService.getByIdForCaller(requireId(req), callerContext(req));
    res.status(200).json({ case: found });
  },

  async transition(req: Request, res: Response) {
    const input = transitionCaseSchema.parse(req.body);
    const updated = await casesService.transition(requireId(req), input, callerContext(req));
    res.status(200).json({ case: updated });
  },

  async assignPanel(req: Request, res: Response) {
    const input = assignPanelSchema.parse(req.body);
    const updated = await casesService.assignPanel(requireId(req), input, callerContext(req));
    res.status(200).json({ case: updated });
  },

  async addWitness(req: Request, res: Response) {
    const input = addWitnessSchema.parse(req.body);
    const link = await casesService.addWitness(requireId(req), input, callerContext(req));
    res.status(201).json({ caseWitness: link });
  },

  async history(req: Request, res: Response) {
    const history = await casesService.getHistory(requireId(req));
    res.status(200).json({ history });
  },

  async list(req: Request, res: Response) {
    const query = listCasesQuerySchema.parse(req.query);
    const result = await casesService.list(query, callerContext(req));
    res.status(200).json(result);
  },
};
