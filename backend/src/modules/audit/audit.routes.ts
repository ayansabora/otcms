import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../database/prismaClient.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { paginationSchema, toSkipTake, paginate } from "../../utils/pagination.js";

export const auditRouter = Router();
auditRouter.use(authenticate);

const listQuerySchema = paginationSchema.extend({
  entityType: z.string().max(64).optional(),
  entityId: z.string().uuid().optional(),
  actorUserId: z.string().uuid().optional(),
  action: z.string().max(128).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

// Audit records are protected from ordinary users per blueprint §11/§20 —
// only holders of audit:read (Administrators, per the seed role/permission
// matrix) may read this endpoint. There is deliberately no write/delete
// route here at all: the log is append-only, written exclusively via
// recordAudit() from within domain services.
auditRouter.get("/", requirePermission("audit:read"), async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const pagination = { page: query.page, pageSize: query.pageSize };
  const { skip, take } = toSkipTake(pagination);

  const where = {
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.count({ where }),
  ]);

  res.status(200).json(paginate(items, total, pagination));
});
