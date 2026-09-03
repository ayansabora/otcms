import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/appError.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

/**
 * Single centralized error handler. Must be registered last, after all routes.
 * - Known AppErrors: return their status/code/message as-is.
 * - ZodErrors that slip through: treated as 400 validation errors.
 * - Anything else (Prisma errors, unexpected exceptions): logged in full
 *   server-side, but the client only ever sees a generic 500 message —
 *   no stack traces, no raw DB error text, ever, in any environment.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId ?? "unknown";

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId }, "Application error");
    } else {
      logger.warn({ err: err.message, code: err.code, requestId }, "Handled request error");
    }

    const body: ErrorResponseBody = {
      error: { code: err.code, message: err.message, requestId },
    };
    if (err.details !== undefined) body.error.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    logger.warn({ issues: err.issues, requestId }, "Validation error");
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        requestId,
        details: err.flatten(),
      },
    });
    return;
  }

  // Unknown/unexpected error — log full detail server-side only.
  logger.error({ err, requestId }, "Unhandled error");

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "An unexpected error occurred. Please try again later."
          : (err as Error)?.message ?? "Unknown error",
      requestId,
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId,
    },
  });
}
