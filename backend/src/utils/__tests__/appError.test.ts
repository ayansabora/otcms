import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InvalidStateTransitionError,
  TooManyRequestsError,
} from "../appError.js";

describe("AppError hierarchy", () => {
  it.each([
    [ValidationError, 400, "VALIDATION_ERROR"],
    [UnauthorizedError, 401, "UNAUTHORIZED"],
    [ForbiddenError, 403, "FORBIDDEN"],
    [NotFoundError, 404, "NOT_FOUND"],
    [ConflictError, 409, "CONFLICT"],
    [TooManyRequestsError, 429, "TOO_MANY_REQUESTS"],
  ] as const)("%s maps to status %i and code %s", (ErrorClass, status, code) => {
    const err = new ErrorClass();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(status);
    expect(err.code).toBe(code);
  });

  it("InvalidStateTransitionError includes the from/to states in its message", () => {
    const err = new InvalidStateTransitionError("CLOSED", "SUBMITTED");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("INVALID_STATE_TRANSITION");
    expect(err.message).toContain("CLOSED");
    expect(err.message).toContain("SUBMITTED");
  });

  it("carries custom messages and details through", () => {
    const err = new ValidationError("Email is required", { field: "email" });
    expect(err.message).toBe("Email is required");
    expect(err.details).toEqual({ field: "email" });
  });
});
