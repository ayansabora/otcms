import { seedRolesAndPermissions } from "../database/seed/rbacSeedData.js";

/**
 * Thin re-export so integration tests share the EXACT SAME role/permission
 * matrix as database/seed/index.ts (both ultimately call
 * seedRolesAndPermissions from rbacSeedData.ts) — no risk of the two
 * drifting apart, unlike an earlier draft of this file that duplicated the
 * list inline.
 */
export async function seedTestBaseline(): Promise<void> {
  await seedRolesAndPermissions();
}
