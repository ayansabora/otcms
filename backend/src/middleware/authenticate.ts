import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { UnauthorizedError } from "../utils/appError.js";

/**
 * Verifies the short-lived access token sent as `Authorization: Bearer <token>`.
 * Deliberately NOT read from a cookie — keeping it out of automatically-sent
 * cookies means ordinary mutating requests aren't a CSRF target; only the
 * narrowly-scoped refresh-token cookie needs CSRF-aware handling.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or malformed Authorization header");
  }

  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }

  next();
}

/**
 * Like `authenticate`, but does not throw if no token is present — useful
 * for endpoints that behave differently for logged-in vs anonymous users
 * without requiring auth outright.
 */
export function authenticateOptional(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyAccessToken(header.slice("Bearer ".length));
    } catch {
      // ignore — treated as anonymous
    }
  }
  next();
}
