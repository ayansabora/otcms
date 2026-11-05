import type { Request, Response } from "express";
import { summonsService } from "./summons.service.js";
import { issueSummonsSchema, recordServiceSchema, listSummonsQuerySchema } from "./summons.validators.js";
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

export const summonsController = {
  async issue(req: Request, res: Response) {
    const input = issueSummonsSchema.parse(req.body);
    const summons = await summonsService.issue(input, actorId(req));
    res.status(201).json({ summons });
  },

  async recordService(req: Request, res: Response) {
    const input = recordServiceSchema.parse(req.body);
    const summons = await summonsService.recordService(requireParamId(req), input, actorId(req));
    res.status(200).json({ summons });
  },

  async list(req: Request, res: Response) {
    const query = listSummonsQuerySchema.parse(req.query);
    const result = await summonsService.list({
      page: query.page, pageSize: query.pageSize,
      ...(query.caseId ? { caseId: query.caseId } : {}),
    });
    res.status(200).json(result);
  },
};
