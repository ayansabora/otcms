import { Router } from "express";
import { decisionsController } from "./decisions.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";

export const decisionsRouter = Router();
decisionsRouter.use(authenticate);

const READ_PERMISSIONS = ["case:view_all", "case:view_assigned", "case:view_own", "decision:record", "decision:approve"];

decisionsRouter.get("/", requirePermission(...READ_PERMISSIONS), decisionsController.listByCase);
decisionsRouter.post("/", requirePermission("decision:record"), decisionsController.record);
decisionsRouter.get("/:id", requirePermission(...READ_PERMISSIONS), decisionsController.get);
decisionsRouter.post("/:id/approve", requirePermission("decision:approve"), decisionsController.approve);
