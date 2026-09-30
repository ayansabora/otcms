import { prisma } from "../database/prismaClient.js";
import { hashPassword } from "../utils/password.js";

let counter = 0;

/**
 * Creates a real user (with a real Argon2id hash) holding the given role,
 * and returns their credentials plus a ready-to-use signAccessToken-style
 * bearer token generator via a real login, so tests exercise the actual
 * auth flow rather than forging tokens directly.
 */
export async function createTestUser(roleName: string): Promise<{ id: string; email: string; password: string }> {
  counter += 1;
  const email = `test-user-${counter}-${Date.now()}@otcms.test`;
  const password = "TestPassword123!";
  const passwordHash = await hashPassword(password);

  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: `Test ${roleName}`,
      status: "ACTIVE",
      roles: { create: [{ roleId: role.id }] },
    },
  });

  return { id: user.id, email, password };
}
