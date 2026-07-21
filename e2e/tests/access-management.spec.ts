import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { loginAsAdmin, openAccessManagement, openProfile } from "../fixtures/auth";
import { deleteProfile } from "../fixtures/accessManagementApi";

test.describe("Access Management", () => {
  test("admin creates a profile, edits its menu items, manages membership, and archives it once empty", async ({
    page,
  }) => {
    const name = `E2E Profile ${randomUUID()}`;

    try {
      await loginAsAdmin(page);
      await openAccessManagement(page);
      await page.getByRole("button", { name: "New Profile" }).click();
      await page.getByLabel("Name").fill(name);
      await page.getByLabel("Dashboard").click();
      await page.getByRole("option", { name: "Admin" }).click();
      await page.getByRole("checkbox", { name: "Can start customer interactions" }).check();
      await page.getByRole("button", { name: "Create" }).click();

      await page.waitForSelector('text="Menu Items"', { timeout: 10_000 });

      // New profile starts with no menu items — grant IT Support and confirm it sticks.
      // Plain click + a separate assertion (not .check()) — the checkbox's underlying DOM
      // node gets replaced by the PATCH-triggered re-render, which .check()'s own same-node
      // state-change detection can race with even though the click itself lands correctly.
      const itSupportCheckbox = page.getByRole("checkbox", { name: "IT Support" });
      await expect(itSupportCheckbox).not.toBeChecked();
      await itSupportCheckbox.click();
      await expect(itSupportCheckbox).toBeChecked();

      // Add a member — Archive should then be blocked.
      await page.getByLabel("Add member").click();
      await page.getByRole("option", { name: "Test User (test)", exact: true }).click();
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.getByRole("row", { name: /Test User/ })).toBeVisible();

      const archiveButton = page.getByRole("button", { name: "Archive" });
      await expect(archiveButton).toBeDisabled();

      // Remove the member — Archive should then succeed.
      await page.getByRole("row", { name: /Test User/ }).getByRole("button").click();
      await expect(page.getByText("No members yet.")).toBeVisible();
      await expect(archiveButton).toBeEnabled();
      await archiveButton.click();
      await expect(page.getByText("Archived", { exact: true })).toBeVisible();
    } finally {
      // Resolve the throwaway profile's id via the admin list (created via the UI, not
      // the API fixture, so we look it up by name before cleaning up).
      const res = await fetch(`http://localhost:4314/api/profiles?includeArchived=true`);
      const { results } = (await res.json()) as { results: { id: string; name: string }[] };
      const found = results.find((p) => p.name === name);
      if (found) await deleteProfile(found.id);
    }
  });

  test("the protected Business Admin profile can't be archived, deleted, or stripped of Access Management", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await openProfile(page, "Business Admin");

    await expect(page.getByRole("button", { name: "Archive" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Delete" })).toBeDisabled();
    await expect(page.getByRole("checkbox", { name: "Access Management" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Access Management" })).toBeDisabled();
  });
});
