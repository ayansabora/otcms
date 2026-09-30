import { test, expect } from "@playwright/test";

/**
 * Covers the first step of the blueprint §18 critical path: admin login.
 * Requires the seeded demo admin account (see backend/src/database/seed) —
 * do not point this at a real production database.
 */
test.describe("Login and case list", () => {
  test("admin can log in and see the cases dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("admin@otcms.local");
    await page.getByLabel("Password").fill(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe12345!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("shows a validation error for wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@otcms.local");
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("logged-in admin can navigate to the cases list", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@otcms.local");
    await page.getByLabel("Password").fill(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe12345!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app$/);

    await page.getByRole("link", { name: "Cases" }).click();
    await expect(page).toHaveURL(/\/app\/cases$/);
    await expect(page.getByRole("heading", { name: "Cases" })).toBeVisible();
  });

  test("an unauthenticated visitor is redirected to login", async ({ page }) => {
    await page.goto("/app/cases");
    await expect(page).toHaveURL(/\/login$/);
  });
});
