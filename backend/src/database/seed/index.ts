import { prisma } from "../prismaClient.js";
import { hashPassword } from "../../utils/password.js";
import { logger } from "../../config/logger.js";
import { seedRolesAndPermissions } from "./rbacSeedData.js";

async function main() {
  logger.info("Seeding baseline permissions and roles...");
  await seedRolesAndPermissions();

  // ── DEMO ACCOUNT — development/testing only ──────────────────────────
  // Clearly marked, uses an env-var password (never a real credential in
  // the repo), and MUST be disabled/removed before production deployment.
  if (process.env.NODE_ENV !== "production") {
    const demoPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe12345!";
    const passwordHash = await hashPassword(demoPassword);

    const adminUser = await prisma.user.upsert({
      where: { email: "admin@otcms.local" },
      update: {},
      create: {
        email: "admin@otcms.local",
        passwordHash,
        fullName: "OTCMS Demo Administrator",
        status: "ACTIVE",
      },
    });

    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    });

    logger.warn(
      { email: "admin@otcms.local" },
      "DEMO admin account seeded — development only. Set SEED_ADMIN_PASSWORD, and never seed demo accounts in production.",
    );
  }

  logger.info("Seed complete.");
}

main()
  .catch((err) => {
    logger.error({ err }, "Seed failed");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
