import { prisma } from "../database/prismaClient.js";
import { env } from "../config/env.js";

/**
 * Truncates every application table, preserving schema. Used between
 * integration tests for a clean slate. NEVER call this against anything
 * but a dedicated test database — it is destructive and unconditional.
 *
 * FK checks are disabled for the duration so table order doesn't matter.
 */
export async function resetDatabase(): Promise<void> {
  // Cheap safety guard against accidentally truncating a real database —
  // not foolproof, but catches the common mistake of forgetting to point
  // DATABASE_URL at a dedicated test schema before running this suite.
  if (env.NODE_ENV !== "test" || !env.DATABASE_URL.includes("test")) {
    throw new Error(
      "resetDatabase() refused to run: NODE_ENV must be 'test' and DATABASE_URL must reference a test database.",
    );
  }

  const tables: { TABLE_NAME: string }[] = await prisma.$queryRaw`
    SELECT TABLE_NAME FROM information_schema.tables
    WHERE table_schema = DATABASE() AND TABLE_NAME NOT LIKE '_prisma%'
  `;

  // Roles/permissions are reference data seeded once per test run (see
  // seedTestBaseline.ts), not per-test transactional data — preserve them
  // so every test doesn't have to re-seed RBAC from scratch.
  const preserve = new Set(["roles", "permissions", "role_permissions"]);

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  for (const { TABLE_NAME } of tables) {
    if (preserve.has(TABLE_NAME)) continue;
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${TABLE_NAME}\``);
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}
