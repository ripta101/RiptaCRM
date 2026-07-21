import { expect, test } from "@playwright/test";
import { loginAsFrontline } from "../fixtures/auth";
import { createIframeMenuItem, createMfeMenuItem, deleteMenuItem, setProfileNavItemIds } from "../fixtures/accessManagementApi";

// The seeded frontline profile every existing single-profile spec relies on staying
// single-profile — mutate only its navItemIds (not membership), and always restore them.
const FRONTLINE_PROFILE_ID = "profile-frontline-user";
const ACCESS_MANAGEMENT_BASE_URL = "http://localhost:4314";

async function getFrontlineNavItemIds(): Promise<string[]> {
  const res = await fetch(`${ACCESS_MANAGEMENT_BASE_URL}/api/profiles/${FRONTLINE_PROFILE_ID}`);
  const profile = (await res.json()) as { navItemIds: string[] };
  return profile.navItemIds;
}

test.describe("Custom menu items", () => {
  test("an IFRAME menu item granted to a profile appears in the nav and renders its content", async ({ page }) => {
    const label = `Health Check ${Date.now()}`;
    const originalNavItemIds = await getFrontlineNavItemIds();
    const menuItem = await createIframeMenuItem(label, "http://localhost:4310/health");

    try {
      await setProfileNavItemIds(FRONTLINE_PROFILE_ID, [...originalNavItemIds, menuItem.id]);

      await loginAsFrontline(page);
      await page.getByRole("button", { name: "open menu" }).click();
      await page.getByText(label, { exact: true }).click();
      await page.waitForURL(`**/custom/${menuItem.id}`);

      const frame = page.frameLocator("iframe");
      await expect(frame.locator("body")).toContainText('"status":"ok"');
    } finally {
      await setProfileNavItemIds(FRONTLINE_PROFILE_ID, originalNavItemIds);
      await deleteMenuItem(menuItem.id);
    }
  });

  test("an MFE menu item dynamically loads an already-running remote at runtime", async ({ page }) => {
    const label = `Case Management (dynamic) ${Date.now()}`;
    const originalNavItemIds = await getFrontlineNavItemIds();
    const menuItem = await createMfeMenuItem(
      label,
      "http://localhost:5175/remoteEntry.js",
      // Must be the remote's own declared federation name (apps/case-management/vite.config.ts's
      // federation({ name: "caseManagement" })), not an arbitrary local alias — the runtime looks
      // up the loaded container under this exact name.
      "caseManagement",
      "./CaseManagementModule",
    );

    try {
      await setProfileNavItemIds(FRONTLINE_PROFILE_ID, [...originalNavItemIds, menuItem.id]);

      await loginAsFrontline(page);
      await page.getByRole("button", { name: "open menu" }).click();
      await page.getByText(label, { exact: true }).click();
      await page.waitForURL(`**/custom/${menuItem.id}`);

      // Proves registerRemotes()/loadRemote() actually fetched and rendered the real
      // caseManagement remote at runtime — same content case-type-designer.spec.ts checks
      // for, but reached via the dynamic loading path instead of host's static remotes map.
      await expect(page.locator("tr", { hasText: "Complaint" })).toBeVisible({ timeout: 15_000 });
    } finally {
      await setProfileNavItemIds(FRONTLINE_PROFILE_ID, originalNavItemIds);
      await deleteMenuItem(menuItem.id);
    }
  });
});
