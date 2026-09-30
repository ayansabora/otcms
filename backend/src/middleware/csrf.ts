import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../utils/appError.js";

/**
 * `/auth/refresh` and `/auth/logout` are the only two routes authenticated
 * via cookie rather than a bearer header (see auth.controller.ts), so
 * they're the only routes a cross-site form/fetch could implicitly ride
 * along on. The refresh cookie is already SameSite=Strict, which blocks
 * this in all modern browsers on its own — this header check is
 * defense-in-depth per blueprint §16, not the primary control.
 *
 * Requiring a custom header works because simple cross-site form
 * submissions cannot set custom headers, while genuine same-origin
 * fetch/XHR calls from our own frontend can (see api/client.ts).
 */
export function requireCsrfHeader(req: Request, _res: Response, next: NextFunction): void {
  if (req.header("x-otcms-csrf") !== "1") {
    throw new ForbiddenError("Missing CSRF protection header");
  }
  next();
}
