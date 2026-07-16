import { expect, test } from "@playwright/test";
import { loginAsAdmin, openCaseManagement } from "../fixtures/auth";

// Read-only against the seeded baseline — no fixtures created, nothing to clean up.
test.describe("Case Type Designer", () => {
  test("shows both seeded case types with their published version chips", async ({ page }) => {
    await loginAsAdmin(page);
    await openCaseManagement(page);

    const complaintRow = page.locator("tr", { hasText: "Complaint" });
    await expect(complaintRow).toBeVisible();
    await expect(complaintRow.getByText(/Published v\d+/)).toBeVisible();

    const serviceRequestRow = page.locator("tr", { hasText: "Service Request" });
    await expect(serviceRequestRow).toBeVisible();
    await expect(serviceRequestRow.getByText(/Published v\d+/)).toBeVisible();
  });

  test("opening a case type shows its fields, stages, and actions", async ({ page }) => {
    await loginAsAdmin(page);
    await openCaseManagement(page);

    await page.getByText("Complaint", { exact: true }).click();
    await expect(page.getByRole("button", { name: "Back to Case Types" })).toBeVisible();

    await page.getByRole("tab", { name: "Fields" }).click();
    await expect(page.getByRole("cell", { name: "Description", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Channel", exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Stages & SLA" }).click();
    await expect(page.getByRole("cell", { name: "New", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Investigating", exact: true })).toBeVisible();
    await expect(page.locator(".react-flow__node")).toHaveCount(4);

    await page.getByRole("tab", { name: "Actions" }).click();
    await expect(page.getByText("Before Breach")).toBeVisible();
  });
});
