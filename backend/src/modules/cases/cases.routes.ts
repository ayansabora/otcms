import { Router } from "express";
import { casesController } from "./cases.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";

export const casesRouter = Router();
casesRouter.use(authenticate);

const VIEW_PERMISSIONS = ["case:view_all", "case:view_assigned", "case:view_own"];

casesRouter.get("/", requirePermission(...VIEW_PERMISSIONS), casesController.list);
casesRouter.post("/", requirePermission("case:create"), casesController.create);
casesRouter.get("/:id", requirePermission(...VIEW_PERMISSIONS), casesController.get);
casesRouter.get("/:id/history", requirePermission(...VIEW_PERMISSIONS), casesController.history);

// Fine-grained permission enforcement for the *specific* target status also
// happens inside cases.service.ts (see permissionsRequiredFor) — these
// route guards are a floor, not the full check.
casesRouter.post(
  "/:id/transition",
  requirePermission("case:transition", "case:assign", "hearing:manage", "decision:record", "decision:approve"),
  casesController.transition,
);
casesRouter.post("/:id/assign-panel", requirePermission("case:assign"), casesController.assignPanel);
casesRouter.post("/:id/witnesses", requirePermission("case:update", "case:create"), casesController.addWitness);
