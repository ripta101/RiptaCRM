import { expect, test } from "@playwright/test";
import { loginAsFrontline } from "../fixtures/auth";

test.describe("Customer search", () => {
  test("the first search result is auto-selected, so Confirm is clickable without a row click", async ({
    page,
  }) => {
    await loginAsFrontline(page);
    await page.getByText("New Interaction").click();
    await page.getByLabel("First name").fill("Ripta");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    // No row click here — seeded data has two "Ripta"s (Ramelan, Sombono); the API sorts
    // by lastName asc, so Ramelan should already be selected and its detail loaded.
    // Scoped to role="button" (the ResultsList row) — the top bar's interaction tab also
    // gets a Mui-selected class once onCustomerIdentified renames it, but that's role="tab".
    await expect(page.getByRole("heading", { name: "Ripta Ramelan" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /^Ripta Ramelan/ })).toHaveClass(/Mui-selected/);

    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("heading", { name: "Ripta Ramelan" })).toBeVisible();
  });
});
