import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { TooManyRequestsError } from "../utils/appError.js";

const handler = () => {
  throw new TooManyRequestsError();
};

export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Stricter limiter for authentication endpoints to slow down brute-force attempts.
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});
