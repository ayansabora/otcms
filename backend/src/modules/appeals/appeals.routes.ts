import { Router } from "express";
import { appealsController } from "./appeals.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";

export const appealsRouter = Router();
appealsRouter.use(authenticate);

appealsRouter.get(   "/",                requirePermission("appeal:read", "appeal:manage"), appealsController.list);
appealsRouter.post(  "/",                requirePermission("appeal:manage"),                 appealsController.file);
appealsRouter.patch( "/:id/transfer",    requirePermission("appeal:manage"),                 appealsController.recordTransfer);
appealsRouter.patch( "/:id/outcome",     requirePermission("appeal:manage"),                 appealsController.recordOutcome);
