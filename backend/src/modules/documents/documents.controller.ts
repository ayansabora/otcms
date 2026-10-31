import type { Request, Response } from "express";
import { documentsService } from "./documents.service.js";
import { uploadDocumentMetaSchema } from "./documents.validators.js";
import { UnauthorizedError, ValidationError } from "../../utils/appError.js";

function caller(req: Request) {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.sub, roles: req.user.roles, permissions: req.user.permissions };
}

function requireParamId(req: Request): string {
  const id = req.params["id"];
  if (!id || typeof id !== "string") throw new ValidationError("id is required");
  return id;
}

export const documentsController = {
  async upload(req: Request, res: Response) {
    // file is attached by multer middleware before this handler runs
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) throw new ValidationError("No file uploaded");
    const meta = uploadDocumentMetaSchema.parse(req.body);
    const doc = await documentsService.upload(
      {
        originalname: file.originalname,
        mimetype:     file.mimetype,
        size:         file.size,
        buffer:       file.buffer,
      },
      {
        ...(meta.caseId     !== undefined ? { caseId:     meta.caseId }     : {}),
        ...(meta.decisionId !== undefined ? { decisionId: meta.decisionId } : {}),
        ...(meta.category   !== undefined ? { category:   meta.category }   : {}),
      },
      caller(req),
    );
    res.status(201).json({ document: doc });
  },

  async download(req: Request, res: Response) {
    const id = requireParamId(req);
    const { doc, data } = await documentsService.getForDownload(id, caller(req));
    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.filename)}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).send(data);
  },

  async listByCase(req: Request, res: Response) {
    const caseId = req.query["caseId"];
    if (!caseId || typeof caseId !== "string") {
      throw new ValidationError("caseId query parameter is required");
    }
    const documents = await documentsService.listByCase(caseId, caller(req));
    res.status(200).json({ documents });
  },

  async archive(req: Request, res: Response) {
    const id = requireParamId(req);
    const doc = await documentsService.archive(id, caller(req));
    res.status(200).json({ document: doc });
  },
};
