import { Router } from "express";
import { reportsController } from "./reports.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";

export const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.use(requirePermission("report:generate"));

reportsRouter.get("/cases-by-status", reportsController.casesByStatus);
reportsRouter.get("/cases-by-type", reportsController.casesByType);
reportsRouter.get("/pending-cases", reportsController.pendingCases);
reportsRouter.get("/hearing-schedule", reportsController.hearingSchedule);
reportsRouter.get("/decisions-summary", reportsController.decisionsSummary);
reportsRouter.get("/document-statistics", reportsController.documentStatistics);
