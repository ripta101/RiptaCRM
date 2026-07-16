import { expect, test } from "@playwright/test";
import { loginAsFrontline } from "../fixtures/auth";

// Fully read-only against the seeded baseline: customer-api's seeded customer ACC-1001
// (Ripta Ramelan) matches case-management-api's seeded in-flight Complaint instance
// (customerAccountId: "ACC-1001"), whose assignedToUserId ("user-1") matches the frontline
// login's session id. No fixtures created, nothing to clean up.
test.describe("Cross-module Open Cases", () => {
  test("Customer profile's Open Cases panel shows the seeded in-flight case", async ({ page }) => {
    // Only frontline users can start customer interactions — admins get a config-focused
    // dashboard instead and have no "New Interaction" entry point.
    await loginAsFrontline(page);
    await page.getByText("New Interaction").click();
    await page.getByLabel("Customer / Account ID").fill("ACC-1001");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByText("Ripta Ramelan", { exact: true }).click();

    const openCases = page.locator("text=Open Cases").locator("xpath=..");
    await expect(openCases.getByText("Complaint")).toBeVisible();
    await expect(openCases.getByText("Investigating")).toBeVisible();
  });

  test("frontline Dashboard's Open Cases widget shows a real, non-zero count", async ({ page }) => {
    await loginAsFrontline(page);
    const widget = page.locator(".MuiCard-root", { hasText: "Open Cases" });
    // The widget renders "—" while its async fetch is in flight; wait for real digits
    // before reading, or a fast read races the fetch and reads the placeholder as NaN.
    await expect(widget.locator("h3")).toHaveText(/\d+/, { timeout: 10_000 });
    const count = Number((await widget.locator("h3").textContent())?.trim());
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
