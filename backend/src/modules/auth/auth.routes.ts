import { Router } from "express";
import { authController } from "./auth.controller.js";
import { authRateLimiter } from "../../middleware/rateLimiter.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireCsrfHeader } from "../../middleware/csrf.js";

export const authRouter = Router();

// Stricter rate limiting on all auth endpoints — these are the prime
// brute-force / credential-stuffing / enumeration targets.
authRouter.use(authRateLimiter);

authRouter.post("/login", authController.login);
authRouter.post("/refresh", requireCsrfHeader, authController.refresh);
authRouter.post("/logout", requireCsrfHeader, authController.logout);
authRouter.post("/password-reset/request", authController.requestPasswordReset);
authRouter.post("/password-reset/confirm", authController.resetPassword);

// Requires an active session.
authRouter.get("/me", authenticate, authController.me);
authRouter.post("/change-password", authenticate, authController.changePassword);
