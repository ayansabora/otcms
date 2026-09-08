import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/appError.js";

/**
 * Permission-based authorization, layered on top of `authenticate`.
 * Checks the caller's JWT-embedded permission codes (e.g. "case:create").
 * This enforces the role/permission matrix from the architecture doc §6 —
 * authorization decisions are never made on the frontend; every route that
 * needs one of these guards must declare it explicitly.
 *
 * Usage: router.post("/cases", authenticate, requirePermission("case:create"), handler)
 */
export function requirePermission(...anyOf: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();

    const hasPermission = anyOf.some((p) => req.user!.permissions.includes(p));
    if (!hasPermission) {
      throw new ForbiddenError(`Requires one of: ${anyOf.join(", ")}`);
    }
    next();
  };
}

/**
 * Role-based guard for the rarer cases where a route should be gated by
 * role name directly rather than a granular permission (e.g. admin-only
 * screens). Prefer `requirePermission` for anything resource-shaped.
 */
export function requireRole(...anyOf: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();

    const hasRole = anyOf.some((r) => req.user!.roles.includes(r));
    if (!hasRole) {
      throw new ForbiddenError(`Requires role: ${anyOf.join(" or ")}`);
    }
    next();
  };
}
