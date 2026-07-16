import { expect, test } from "@playwright/test";
import { loginAsAdmin, openCaseManagement } from "../fixtures/auth";
import { backdateCurrentStage, createCaseInstance, deleteCaseInstance, runSchedulerOnce } from "../fixtures/api";

const BASE_URL = "http://localhost:4311";

async function findComplaintCaseTypeId(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/case-types`);
  const { results } = (await res.json()) as { results: { id: string; key: string }[] };
  return results.find((r) => r.key === "complaint")!.id;
}

test.describe("SLA scheduler + Action Log", () => {
  let instanceId: string;

  test.beforeAll(async () => {
    const caseTypeId = await findComplaintCaseTypeId();
    const instance = await createCaseInstance(caseTypeId);
    instanceId = instance.id;
    // Force the current stage's SLA well into the past so all three trigger timings
    // (before/at/after breach) are due on the next tick.
    await backdateCurrentStage(instanceId, new Date(Date.now() - 60 * 60 * 1000));
  });

  test.afterAll(async () => {
    await deleteCaseInstance(instanceId);
  });

  test("firing the scheduler logs the action, and re-firing does not duplicate it", async ({ page }) => {
    // Note: runSchedulerOnce()'s returned `fired` count is global (scans every open stage
    // history in the DB, not just this fixture's), so all assertions below are scoped to
    // this instance's own Action Log rows via the UI filter, not the raw tick response.
    await runSchedulerOnce();

    await loginAsAdmin(page);
    await openCaseManagement(page);
    await page.getByRole("tab", { name: "Action Log" }).click();
    await page.getByLabel("Filter by Case Instance ID").fill(instanceId);
    await page.getByText("Search", { exact: true }).click();

    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    const countAfterFirstTick = await rows.count();
    expect(countAfterFirstTick).toBeGreaterThan(0);

    await runSchedulerOnce();

    await page.getByText("Search", { exact: true }).click();
    await expect(rows).toHaveCount(countAfterFirstTick);
  });
});
