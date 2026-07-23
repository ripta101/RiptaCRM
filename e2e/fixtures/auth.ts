import type { Page } from "@playwright/test";

async function login(page: Page, username: string, password: string) {
  // LoginPage redirects straight back to "/" if already authenticated, so a still-valid
  // session from an earlier login() call in the same test would make the Username field
  // never appear. Clearing storage first makes login() safe to call more than once per
  // test (e.g. specs that switch between admin and frontline to check role-scoped UI).
  await page.evaluate(() => window.sessionStorage.clear()).catch(() => undefined);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/$/, { timeout: 10_000 });
}

export const loginAsAdmin = (page: Page) => login(page, "admin", "Passw0rd154@");
export const loginAsFrontline = (page: Page) => login(page, "test", "Passw0rd154@");
export const loginAsSupervisor = (page: Page) => login(page, "supervisor1", "Passw0rd154@");

export async function openSupervisorDashboard(page: Page) {
  await page.getByRole("button", { name: "open menu" }).click();
  await page.getByText("Supervisor Dashboard", { exact: true }).click();
  await page.waitForSelector('text="Active Interactions"', { timeout: 15_000 });
}

export async function openCaseManagement(page: Page) {
  await page.getByRole("button", { name: "open menu" }).click();
  await page.getByText("Case Management", { exact: true }).click();
  await page.waitForSelector('text="Case Types"', { timeout: 15_000 });
}

export async function openQueue(page: Page, queueName: string) {
  await openCaseManagement(page);
  await page.getByRole("tab", { name: "Queues" }).click();
  await page.getByText(queueName, { exact: true }).click();
  await page.waitForSelector('text="Unassigned Cases in This Queue"', { timeout: 10_000 });
}

export async function openMessageBroadcast(page: Page) {
  await page.getByRole("button", { name: "open menu" }).click();
  await page.getByText("Broadcasts", { exact: true }).click();
  await page.waitForSelector('text="New Broadcast"', { timeout: 15_000 });
}

export async function openAccessManagement(page: Page) {
  await page.getByRole("button", { name: "open menu" }).click();
  await page.getByText("Access Management", { exact: true }).click();
  await page.waitForSelector('text="New Profile"', { timeout: 15_000 });
}

export async function openProfile(page: Page, profileName: string) {
  await openAccessManagement(page);
  // Not exact text — the protected profile's row appends a "Protected" chip to the same cell.
  await page.locator("tr", { hasText: profileName }).click();
  await page.waitForSelector('text="Menu Items"', { timeout: 10_000 });
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
