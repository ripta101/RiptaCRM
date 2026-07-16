import { expect, test } from "@playwright/test";
import { loginAsAdmin, openCaseManagement } from "../fixtures/auth";
import { createThrowawayCaseType, deleteCaseType } from "../fixtures/api";
import { connectNodes, dragNode, dragNodePastNode, selectAndDeleteNode } from "../fixtures/dnd";

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

  test("canvas node drag persists position, and reordering horizontally re-sorts the stage list", async ({
    page,
  }) => {
    const before = (await getStages(draftVersionId)).find((s) => s.id === startStageId)!;
    const endStageId = (await getStages(draftVersionId)).find((s) => s.key === "end")!.id;

    await loginAsAdmin(page);
    await openCaseManagement(page);
    await page.getByText(CASE_TYPE_NAME, { exact: true }).click();
    await page.getByRole("tab", { name: "Stages & SLA" }).click();

    // Stage list starts in canvas left-to-right order: Start (x=0), then End (x=220).
    const firstRowNameBefore = await page.locator("table tbody tr").first().locator("td").first().innerText();
    expect(firstRowNameBefore).toBe("Start");

    await dragNode(page, startStageId, 0, 150);
    await page.waitForTimeout(500);

    const afterVerticalDrag = (await getStages(draftVersionId)).find((s) => s.id === startStageId)!;
    expect(afterVerticalDrag.positionY).not.toBe(before.positionY);

    // Drag "Start" past "End" horizontally — the list should re-sort to match, with no
    // drag-and-drop of its own: list order is derived entirely from canvas positionX.
    await dragNodePastNode(page, startStageId, endStageId);
    await page.waitForTimeout(500);

    const stagesAfterHorizontalDrag = await getStages(draftVersionId);
    const start = stagesAfterHorizontalDrag.find((s) => s.id === startStageId)!;
    const end = stagesAfterHorizontalDrag.find((s) => s.key === "end")!;
    expect(start.positionX).toBeGreaterThan(end.positionX);

    const firstRowNameAfter = await page.locator("table tbody tr").first().locator("td").first().innerText();
    expect(firstRowNameAfter).toBe("End");
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

    // The new End -> Start transition should also now show up as a chip in the stage list.
    const endRow = page.locator("table tbody tr", { hasText: "End" });
    await expect(endRow.getByText("→ Start")).toBeVisible();

    // Delete the edge we just drew, via keyboard, leaving the original transition intact.
    const newEdge = page.locator(".react-flow__edge").last();
    await newEdge.click({ force: true });
    await page.keyboard.press("Delete");
    await page.waitForTimeout(500);
    await expect(page.locator(".react-flow__edge")).toHaveCount(edgeCountBefore);
    await expect(endRow.getByText("→ Start")).toHaveCount(0);

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
