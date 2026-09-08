import type { Request, Response } from "express";
import { notificationsService } from "./notifications.service.js";
import { paginationSchema } from "../../utils/pagination.js";
import { UnauthorizedError, ValidationError } from "../../utils/appError.js";
import { z } from "zod";

const listQuerySchema = paginationSchema.extend({ unreadOnly: z.coerce.boolean().default(false) });

function userId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.sub;
}

export const notificationsController = {
  async list(req: Request, res: Response) {
    const query = listQuerySchema.parse(req.query);
    const result = await notificationsService.listForUser(
      userId(req),
      { page: query.page, pageSize: query.pageSize },
      query.unreadOnly,
    );
    res.status(200).json(result);
  },

  async markRead(req: Request, res: Response) {
    if (!req.params.id) throw new ValidationError("id is required");
    await notificationsService.markRead(req.params.id, userId(req));
    res.status(204).send();
  },

  async markAllRead(req: Request, res: Response) {
    await notificationsService.markAllRead(userId(req));
    res.status(204).send();
  },
};
