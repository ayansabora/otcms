import type { Request, Response } from "express";
import { hearingsService } from "./hearings.service.js";
import {
  scheduleHearingSchema,
  rescheduleHearingSchema,
  updateHearingStatusSchema,
  addHearingParticipantSchema,
  listHearingsQuerySchema,
} from "./hearings.validators.js";
import { UnauthorizedError, ValidationError } from "../../utils/appError.js";

function actorId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.sub;
}

function requireId(req: Request): string {
  if (!req.params.id) throw new ValidationError("id is required");
  return req.params.id;
}

export const hearingsController = {
  async schedule(req: Request, res: Response) {
    const input = scheduleHearingSchema.parse(req.body);
    const hearing = await hearingsService.schedule(input, actorId(req));
    res.status(201).json({ hearing });
  },

  async reschedule(req: Request, res: Response) {
    const input = rescheduleHearingSchema.parse(req.body);
    const hearing = await hearingsService.reschedule(requireId(req), input, actorId(req));
    res.status(200).json({ hearing });
  },

  async get(req: Request, res: Response) {
    const hearing = await hearingsService.getById(requireId(req));
    res.status(200).json({ hearing });
  },

  async updateStatus(req: Request, res: Response) {
    const input = updateHearingStatusSchema.parse(req.body);
    const hearing = await hearingsService.updateStatus(requireId(req), input, actorId(req));
    res.status(200).json({ hearing });
  },

  async addParticipant(req: Request, res: Response) {
    const input = addHearingParticipantSchema.parse(req.body);
    const participant = await hearingsService.addParticipant(requireId(req), input, actorId(req));
    res.status(201).json({ participant });
  },

  async list(req: Request, res: Response) {
    if (!req.user) throw new UnauthorizedError();
    const query = listHearingsQuerySchema.parse(req.query);
    const result = await hearingsService.list(query, { userId: req.user.sub, permissions: req.user.permissions });
    res.status(200).json(result);
  },
};
