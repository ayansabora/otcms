import { Router } from "express";
import { communityMembersController } from "./community-members.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/authorize.js";

export const communityMembersRouter = Router();
communityMembersRouter.use(authenticate);

communityMembersRouter.get("/", requirePermission("member:view"), communityMembersController.list);
communityMembersRouter.post("/", requirePermission("member:register"), communityMembersController.register);
communityMembersRouter.get("/:id", requirePermission("member:view"), communityMembersController.get);
communityMembersRouter.patch("/:id/verification", requirePermission("member:verify"), communityMembersController.verify);
