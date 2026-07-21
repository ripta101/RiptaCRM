import { expect, test } from "@playwright/test";
import { loginAsFrontline } from "../fixtures/auth";
import { setProfileNavItemIds } from "../fixtures/accessManagementApi";

// The seeded frontline profile every existing single-profile spec relies on staying
// single-profile — mutate only its navItemIds (not membership), and always restore them.
const FRONTLINE_PROFILE_ID = "profile-frontline-user";
const ACCESS_MANAGEMENT_BASE_URL = "http://localhost:4314";
const CUSTOMER_API_BASE_URL = "http://localhost:4310";

async function getFrontlineNavItemIds(): Promise<string[]> {
  const res = await fetch(`${ACCESS_MANAGEMENT_BASE_URL}/api/profiles/${FRONTLINE_PROFILE_ID}`, {
    headers: { "X-Internal-Service-Key": "dev-only-insecure-service-key-change-me" },
  });
  const profile = (await res.json()) as { navItemIds: string[] };
  return profile.navItemIds;
}

test.describe("Customer interaction feature gating", () => {
  test("removing the Search Customer grant hides the search UI and the backend rejects an unauthenticated search", async ({
    page,
  }) => {
    const originalNavItemIds = await getFrontlineNavItemIds();

    try {
      await setProfileNavItemIds(
        FRONTLINE_PROFILE_ID,
        originalNavItemIds.filter((id) => id !== "customer-search"),
      );

      await loginAsFrontline(page);
      await page.getByText("New Interaction").click();
      await expect(page.getByText("You don't have access to Search Customer.")).toBeVisible();
      await expect(page.getByLabel("First name")).not.toBeVisible();

      const res = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/search?firstName=Ripta`);
      expect(res.status).toBe(401);
    } finally {
      await setProfileNavItemIds(FRONTLINE_PROFILE_ID, originalNavItemIds);
    }
  });

  test("removing the Create Customer grant hides the Create Customer button on a failed search", async ({
    page,
  }) => {
    const originalNavItemIds = await getFrontlineNavItemIds();

    try {
      await setProfileNavItemIds(
        FRONTLINE_PROFILE_ID,
        originalNavItemIds.filter((id) => id !== "customer-create"),
      );

      await loginAsFrontline(page);
      await page.getByText("New Interaction").click();
      await page.getByLabel("First name").fill("Nobody Matches This Search XYZ");
      await page.getByRole("button", { name: "Search", exact: true }).click();

      await expect(page.getByText(/No customers matched your search/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Create Customer" })).not.toBeVisible();

      const res = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "X", lastName: "Y", phone: "555", dateOfBirth: "2000-01-01" }),
      });
      expect(res.status).toBe(401);
    } finally {
      await setProfileNavItemIds(FRONTLINE_PROFILE_ID, originalNavItemIds);
    }
  });

  test("removing Customer Profile / Amend Customer / Lodge a Case grants hides all three menu entries once a customer is confirmed", async ({
    page,
  }) => {
    const originalNavItemIds = await getFrontlineNavItemIds();

    try {
      await setProfileNavItemIds(
        FRONTLINE_PROFILE_ID,
        originalNavItemIds.filter((id) => !["customer-profile", "customer-amend", "customer-lodge-case"].includes(id)),
      );

      await loginAsFrontline(page);
      await page.getByText("New Interaction").click();
      await page.getByLabel("First name").fill("Ripta");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Ripta Ramelan" })).toBeVisible({ timeout: 10_000 });
      await page.getByRole("button", { name: "Confirm" }).click();

      await expect(page.getByText("Customer Profile")).not.toBeVisible();
      await expect(page.getByText("Amend Customer")).not.toBeVisible();
      await expect(page.getByText("Lodge a Case")).not.toBeVisible();

      const res = await fetch(`${CUSTOMER_API_BASE_URL}/api/case-instances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseTypeId: "does-not-matter" }),
      });
      expect(res.status).toBe(401);
    } finally {
      await setProfileNavItemIds(FRONTLINE_PROFILE_ID, originalNavItemIds);
    }
  });
});
