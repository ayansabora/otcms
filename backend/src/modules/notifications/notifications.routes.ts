import { Router } from "express";
import { notificationsController } from "./notifications.controller.js";
import { authenticate } from "../../middleware/authenticate.js";

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

// No extra permission check beyond authentication — every notification
// row is already scoped to `userId` server-side (see notifications.service),
// so a user can only ever see/modify their own.
notificationsRouter.get("/", notificationsController.list);
notificationsRouter.patch("/:id/read", notificationsController.markRead);
notificationsRouter.patch("/read-all", notificationsController.markAllRead);
