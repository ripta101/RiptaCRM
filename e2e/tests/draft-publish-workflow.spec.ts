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
const SERVICE_KEY_HEADERS = { "X-Internal-Service-Key": "dev-only-insecure-service-key-change-me" };
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
    const res = await fetch(`${BASE_URL}/api/case-instances/${instanceId}`, { headers: SERVICE_KEY_HEADERS });
    const detail = await res.json();
    expect(detail.caseTypeVersionId).toBe(originalVersionId);
  });
});

test.describe("Delete draft", () => {
  const DELETE_DRAFT_CASE_TYPE_NAME = "E2E delete-draft";
  let caseTypeId: string;

  test.beforeAll(async () => {
    const { caseTypeId: id, draftVersionId } = await createThrowawayCaseType("delete-draft");
    caseTypeId = id;
    await publishVersion(draftVersionId);
  });

  test.afterAll(async () => {
    await deleteCaseType(caseTypeId);
  });

  test("cancelling the confirmation keeps the draft; confirming deletes it and leaves the published version intact", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await openCaseManagement(page);
    await page.getByText(DELETE_DRAFT_CASE_TYPE_NAME, { exact: true }).click();

    await expect(page.getByText("Published v1")).toBeVisible();
    await page.getByRole("button", { name: "Create Draft" }).click();
    await expect(page.getByText("Draft v2")).toBeVisible();

    // Cancel: dialog closes, draft is untouched.
    await page.getByRole("button", { name: "Delete Draft", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Draft v2")).toBeVisible();

    // Confirm: draft is gone, published version untouched.
    await page.getByRole("button", { name: "Delete Draft", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete Draft" }).click();

    await expect(page.getByText("Draft v2")).toHaveCount(0);
    await expect(page.getByText("Published v1")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Draft" })).toBeVisible();
  });
});
