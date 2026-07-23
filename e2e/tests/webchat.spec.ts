import { expect, test } from "@playwright/test";
import { loginAsFrontline } from "../fixtures/auth";
import { deleteConversation, getAgentStatusOptions, getConversation, setAgentStatus } from "../fixtures/webchatApi";

// Reuses the seeded demo Site (siteKey embedded directly in apps/webchat-sample-site's
// static pages) and its "General Support" queue (autoPopup: true, seeded members include
// "user-1" — the frontline "test" user loginAsFrontline signs in as) rather than creating
// throwaway fixtures, since a throwaway siteKey can't be embedded into the sample site's
// already-built static HTML at test time.
const SAMPLE_SITE_URL = "http://localhost:5180";
const WEBCHAT_API_URL = "http://localhost:4315";
const DEMO_SITE_KEY = "demo-site-key-please-change";

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

      // The webchat tab now looks like a normal new interaction — Search Customer on the
      // left, chat pinned on the right (WebChatInteractionWorkspace) — search for and
      // identify the seeded "Ripta Ramelan" customer, same flow/selectors as
      // customer-search.spec.ts's own search-and-confirm test.
      await page.getByLabel("First name").fill("Ripta");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Ripta Ramelan" })).toBeVisible({ timeout: 10_000 });
      await page.getByRole("button", { name: "Confirm" }).click();

      // Tab renames to the customer's name (the chat-icon prefix isn't text-checkable here)
      // — the chat transcript stays visible in the same view throughout, since the customer
      // workspace and the chat panel are two panes of the same tab, not separate tabs.
      await expect(page.getByRole("tab", { name: /Ripta Ramelan/ })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("Happy to help — what's your rental confirmation number?")).toBeVisible();

      // The link is a real backend change, not just a UI relabel.
      await expect
        .poll(async () => (await getConversation(conversationId!)).customerAccountId, { timeout: 10_000 })
        .not.toBeNull();
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

  test("a chat assigned before the agent's session started still screen-pops once they go available", async ({
    page,
    request,
  }) => {
    // Regression test for a reported bug: "chat:assigned" (AgentSocketProvider) is a
    // one-shot socket emit with no persistence — it only reaches an agent whose socket is
    // already connected and joined at the exact instant a chat is assigned. Here the
    // conversation is assigned to "user-1" via the public API *before* their browser
    // session (and its socket) even exists, simulating a chat that was missed. The fix
    // (AgentStatusSelector's catch-up-on-becoming-available check) should still screen-pop
    // it the moment they pick an available status, with no manual Worklist visit needed.
    let conversationId: string | undefined;

    try {
      const options = await getAgentStatusOptions();
      const available = options.find((o) => o.isAvailableForChats);
      expect(available, "seed data must include an isAvailableForChats status option").toBeTruthy();

      await setAgentStatus("user-1", available!.id);
      const startResponse = await request.post(`${WEBCHAT_API_URL}/api/public/conversations`, {
        data: { siteKey: DEMO_SITE_KEY, pageUrlPath: "/support.html" },
      });
      const started = await startResponse.json();
      conversationId = started.id as string;
      expect(started.assignedToUserId).toBe("user-1");

      await loginAsFrontline(page);
      await expect(page.getByTestId("webchat-agent-socket-status")).toHaveAttribute("data-connected", "true", {
        timeout: 10_000,
      });

      await page.getByTestId("agent-status-selector").click();
      await page.getByRole("option", { name: "Available" }).click();

      await expect(page.getByRole("tab", { name: /Web Chat/i })).toBeVisible({ timeout: 10_000 });
    } finally {
      if (conversationId) await deleteConversation(conversationId);
      await setAgentStatus("user-1", null);
    }
  });

  test("an agent can close a conversation, and the visitor can no longer send further messages", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);

    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    let conversationId: string | undefined;

    try {
      await loginAsFrontline(page);
      await expect(page.getByTestId("webchat-agent-socket-status")).toHaveAttribute("data-connected", "true", {
        timeout: 10_000,
      });
      await page.getByTestId("agent-status-selector").click();
      await page.getByRole("option", { name: "Available" }).click();

      const [startResponse] = await Promise.all([
        visitorPage.waitForResponse(
          (res) => res.url().includes("/api/public/conversations") && res.request().method() === "POST",
        ),
        visitorPage.goto(`${SAMPLE_SITE_URL}/support.html`),
      ]);
      conversationId = (await startResponse.json()).id as string;

      await visitorPage.getByRole("button", { name: "💬" }).click();
      const widgetFrame = visitorPage.frameLocator("iframe[title='Chat with us']");
      await widgetFrame.getByPlaceholder("Type a message…").fill("Hi, are you there?");
      await widgetFrame.getByRole("button", { name: "Send" }).click();

      await expect(page.getByRole("tab", { name: /Web Chat/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Hi, are you there?")).toBeVisible({ timeout: 10_000 });

      await page.getByRole("button", { name: "Close conversation" }).click();
      await expect(page.getByText("This conversation is closed.")).toBeVisible();
      await expect(page.getByPlaceholder("Type a message…")).toBeDisabled();

      // The visitor's widget doesn't know the chat closed until they try to send again —
      // matches the pre-existing 409 behavior asserted at the API level in public.test.ts.
      await widgetFrame.getByPlaceholder("Type a message…").fill("Still there?");
      await widgetFrame.getByRole("button", { name: "Send" }).click();
      await expect(widgetFrame.getByText(/Failed to send message \(409\)/)).toBeVisible({ timeout: 10_000 });
    } finally {
      if (conversationId) await deleteConversation(conversationId);
      await visitorContext.close();
    }
  });

  test("claiming a second chat still works while a first chat's own tab is already open", async ({
    page,
    browser,
  }) => {
    // Regression test: WebChatAgentModule opens its own per-conversation socket connection
    // to the same /agents namespace AgentSocketProvider uses for its session-level
    // connection — before the fix, the server cleared the agent's live status on EVERY
    // connection to that namespace, not just the session one. Opening the first chat's tab
    // (mounting its own socket) silently wiped the agent's "Available" status server-side —
    // the TopBar kept showing "Available" (nothing ever told it otherwise), but the next
    // claim failed with "Set your status to an available status before claiming chats."
    test.setTimeout(90_000);

    const visitorAContext = await browser.newContext();
    const visitorBContext = await browser.newContext();
    const visitorAPage = await visitorAContext.newPage();
    const visitorBPage = await visitorBContext.newPage();
    let conversationAId: string | undefined;
    let conversationBId: string | undefined;

    try {
      await loginAsFrontline(page);
      await expect(page.getByTestId("webchat-agent-socket-status")).toHaveAttribute("data-connected", "true", {
        timeout: 10_000,
      });
      await page.getByTestId("agent-status-selector").click();
      await page.getByRole("option", { name: "Available" }).click();

      // First chat auto-pops into its own tab — this mounts WebChatAgentModule, opening the
      // second (per-conversation) /agents connection the bug is about.
      const [startAResponse] = await Promise.all([
        visitorAPage.waitForResponse(
          (res) => res.url().includes("/api/public/conversations") && res.request().method() === "POST",
        ),
        visitorAPage.goto(`${SAMPLE_SITE_URL}/support.html`),
      ]);
      conversationAId = (await startAResponse.json()).id as string;
      await expect(page.getByRole("tab", { name: /Web Chat/i }).first()).toBeVisible({ timeout: 15_000 });

      // Second visitor arrives on the same queue — "test" (user-1) is the only member with
      // an available status set, so this either auto-assigns straight to them or, if their
      // status was silently cleared by the first tab's socket (the bug), lands unassigned
      // and claimable in the Worklist instead — either way, this is what actually surfaces
      // the bug: a real "second chat while the first is open" scenario, not a contrived one.
      const [startBResponse] = await Promise.all([
        visitorBPage.waitForResponse(
          (res) => res.url().includes("/api/public/conversations") && res.request().method() === "POST",
        ),
        visitorBPage.goto(`${SAMPLE_SITE_URL}/support.html`),
      ]);
      const startedB = await startBResponse.json();
      conversationBId = startedB.id as string;

      if (startedB.assignedToUserId === "user-1") {
        // Status survived — auto-assigned straight through, same as the first chat.
        await expect(page.getByRole("tab", { name: /Web Chat/i })).toHaveCount(2, { timeout: 15_000 });
      } else {
        // Status was wiped, so it's sitting unassigned — claim it via the Worklist, the
        // exact action the bug report was about.
        await page.getByRole("tab", { name: "Home" }).click();
        await page.getByRole("tab", { name: /worklist/i }).click();
        await expect(page.getByRole("button", { name: "Claim" })).toBeVisible({ timeout: 10_000 });
        await page.getByRole("button", { name: "Claim" }).click();

        await expect(page.getByText(/Set your status to an available status/i)).not.toBeVisible();
        await expect(page.getByRole("tab", { name: /Web Chat/i })).toHaveCount(2, { timeout: 15_000 });
      }
    } finally {
      if (conversationAId) await deleteConversation(conversationAId);
      if (conversationBId) await deleteConversation(conversationBId);
      await visitorAContext.close();
      await visitorBContext.close();
    }
  });
});
