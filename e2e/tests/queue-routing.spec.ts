import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { loginAsFrontline } from "../fixtures/auth";
import {
  addQueueMember,
  createThrowawayCaseType,
  createThrowawayQueue,
  deleteCaseInstancesForCaseType,
  deleteCaseType,
  deleteQueue,
  getVersionStages,
  publishVersion,
  setStageQueue,
} from "../fixtures/api";

async function lodgeCase(page: Page, caseTypeName: string) {
  await loginAsFrontline(page);
  await page.getByText("New Interaction").click();
  await page.getByLabel("Customer / Account ID").fill("ACC-1001");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByText("Lodge a Case", { exact: true }).click();
  await page.getByText(caseTypeName, { exact: true }).click();
  await page.getByRole("button", { name: "Lodge Case" }).click();
}

test.describe("Queue routing on Lodge a Case", () => {
  test("auto-assigns to the lodging user when they're a member of the stage's queue", async ({ page }) => {
    const suffix = `queue-member-${randomUUID()}`;
    const caseTypeName = `E2E ${suffix}`;
    const { caseTypeId, draftVersionId } = await createThrowawayCaseType(suffix);
    const queue = await createThrowawayQueue(`Member Queue ${suffix}`);
    const stages = await getVersionStages(draftVersionId);
    const firstStage = stages.slice().sort((a, b) => a.displayOrder - b.displayOrder)[0];

    try {
      await setStageQueue(firstStage.id, queue.id);
      await addQueueMember(queue.id, "user-1"); // seeded frontline "test" user's id
      await publishVersion(draftVersionId);

      await lodgeCase(page, caseTypeName);
      await expect(page.getByText("Case lodged and assigned to you.")).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteCaseInstancesForCaseType(caseTypeId);
      await deleteCaseType(caseTypeId);
      await deleteQueue(queue.id);
    }
  });

  test("routes to the queue when the lodging user is not a member", async ({ page }) => {
    const suffix = `queue-nonmember-${randomUUID()}`;
    const caseTypeName = `E2E ${suffix}`;
    const queueName = `Nonmember Queue ${suffix}`;
    const { caseTypeId, draftVersionId } = await createThrowawayCaseType(suffix);
    const queue = await createThrowawayQueue(queueName);
    const stages = await getVersionStages(draftVersionId);
    const firstStage = stages.slice().sort((a, b) => a.displayOrder - b.displayOrder)[0];

    try {
      await setStageQueue(firstStage.id, queue.id);
      // Deliberately no members added — proves the lodging user is routed, not auto-assigned.
      await publishVersion(draftVersionId);

      await lodgeCase(page, caseTypeName);
      await expect(page.getByText(`Case lodged and routed to the "${queueName}" queue.`)).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await deleteCaseInstancesForCaseType(caseTypeId);
      await deleteCaseType(caseTypeId);
      await deleteQueue(queue.id);
    }
  });
});
