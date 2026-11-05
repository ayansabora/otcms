import type { Request, Response } from "express";
import { consentService } from "./consent.service.js";
import { recordConsentSchema, withdrawConsentSchema } from "./consent.validators.js";
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

export const consentController = {
  async record(req: Request, res: Response) {
    const input = recordConsentSchema.parse(req.body);
    const consent = await consentService.record(input, actorId(req));
    res.status(201).json({ consent });
  },

  async withdraw(req: Request, res: Response) {
    const input = withdrawConsentSchema.parse(req.body);
    const consent = await consentService.withdraw(requireParamId(req), input, actorId(req));
    res.status(200).json({ consent });
  },

  async listByCase(req: Request, res: Response) {
    const caseId = req.query["caseId"];
    if (!caseId || typeof caseId !== "string") {
      throw new ValidationError("caseId query parameter is required");
    }
    const consents = await consentService.listByCase(caseId);
    res.status(200).json({ consents });
  },
};
