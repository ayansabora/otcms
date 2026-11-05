import type { Request, Response } from "express";
import { appealsService } from "./appeals.service.js";
import { fileAppealSchema, recordTransferSchema, recordOutcomeSchema, listAppealsQuerySchema } from "./appeals.validators.js";
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

export const appealsController = {
  async file(req: Request, res: Response) {
    const input = fileAppealSchema.parse(req.body);
    const appeal = await appealsService.file(input, actorId(req));
    res.status(201).json({ appeal });
  },

  async recordTransfer(req: Request, res: Response) {
    const input = recordTransferSchema.parse(req.body);
    const appeal = await appealsService.recordTransfer(requireParamId(req), input, actorId(req));
    res.status(200).json({ appeal });
  },

  async recordOutcome(req: Request, res: Response) {
    const input = recordOutcomeSchema.parse(req.body);
    const appeal = await appealsService.recordOutcome(requireParamId(req), input, actorId(req));
    res.status(200).json({ appeal });
  },

  async list(req: Request, res: Response) {
    const query = listAppealsQuerySchema.parse(req.query);
    const result = await appealsService.list({
      page: query.page, pageSize: query.pageSize,
      ...(query.caseId ? { caseId: query.caseId } : {}),
    });
    res.status(200).json(result);
  },
};
