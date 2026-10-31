import { Router, type Request, type Response, type NextFunction } from "express";
import { documentsController } from "./documents.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { uploadMiddleware } from "./upload.middleware.js";

export const documentsRouter = Router();
documentsRouter.use(authenticate);

// Wrap multer middleware so TypeScript sees a plain (req, res, next) => void
// handler rather than multer's subtly different callback signature.
function runUpload(req: Request, res: Response, next: NextFunction): void {
  uploadMiddleware(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}

documentsRouter.get(    "/",    requirePermission("document:read"),   documentsController.listByCase);
documentsRouter.post(   "/",    requirePermission("document:upload"),  runUpload, documentsController.upload);
// GET /:id streams the file through this authorized endpoint — never a
// static/public path (blueprint §14).
documentsRouter.get(    "/:id", requirePermission("document:read"),   documentsController.download);
documentsRouter.delete( "/:id", requirePermission("document:upload"), documentsController.archive);
