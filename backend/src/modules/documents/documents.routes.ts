import { Router } from "express";
import { documentsController } from "./documents.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";
import { uploadMiddleware } from "./upload.middleware.js";

export const documentsRouter = Router();
documentsRouter.use(authenticate);

documentsRouter.get("/", requirePermission("document:read"), documentsController.listByCase);
documentsRouter.post("/", requirePermission("document:upload"), uploadMiddleware, documentsController.upload);
// GET /:id streams the file through this authorized endpoint — never a
// static/public path (blueprint §14).
documentsRouter.get("/:id", requirePermission("document:read"), documentsController.download);
documentsRouter.delete("/:id", requirePermission("document:upload"), documentsController.archive);
