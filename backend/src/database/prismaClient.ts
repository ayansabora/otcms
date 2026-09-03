import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

// Reuse a single PrismaClient instance (and connection pool) across the app,
// and across hot-reloads in dev, to avoid exhausting MySQL connections.
declare global {
  // eslint-disable-next-line no-var
  var __otcmsPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__otcmsPrisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV === "development") {
  global.__otcmsPrisma = prisma;
}
