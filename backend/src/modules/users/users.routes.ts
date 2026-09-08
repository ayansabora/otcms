import { Router } from "express";
import { usersController } from "./users.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get("/", requirePermission("user:manage"), usersController.list);
usersRouter.post("/", requirePermission("user:manage"), usersController.create);
usersRouter.get("/:id", requirePermission("user:manage"), usersController.get);
usersRouter.patch("/:id", requirePermission("user:manage"), usersController.update);
usersRouter.patch("/:id/status", requirePermission("user:manage"), usersController.setStatus);
usersRouter.patch("/:id/roles", requirePermission("role:manage"), usersController.assignRoles);

export const rolesRouter = Router();
rolesRouter.use(authenticate);
rolesRouter.get("/", requirePermission("user:manage", "role:manage"), usersController.listRoles);
