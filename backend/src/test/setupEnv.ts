// Loaded via vitest's `setupFiles` before any test file imports anything
// that touches config/env.ts. Uses obviously-fake values — never real
// secrets — since env.ts refuses to boot without well-formed ones.
process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "mysql://otcms_test:test@localhost:3306/otcms_test";
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? "test-only-access-secret-do-not-use-in-prod-32chars";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "test-only-refresh-secret-do-not-use-in-prod-32chars";
