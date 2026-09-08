import { Router } from "express";
import { hearingsController } from "./hearings.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";

export const hearingsRouter = Router();
hearingsRouter.use(authenticate);

const READ_PERMISSIONS = ["case:view_all", "case:view_assigned", "case:view_own", "hearing:manage"];

hearingsRouter.get("/", requirePermission(...READ_PERMISSIONS), hearingsController.list);
hearingsRouter.post("/", requirePermission("hearing:manage"), hearingsController.schedule);
hearingsRouter.get("/:id", requirePermission(...READ_PERMISSIONS), hearingsController.get);
hearingsRouter.patch("/:id/reschedule", requirePermission("hearing:manage"), hearingsController.reschedule);
hearingsRouter.patch("/:id/status", requirePermission("hearing:manage"), hearingsController.updateStatus);
hearingsRouter.post("/:id/participants", requirePermission("hearing:manage"), hearingsController.addParticipant);
