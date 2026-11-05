import { Router } from "express";
import { summonsController } from "./summons.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";

export const summonsRouter = Router();
summonsRouter.use(authenticate);

summonsRouter.get(   "/",        requirePermission("summons:read", "summons:manage"), summonsController.list);
summonsRouter.post(  "/",        requirePermission("summons:manage"),                 summonsController.issue);
summonsRouter.patch( "/:id/serve", requirePermission("summons:manage"),               summonsController.recordService);
