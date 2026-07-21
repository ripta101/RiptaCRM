import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  addProfileMember,
  createThrowawayProfile,
  deleteProfile,
  removeProfileMember,
} from "../fixtures/accessManagementApi";

// The seeded frontline "test" user's auth-api id (matches every other spec's convention,
// e.g. queue-routing.spec.ts's addQueueMember(queue.id, "user-1")).
const TEST_USER_ID = "user-1";

async function loginAndReachProfilePicker(page: Page) {
  // Mirrors fixtures/auth.ts's login() preamble — safe to call more than once per test run.
  await page.evaluate(() => window.sessionStorage.clear()).catch(() => undefined);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username").fill("test");
  await page.getByLabel("Password").fill("Passw0rd154@");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForSelector('text="Choose a profile to continue"', { timeout: 10_000 });
}

async function openProfileDropdown(page: Page) {
  await page.getByLabel("Profile").click();
}

async function pickProfile(page: Page, profileName: string) {
  await page.getByRole("option", { name: profileName }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/$/, { timeout: 10_000 });
}

test.describe("Login profile selection", () => {
  const profileName = `E2E Admin Profile ${randomUUID()}`;
  let profileId: string;

  test.beforeAll(async () => {
    const created = await createThrowawayProfile(profileName, { dashboardType: "admin", canStartInteractions: false });
    profileId = created.id;
    await addProfileMember(profileId, TEST_USER_ID);
  });

  test.afterAll(async () => {
    await removeProfileMember(profileId, TEST_USER_ID);
    await deleteProfile(profileId);
  });

  test("a user with two profiles sees a picker listing both, and choosing one determines the dashboard", async ({
    page,
  }) => {
    await loginAndReachProfilePicker(page);
    await openProfileDropdown(page);
    await expect(page.getByRole("option", { name: "Frontline User" })).toBeVisible();
    await expect(page.getByRole("option", { name: profileName })).toBeVisible();

    await pickProfile(page, profileName);

    // The admin-style dashboard has no "New Interaction" button and no Worklist tab —
    // both are frontline-only, and this throwaway profile has canStartInteractions: false.
    await expect(page.getByRole("button", { name: "New Interaction" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Worklist" })).toHaveCount(0);
  });

  test("picking the Frontline User profile instead lands on the frontline dashboard", async ({ page }) => {
    await loginAndReachProfilePicker(page);
    await openProfileDropdown(page);
    await pickProfile(page, "Frontline User");

    await expect(page.getByRole("tab", { name: "Worklist" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New Interaction" })).toBeVisible();
  });
});
