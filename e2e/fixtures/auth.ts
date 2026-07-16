import type { Page } from "@playwright/test";

async function login(page: Page, username: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/$/, { timeout: 10_000 });
}

export const loginAsAdmin = (page: Page) => login(page, "admin", "admin");
export const loginAsFrontline = (page: Page) => login(page, "test", "test");

export async function openCaseManagement(page: Page) {
  await page.getByRole("button", { name: "open menu" }).click();
  await page.getByText("Case Management", { exact: true }).click();
  await page.waitForSelector('text="Case Types"', { timeout: 15_000 });
}

/**
 * Case type detail is client-side component state only (no deep-linking by URL), so a
 * `page.reload()` drops you back on the case type list, not the case type you were viewing.
 * Use this instead of reload to get a fresh fetch of the same case type's data.
 */
export async function reopenCaseType(page: Page, caseTypeName: string) {
  await openCaseManagement(page);
  await page.getByText(caseTypeName, { exact: true }).click();
  await page.waitForSelector('text="Back to Case Types"', { timeout: 10_000 });
}
