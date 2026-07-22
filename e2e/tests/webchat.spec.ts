import { expect, test } from "@playwright/test";
import { loginAsFrontline } from "../fixtures/auth";
import { deleteConversation } from "../fixtures/webchatApi";

// Reuses the seeded demo Site (siteKey embedded directly in apps/webchat-sample-site's
// static pages) and its "General Support" queue (autoPopup: true, seeded members include
// "user-1" — the frontline "test" user loginAsFrontline signs in as) rather than creating
// throwaway fixtures, since a throwaway siteKey can't be embedded into the sample site's
// already-built static HTML at test time.
const SAMPLE_SITE_URL = "http://localhost:5180";

test.describe("WebChat", () => {
  test("a visitor message on the sample site auto-pops into the assigned agent's interaction tab, and the agent's reply reaches the visitor", async ({
    page,
    browser,
  }) => {
    // The default 30s test timeout is too tight for this flow: two real WebSocket
    // connections, a cross-context round trip, and several generous per-assertion waits
    // (justified given this is the first socket-driven spec in the suite — see the "Testing"
    // section of this feature's plan) easily add up past 30s even in the happy path.
    test.setTimeout(90_000);

    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    let conversationId: string | undefined;

    try {
      // Agent logs in FIRST — AgentSocketProvider's connection (and its "agent:<userId>"
      // room membership) must already be open before the visitor's chat gets assigned, or
      // the "chat:assigned" screen-pop event fires into an empty room and is lost (the
      // agent would still find the chat in their Worklist, but this test is specifically
      // exercising the auto-popup path, which needs the socket connected in time).
      await loginAsFrontline(page);
      // AgentSocketProvider's connection is opened by a useEffect after mount — a real
      // network handshake, not instant. Wait for its own connected-state marker rather than
      // a fixed timeout, so this isn't racing an arbitrary guess against real socket.io
      // handshake latency.
      await expect(page.getByTestId("webchat-agent-socket-status")).toHaveAttribute("data-connected", "true", {
        timeout: 10_000,
      });

      // The agent's status is cleared server-side on every login (see webchat-api's
      // ws/socketServer.ts) — this must happen AFTER the socket-connected wait above, or
      // the very act of connecting would immediately wipe the status right back out. Picked
      // via the real TopBar control, not a fixture, so this spec also covers the actual
      // status-picker UI end-to-end, not just the backend eligibility gate.
      await page.getByTestId("agent-status-selector").click();
      await page.getByRole("option", { name: "Available" }).click();

      // Visiting /support.html triggers the widget's own POST /api/public/conversations —
      // capture its response to learn the conversation id (for targeted cleanup) without
      // needing an admin lookup.
      const [startResponse] = await Promise.all([
        visitorPage.waitForResponse(
          (res) => res.url().includes("/api/public/conversations") && res.request().method() === "POST",
        ),
        visitorPage.goto(`${SAMPLE_SITE_URL}/support.html`),
      ]);
      const started = await startResponse.json();
      conversationId = started.id as string;
      expect(started.assignedQueueId).toBeTruthy();

      // Open the widget bubble and send the visitor's message inside its iframe.
      await visitorPage.getByRole("button", { name: "💬" }).click();
      const widgetFrame = visitorPage.frameLocator("iframe[title='Chat with us']");
      await widgetFrame.getByPlaceholder("Type a message…").fill("Hi, I have a question about my rental.");
      await widgetFrame.getByRole("button", { name: "Send" }).click();
      await expect(widgetFrame.getByText("Hi, I have a question about my rental.")).toBeVisible();

      // "test" (user-1) is a seeded member of the General Support queue, which has
      // autoPopup on — a "Web Chat" interaction tab should screen-pop with no manual
      // navigation once the socket delivers the assignment.
      await expect(page.getByRole("tab", { name: /Web Chat/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Hi, I have a question about my rental.")).toBeVisible({ timeout: 10_000 });

      // Reply as the agent — the visitor's widget should see it via the same socket room.
      await page.getByPlaceholder("Type a message…").fill("Happy to help — what's your rental confirmation number?");
      await page.getByRole("button", { name: "Send" }).click();

      await expect(
        widgetFrame.getByText("Happy to help — what's your rental confirmation number?"),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      if (conversationId) await deleteConversation(conversationId);
      await visitorContext.close();
    }
  });

  test("the chat window stays open across a real page navigation on the customer site", async ({ page }) => {
    // The loader script (apps/webchat-widget/src/loader/loader.ts) targets a real multi-page
    // customer site, not an SPA — it re-executes from scratch on every page. Regression test
    // for a bug where the open/closed bubble state lived only in that script's in-memory
    // closure, so navigating to a different page always snapped an open chat window shut,
    // even though the conversation itself already survived navigation via ChatPanel's own
    // localStorage-backed resume.
    let conversationId: string | undefined;

    try {
      const [startResponse] = await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes("/api/public/conversations") && res.request().method() === "POST",
        ),
        page.goto(`${SAMPLE_SITE_URL}/support.html`),
      ]);
      conversationId = (await startResponse.json()).id as string;

      await page.getByRole("button", { name: "💬" }).click();
      await expect(page.locator("iframe[title='Chat with us']")).toBeVisible();

      await page.goto(`${SAMPLE_SITE_URL}/pricing.html`);

      await expect(page.locator("iframe[title='Chat with us']")).toBeVisible();
    } finally {
      if (conversationId) await deleteConversation(conversationId);
    }
  });
});
