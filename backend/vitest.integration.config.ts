import { defineConfig } from "vitest/config";

/**
 * Integration tests hit a REAL MySQL database through Prisma + Supertest
 * against the actual Express app (no mocking of the DB layer). They
 * require:
 *   1. DATABASE_URL pointing at a dedicated test database (never your dev
 *      or prod database — this suite truncates all tables between tests).
 *   2. Migrations applied: `npm run prisma:migrate:deploy`
 *   3. Baseline roles/permissions seeded: `npm run seed`
 *
 * Run with: npm run test:integration
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/integration/**/*.integration.test.ts"],
    setupFiles: ["./src/test/setupEnv.ts"],
    // Integration tests share one DB connection pool and must not run
    // concurrently against the same tables, or truncation in one test
    // file will wipe data another is mid-assertion on.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
