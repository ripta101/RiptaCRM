import { expect, test } from "@playwright/test";
import { loginAsAdmin, openCaseManagement } from "../fixtures/auth";
import {
  createCaseInstance,
  createThrowawayCaseType,
  deleteCaseInstance,
  deleteCaseType,
  publishVersion,
} from "../fixtures/api";

const BASE_URL = "http://localhost:4311";
const CASE_TYPE_NAME = "E2E draft-publish";

test.describe("Draft -> publish workflow", () => {
  let caseTypeId: string;
  let originalVersionId: string;
  let instanceId: string;

  test.beforeAll(async () => {
    const { caseTypeId: id, draftVersionId } = await createThrowawayCaseType("draft-publish");
    caseTypeId = id;
    originalVersionId = draftVersionId;
    await publishVersion(draftVersionId);

    const instance = await createCaseInstance(caseTypeId);
    instanceId = instance.id; // pinned to originalVersionId — must stay pinned after republishing
  });

  test.afterAll(async () => {
    await deleteCaseInstance(instanceId);
    await deleteCaseType(caseTypeId);
  });

  test("cloning a draft carries stages/transitions forward, and publishing pins prior instances to the old version", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await openCaseManagement(page);
    await page.getByText(CASE_TYPE_NAME, { exact: true }).click();

    await expect(page.getByText("Published v1")).toBeVisible();

    await page.getByRole("button", { name: "Create Draft" }).click();
    await expect(page.getByText("Draft v2")).toBeVisible();

    await page.getByRole("tab", { name: "Stages & SLA" }).click();
    await expect(page.getByRole("cell", { name: "Start", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "End", exact: true })).toBeVisible();
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);

    // Edit the cloned draft to prove it's independently editable before publishing.
    const startRow = page.locator("table tbody tr", { hasText: "Start" });
    await startRow.locator('input[type="number"]').fill("999");
    await startRow.getByTestId("SaveIcon").click();
    await expect(startRow.locator('input[type="number"]')).toHaveValue("999");

    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Published v2")).toBeVisible();
    await expect(page.getByText(/v1 \(archived\)/)).toBeVisible();

    // The instance created against v1 (before this draft/publish cycle) must still be
    // pinned to v1 — publishing a new version must never retroactively move it.
    const res = await fetch(`${BASE_URL}/api/case-instances/${instanceId}`);
    const detail = await res.json();
    expect(detail.caseTypeVersionId).toBe(originalVersionId);
  });
});
