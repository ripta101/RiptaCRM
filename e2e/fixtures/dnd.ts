import type { Page } from "@playwright/test";

/**
 * @xyflow/react requires the pointer to cross a drag-activation distance via multiple
 * intermediate move events before internal drag state activates. Passing `{ steps }` to a
 * single `mouse.move()` call dispatches all intermediate events in one tight synchronous
 * burst, which is not reliably enough for React/XYFlow's internal state to register — an
 * explicit loop of individually-awaited `mouse.move()` calls, with real pauses between them,
 * is what actually works.
 */
async function realisticDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const bursts = 4;
  for (let i = 1; i <= bursts; i++) {
    const x = from.x + ((to.x - from.x) * i) / bursts;
    const y = from.y + ((to.y - from.y) * i) / bursts;
    await page.mouse.move(x, y, { steps: 5 });
    await page.waitForTimeout(150);
  }
  await page.mouse.up();
  await page.waitForTimeout(150);
}

export async function dragNode(page: Page, nodeId: string, deltaX: number, deltaY: number) {
  const node = page.locator(`.react-flow__node[data-id="${nodeId}"]`);
  // boundingBox() returns page-space coordinates even when the element is scrolled out of
  // the visible viewport — raw page.mouse.move() targeting those coordinates then silently
  // no-ops (unlike locator methods, it does not auto-scroll first).
  await node.scrollIntoViewIfNeeded();
  const box = await node.boundingBox();
  if (!box) throw new Error(`Node ${nodeId} not found or not visible`);

  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const end = { x: start.x + deltaX, y: start.y + deltaY };
  await realisticDrag(page, start, end);
}

/**
 * Drags a node to just past another node's on-screen right edge. Targets a screen position
 * relative to the other node (rather than a fixed pixel delta) because React Flow's `fitView`
 * auto-zooms the canvas — a fixed pixel offset doesn't map 1:1 to logical flow coordinates at
 * arbitrary zoom levels, so a fixed delta can't reliably guarantee crossing another node's
 * actual position.
 */
export async function dragNodePastNode(page: Page, nodeId: string, targetNodeId: string) {
  const node = page.locator(`.react-flow__node[data-id="${nodeId}"]`);
  const target = page.locator(`.react-flow__node[data-id="${targetNodeId}"]`);
  await node.scrollIntoViewIfNeeded();
  const box = await node.boundingBox();
  const targetBox = await target.boundingBox();
  if (!box || !targetBox) throw new Error("Node not found or not visible");

  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const end = { x: targetBox.x + targetBox.width + 60, y: start.y };
  await realisticDrag(page, start, end);
}

export async function connectNodes(page: Page, fromNodeId: string, toNodeId: string) {
  const sourceHandle = page.locator(`.react-flow__node[data-id="${fromNodeId}"] .react-flow__handle-right`);
  const targetHandle = page.locator(`.react-flow__node[data-id="${toNodeId}"] .react-flow__handle-left`);
  await sourceHandle.scrollIntoViewIfNeeded();
  const from = await sourceHandle.boundingBox();
  const to = await targetHandle.boundingBox();
  if (!from || !to) throw new Error("Handle not found for one of the given nodes");

  await realisticDrag(
    page,
    { x: from.x + from.width / 2, y: from.y + from.height / 2 },
    { x: to.x + to.width / 2, y: to.y + to.height / 2 },
  );
}

/**
 * Selects a node via a plain click, then deletes it via keyboard.
 *
 * Deliberately NOT a drag: dragging a node calls the app's onNodeDragStop handler, which
 * persists the new position and refetches stage data — that refetch resets the flow editor's
 * local node state (losing the `selected` flag) before the Delete keypress lands, so the
 * delete silently no-ops. A plain click selects without moving the node and without
 * triggering that refetch race.
 */
export async function selectAndDeleteNode(page: Page, nodeId: string) {
  const node = page.locator(`.react-flow__node[data-id="${nodeId}"]`);
  await node.scrollIntoViewIfNeeded();
  await node.click();
  await page.waitForTimeout(200);
  await page.keyboard.press("Delete");
}
