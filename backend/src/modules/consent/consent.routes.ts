import { Router } from "express";
import { consentController } from "./consent.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";

export const consentRouter = Router();
consentRouter.use(authenticate);

consentRouter.get(   "/",           requirePermission("consent:read", "consent:manage"), consentController.listByCase);
consentRouter.post(  "/",           requirePermission("consent:manage"),                  consentController.record);
consentRouter.patch( "/:id/withdraw", requirePermission("consent:manage"),                consentController.withdraw);
