import { expect, test } from "@playwright/test";
import { loginAsAdmin, openCaseManagement } from "../fixtures/auth";
import { createCaseInstance, deleteCaseInstance } from "../fixtures/api";

const BASE_URL = "http://localhost:4311";
const SERVICE_KEY_HEADERS = { "X-Internal-Service-Key": "dev-only-insecure-service-key-change-me" };

async function findComplaintCaseTypeId(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/case-types`, { headers: SERVICE_KEY_HEADERS });
  const { results } = (await res.json()) as { results: { id: string; key: string }[] };
  return results.find((r) => r.key === "complaint")!.id;
}

test.describe("Stage transition graph enforcement", () => {
  let instanceId: string;

  test.beforeAll(async () => {
    const caseTypeId = await findComplaintCaseTypeId();
    const instance = await createCaseInstance(caseTypeId);
    instanceId = instance.id; // starts in "New" per the seeded Complaint's first stage
  });

  test.afterAll(async () => {
    await deleteCaseInstance(instanceId);
  });

  test("a non-adjacent transition is rejected at the API even if attempted directly", async () => {
    // Seeded Complaint only allows New -> Investigating -> Resolved -> Closed, strictly
    // sequential. "Resolved" is not a configured transition from "New".
    const res = await fetch(`${BASE_URL}/api/case-instances/${instanceId}`, { headers: SERVICE_KEY_HEADERS });
    const detail = await res.json();
    const resolvedStageId = await (async () => {
      const versionRes = await fetch(`${BASE_URL}/api/case-type-versions/${detail.caseTypeVersionId}`, {
        headers: SERVICE_KEY_HEADERS,
      });
      const version = await versionRes.json();
      return version.stages.find((s: { key: string }) => s.key === "resolved").id;
    })();

    const transitionRes = await fetch(`${BASE_URL}/api/case-instances/${instanceId}/transitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...SERVICE_KEY_HEADERS },
      body: JSON.stringify({ toStageId: resolvedStageId }),
    });
    expect(transitionRes.status).toBe(400);
  });

  test("the Test Instances Advance control only offers the allowed next stage, and using it succeeds", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await openCaseManagement(page);
    await page.getByText("Complaint", { exact: true }).click();
    await page.getByRole("tab", { name: "Test Instances" }).click();

    const row = page.locator("table tbody tr", { hasText: instanceId.slice(0, 8) });
    await expect(row).toBeVisible();

    const advanceSelect = row.locator('div[role="combobox"]').first();
    await advanceSelect.click();
    await expect(page.getByRole("option", { name: "Investigating" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Resolved" })).toHaveCount(0);
    await page.getByRole("option", { name: "Investigating" }).click();
    await row.getByRole("button", { name: "Go" }).click();

    await expect(row.getByText("Investigating")).toBeVisible();
  });
});
