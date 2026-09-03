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
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
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

  // Health checks are unauthenticated by design (deployment infra needs them).
  app.use("/api/v1/health", healthRouter);

  // Domain routers (auth, users, cases, ...) are mounted here in later phases,
  // e.g. app.use("/api/v1/auth", authRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
