import { Router } from "express";
import { prisma } from "../../database/prismaClient.js";

export const healthRouter = Router();

/**
 * Liveness check — process is up. Used by container orchestrators.
 */
healthRouter.get("/live", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * Readiness check — process is up AND can reach the database.
 * Used before routing traffic to this instance.
 */
healthRouter.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "unavailable", database: "unreachable" });
  }
});
