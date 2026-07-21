import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin, loginAsFrontline, openMessageBroadcast } from "../fixtures/auth";
import { createThrowawayBroadcast, deleteThrowawayBroadcast, findBroadcastIdByTitle } from "../fixtures/broadcastApi";

const announcementsPanel = (page: Page) => page.locator(".MuiCard-root", { hasText: "Announcements" });

test.describe("Message Broadcast", () => {
  const createdIds: string[] = [];

  test.afterEach(async () => {
    await Promise.all(createdIds.splice(0).map((id) => deleteThrowawayBroadcast(id).catch(() => undefined)));
  });

  test("admin composes a broadcast targeted at frontline only; it shows on the frontline dashboard, not the admin's", async ({
    page,
  }) => {
    const title = `Frontline only ${Date.now()}`;

    await loginAsAdmin(page);
    await openMessageBroadcast(page);
    await page.getByRole("button", { name: "New Broadcast" }).click();

    await page.getByLabel("Title").fill(title);
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("Please review the new policy 🎉");
    await page.keyboard.press("Control+a");
    await page.getByRole("button", { name: "Bold" }).click();

    await page.getByRole("checkbox", { name: "Frontline User" }).check();
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "New Broadcast" }).waitFor();

    const createdId = await findBroadcastIdByTitle(title);
    if (createdId) createdIds.push(createdId);

    await loginAsFrontline(page);
    await expect(announcementsPanel(page)).toContainText(title, { timeout: 15_000 });
    await expect(announcementsPanel(page).locator("strong", { hasText: "Please review the new policy" })).toBeVisible();

    await loginAsAdmin(page);
    await expect(announcementsPanel(page)).not.toContainText(title);
  });

  test("editing a broadcast's title updates what the frontline dashboard shows", async ({ page }) => {
    const originalTitle = `Original ${Date.now()}`;
    const updatedTitle = `Updated ${Date.now()}`;
    const { id } = await createThrowawayBroadcast({ title: originalTitle, targetProfileIds: ["profile-frontline-user"] });
    createdIds.push(id);

    await loginAsAdmin(page);
    await openMessageBroadcast(page);
    await page.locator("tr", { hasText: originalTitle }).click();
    await page.getByLabel("Title").fill(updatedTitle);
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "New Broadcast" }).waitFor();

    await loginAsFrontline(page);
    await expect(announcementsPanel(page)).toContainText(updatedTitle, { timeout: 15_000 });
  });

  test("a broadcast whose validity window has already ended does not display", async ({ page }) => {
    const title = `Already expired ${Date.now()}`;
    const now = Date.now();
    const { id } = await createThrowawayBroadcast({
      title,
      targetProfileIds: ["profile-frontline-user"],
      startAt: new Date(now - 2 * 60 * 60_000).toISOString(),
      endAt: new Date(now - 60 * 60_000).toISOString(),
    });
    createdIds.push(id);

    await loginAsFrontline(page);
    await expect(announcementsPanel(page)).not.toContainText(title);
  });

  test("canceling a broadcast hides it immediately and marks it Canceled (not Expired) in the admin list", async ({
    page,
  }) => {
    const title = `Will be canceled ${Date.now()}`;
    const { id } = await createThrowawayBroadcast({ title, targetProfileIds: ["profile-frontline-user"] });
    createdIds.push(id);

    await loginAsAdmin(page);
    await openMessageBroadcast(page);
    await page.locator("tr", { hasText: title }).click();
    await page.getByRole("button", { name: "Cancel Broadcast" }).click();
    await page.getByRole("button", { name: "New Broadcast" }).waitFor();
    await expect(page.locator("tr", { hasText: title })).toContainText("Canceled");

    await loginAsFrontline(page);
    await expect(announcementsPanel(page)).not.toContainText(title);
  });

  test("a HIGH priority broadcast displays above a NORMAL priority one for the same profile", async ({ page }) => {
    const lowTitle = `Normal priority ${Date.now()}`;
    const highTitle = `High priority ${Date.now()}`;
    const normal = await createThrowawayBroadcast({ title: lowTitle, targetProfileIds: ["profile-frontline-user"], priority: "NORMAL" });
    createdIds.push(normal.id);
    const high = await createThrowawayBroadcast({ title: highTitle, targetProfileIds: ["profile-frontline-user"], priority: "HIGH" });
    createdIds.push(high.id);

    await loginAsFrontline(page);
    const panel = announcementsPanel(page);
    await expect(panel).toContainText(highTitle, { timeout: 15_000 });
    const text = await panel.innerText();
    expect(text.indexOf(highTitle)).toBeLessThan(text.indexOf(lowTitle));
  });
});
