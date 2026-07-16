import { expect, test } from "@playwright/test";

test.describe("Login", () => {
  test("valid credentials for a frontline user sign in and reach the dashboard", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Username").fill("test");
    await page.getByLabel("Password").fill("Passw0rd154@");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/$/, { timeout: 10_000 });
  });

  test("valid credentials for an admin user sign in and reach the dashboard", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("Passw0rd154@");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/$/, { timeout: 10_000 });
  });

  test("an incorrect password is rejected with an inline error and no navigation", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Username").fill("test");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("alert")).toContainText(/invalid/i);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an unknown username is rejected with the same inline error", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Username").fill("no-such-user");
    await page.getByLabel("Password").fill("anything");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("alert")).toContainText(/invalid/i);
    await expect(page).toHaveURL(/\/login$/);
  });
});
