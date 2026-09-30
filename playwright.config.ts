import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against the REAL app — frontend dev server + backend API +
 * a real (test) database — not mocks. They are NOT started automatically
 * by this config (see webServer note below); run `npm run dev` in both
 * frontend/ and backend/ first, with the backend pointed at a seeded test
 * database, then `npm run test:e2e` from the repo root.
 *
 * This is intentionally NOT wired to auto-start servers, because the
 * backend needs a migrated + seeded MySQL database first, which this
 * config cannot provision. See docs/testing.md.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
