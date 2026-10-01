import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { generalRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { casesRouter } from "./modules/cases/cases.routes.js";
import { communityMembersRouter } from "./modules/community-members/community-members.routes.js";
import { hearingsRouter } from "./modules/hearings/hearings.routes.js";
import { decisionsRouter } from "./modules/decisions/decisions.routes.js";
import { documentsRouter } from "./modules/documents/documents.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { usersRouter, rolesRouter } from "./modules/users/users.routes.js";

export function createApp(): Express {
  const app = express();

  // Trust the reverse proxy (Nginx) for correct client IPs / rate limiting.
  app.set("trust proxy", 1);

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: (req as { requestId?: string }).requestId }),
    }),
  );

  app.use(
    helmet({
      ...(env.NODE_ENV === "production" ? {} : { contentSecurityPolicy: false }),
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(generalRateLimiter);

  // ── Unauthenticated ───────────────────────────────────────────────────
  // Health checks are unauthenticated by design (deployment infra needs them).
  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", authRouter);

  // ── Authenticated / RBAC-protected ────────────────────────────────────
  app.use("/api/v1/cases", casesRouter);
  app.use("/api/v1/community-members", communityMembersRouter);
  app.use("/api/v1/hearings", hearingsRouter);
  app.use("/api/v1/decisions", decisionsRouter);
  app.use("/api/v1/documents", documentsRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/audit-logs", auditRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/roles", rolesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
