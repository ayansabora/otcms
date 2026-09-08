import type { Request, Response } from "express";
import { documentsService } from "./documents.service.js";
import { uploadDocumentMetaSchema } from "./documents.validators.js";
import { UnauthorizedError, ValidationError } from "../../utils/appError.js";

function caller(req: Request) {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.sub, roles: req.user.roles, permissions: req.user.permissions };
}

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const documentsController = {
  async upload(req: MulterRequest, res: Response) {
    if (!req.file) throw new ValidationError("No file uploaded");
    const meta = uploadDocumentMetaSchema.parse(req.body);
    const doc = await documentsService.upload(
      { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size, buffer: req.file.buffer },
      meta,
      caller(req),
    );
    res.status(201).json({ document: doc });
  },

  async download(req: Request, res: Response) {
    if (!req.params.id) throw new ValidationError("id is required");
    const { doc, data } = await documentsService.getForDownload(req.params.id, caller(req));
    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.filename)}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).send(data);
  },

  async listByCase(req: Request, res: Response) {
    if (!req.query.caseId || typeof req.query.caseId !== "string") {
      throw new ValidationError("caseId query parameter is required");
    }
    const documents = await documentsService.listByCase(req.query.caseId, caller(req));
    res.status(200).json({ documents });
  },

  async archive(req: Request, res: Response) {
    if (!req.params.id) throw new ValidationError("id is required");
    const doc = await documentsService.archive(req.params.id, caller(req));
    res.status(200).json({ document: doc });
  },
};
