import { expect, test } from "@playwright/test";
import { loginAsAdmin, openCaseManagement, reopenCaseType } from "../fixtures/auth";
import { createThrowawayCaseType, deleteCaseType } from "../fixtures/api";
import { connectNodes, dragNode, dragTableRowBelow, selectAndDeleteNode } from "../fixtures/dnd";

const BASE_URL = "http://localhost:4311";
const CASE_TYPE_NAME = "E2E drag-and-drop";

interface StageRef {
  id: string;
  key: string;
  positionX: number;
  positionY: number;
}

async function getStages(versionId: string): Promise<StageRef[]> {
  const res = await fetch(`${BASE_URL}/api/case-type-versions/${versionId}`);
  const version = await res.json();
  return version.stages;
}

test.describe("Drag-and-drop stage sequencing and transition graph", () => {
  let caseTypeId: string;
  let draftVersionId: string;
  let startStageId: string;

  test.beforeAll(async () => {
    const created = await createThrowawayCaseType("drag-and-drop");
    caseTypeId = created.caseTypeId;
    draftVersionId = created.draftVersionId; // left as DRAFT — never published, stays editable
    const stages = await getStages(draftVersionId);
    startStageId = stages.find((s) => s.key === "start")!.id;
  });

  test.afterAll(async () => {
    await deleteCaseType(caseTypeId);
  });

  test("table row reorder persists", async ({ page }) => {
    await loginAsAdmin(page);
    await openCaseManagement(page);
    await page.getByText(CASE_TYPE_NAME, { exact: true }).click();
    await page.getByRole("tab", { name: "Stages & SLA" }).click();

    const firstRowNameBefore = await page.locator("table tbody tr").first().locator("td").nth(1).innerText();
    expect(firstRowNameBefore).toBe("Start");

    await dragTableRowBelow(page, "Start", "End");
    await page.waitForTimeout(500);

    // page.reload() would drop client-side navigation state (no deep-linking) — re-navigate
    // through the UI instead to get a fresh fetch of the same case type.
    await reopenCaseType(page, CASE_TYPE_NAME);
    await page.getByRole("tab", { name: "Stages & SLA" }).click();

    const firstRowNameAfter = await page.locator("table tbody tr").first().locator("td").nth(1).innerText();
    expect(firstRowNameAfter).toBe("End");
  });

  test("canvas node drag persists position", async ({ page }) => {
    const before = (await getStages(draftVersionId)).find((s) => s.id === startStageId)!;

    await loginAsAdmin(page);
    await openCaseManagement(page);
    await page.getByText(CASE_TYPE_NAME, { exact: true }).click();
    await page.getByRole("tab", { name: "Stages & SLA" }).click();

    await dragNode(page, startStageId, 0, 150);
    await page.waitForTimeout(500);

    const after = (await getStages(draftVersionId)).find((s) => s.id === startStageId)!;
    expect(after.positionY).not.toBe(before.positionY);
  });

  test("drawing a new edge creates a transition, and keyboard Delete removes nodes/edges", async ({ page }) => {
    const stages = await getStages(draftVersionId);
    const endStageId = stages.find((s) => s.key === "end")!.id;

    await loginAsAdmin(page);
    await openCaseManagement(page);
    await page.getByText(CASE_TYPE_NAME, { exact: true }).click();
    await page.getByRole("tab", { name: "Stages & SLA" }).click();

    const edgeCountBefore = await page.locator(".react-flow__edge").count();
    await connectNodes(page, endStageId, startStageId);
    await page.waitForTimeout(500);
    await expect(page.locator(".react-flow__edge")).toHaveCount(edgeCountBefore + 1);

    // Delete the edge we just drew, via keyboard, leaving the original transition intact.
    const newEdge = page.locator(".react-flow__edge").last();
    await newEdge.click({ force: true });
    await page.keyboard.press("Delete");
    await page.waitForTimeout(500);
    await expect(page.locator(".react-flow__edge")).toHaveCount(edgeCountBefore);

    // Clear any lingering selection from the edge delete before selecting a node.
    await page.locator(".react-flow__pane").click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // This is the last test in the file (afterAll deletes the whole throwaway case type
    // regardless) — delete "End" directly via keyboard rather than a freshly-added node,
    // since Start/End are already proven reliably interactable earlier in this file.
    await selectAndDeleteNode(page, endStageId);
    await page.waitForTimeout(500);
    await expect(page.locator(".react-flow__node", { hasText: "End" })).toHaveCount(0);
  });
});
