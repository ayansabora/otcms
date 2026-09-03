import { z } from "zod";
import "dotenv/config";

/**
 * Centralized, validated environment configuration.
 * The app refuses to start if a required variable is missing or malformed —
 * we never silently fall back to an insecure default for secrets.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  APP_URL: z.string().url().default("http://localhost:5173"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),

  FILE_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  FILE_STORAGE_PATH: z.string().default("./storage/documents"),
  FILE_MAX_SIZE_MB: z.coerce.number().positive().default(15),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().positive().default(10),

  LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().positive().default(15),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud — never boot with an invalid/missing security-relevant config.
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
