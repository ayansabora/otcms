import { prisma } from "../prismaClient.js";
import { hashPassword } from "../../utils/password.js";
import { logger } from "../../config/logger.js";

/**
 * Permission codes. Kept as simple "resource:action" strings rather than a
 * separate enum table column, so new permissions can be added via migration
 * without an application redeploy touching TypeScript types.
 *
 * NOTE: this list encodes the DRAFT role/permission matrix from
 * docs/architecture.md §6. Confirm before treating as final.
 */
const PERMISSIONS = [
  { code: "user:manage", description: "Create, update, activate/deactivate users" },
  { code: "role:manage", description: "Manage roles and permissions" },
  { code: "audit:read", description: "View audit logs" },
  { code: "member:register", description: "Register a community member" },
  { code: "member:verify", description: "Verify a community member" },
  { code: "member:view", description: "View community member records" },
  { code: "case:create", description: "Register a new case" },
  { code: "case:view_all", description: "View all cases" },
  { code: "case:view_assigned", description: "View cases assigned to self" },
  { code: "case:view_own", description: "View own submitted cases" },
  { code: "case:update", description: "Update case details" },
  { code: "case:assign", description: "Assign/reassign a case to elders" },
  { code: "case:transition", description: "Move a case through workflow states" },
  { code: "hearing:manage", description: "Schedule and manage hearings" },
  { code: "decision:record", description: "Record a decision" },
  { code: "decision:approve", description: "Approve/finalize a decision (panel elder)" },
  { code: "document:upload", description: "Upload a document" },
  { code: "document:read", description: "Download/view an authorized document" },
  { code: "report:generate", description: "Generate reports" },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "user:manage",
    "role:manage",
    "audit:read",
    "member:register",
    "member:view",
    "case:view_all",
    "case:assign",
    "document:upload",
    "document:read",
    "report:generate",
  ],
  COURT_MANAGER: [
    // "Court Manager / Elder" combined role per current default (§27 Q4 open).
    "member:verify",
    "member:view",
    "case:view_assigned",
    "case:transition",
    "hearing:manage",
    "decision:record",
    "decision:approve",
    "document:upload",
    "document:read",
    "report:generate",
  ],
  RECORD_OFFICER: [
    "member:register",
    "member:view",
    "case:create",
    "case:view_all",
    "case:update",
    "case:transition",
    "case:assign",
    "hearing:manage",
    "document:upload",
    "document:read",
    "report:generate",
  ],
  COMMUNITY_MEMBER: ["case:view_own", "document:read"],
};

async function main() {
  logger.info("Seeding baseline permissions and roles...");

  await prisma.permission.createMany({
    data: PERMISSIONS.map((p) => ({ code: p.code, description: p.description })),
    skipDuplicates: true,
  });

  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permissionByCode = new Map(
    allPermissions.map((p: (typeof allPermissions)[number]) => [p.code, p.id]),
  );

  for (const [roleName, codes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    for (const code of codes) {
      const permissionId = permissionByCode.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

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
