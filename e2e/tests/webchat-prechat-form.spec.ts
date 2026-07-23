import { expect, test } from "@playwright/test";
import { loginAsFrontline } from "../fixtures/auth";
import {
  createPreChatField,
  deleteConversation,
  deletePreChatField,
  getSiteIdBySiteKey,
} from "../fixtures/webchatApi";

// Reuses the seeded demo Site, same as every other webchat e2e spec — a throwaway siteKey
// can't be embedded into the sample site's already-built static HTML at test time.
const SAMPLE_SITE_URL = "http://localhost:5180";
const DEMO_SITE_KEY = "demo-site-key-please-change";

test.describe("WebChat pre-chat intake form", () => {
  test("a visitor fills in the admin-configured pre-chat form before chatting, and the agent sees their answers", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);

    const siteId = await getSiteIdBySiteKey(DEMO_SITE_KEY);
    const firstNameField = await createPreChatField({
      siteId,
      fieldKey: "firstName",
      label: "First Name",
      fieldType: "TEXT",
      required: true,
      displayOrder: 0,
    });
    const lastNameField = await createPreChatField({
      siteId,
      fieldKey: "lastName",
      label: "Last Name",
      fieldType: "TEXT",
      required: true,
      displayOrder: 1,
    });

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

      // Fresh visitor, no stored conversation id yet — the widget must show the pre-chat
      // form instead of eagerly starting a conversation.
      await visitorPage.goto(`${SAMPLE_SITE_URL}/support.html`);
      await visitorPage.getByRole("button", { name: "💬" }).click();
      const widgetFrame = visitorPage.frameLocator("iframe[title='Chat with us']");

      await expect(widgetFrame.getByText("Please tell us a bit about yourself")).toBeVisible();
      await expect(widgetFrame.getByPlaceholder("Type a message…")).not.toBeVisible();

      // Submitting with required fields empty is blocked (HTML5 required) — the form stays.
      await widgetFrame.getByRole("button", { name: "Start chat" }).click();
      await expect(widgetFrame.getByText("Please tell us a bit about yourself")).toBeVisible();

      await widgetFrame.getByLabel("First Name").fill("Ada");
      await widgetFrame.getByLabel("Last Name").fill("Lovelace");

      const [startResponse] = await Promise.all([
        visitorPage.waitForResponse(
          (res) => res.url().includes("/api/public/conversations") && res.request().method() === "POST",
        ),
        widgetFrame.getByRole("button", { name: "Start chat" }).click(),
      ]);
      const started = await startResponse.json();
      conversationId = started.id as string;
      expect(started.intakeValues).toEqual(
        expect.arrayContaining([
          { fieldKey: "firstName", label: "First Name", value: "Ada" },
          { fieldKey: "lastName", label: "Last Name", value: "Lovelace" },
        ]),
      );

      // The pre-chat form is gone; the normal chat UI takes over, unchanged from today.
      await expect(widgetFrame.getByPlaceholder("Type a message…")).toBeVisible();
      await widgetFrame.getByPlaceholder("Type a message…").fill("Hi, I have a question.");
      await widgetFrame.getByRole("button", { name: "Send" }).click();
      await expect(widgetFrame.getByText("Hi, I have a question.")).toBeVisible();

      // Agent's screen-popped tab shows the submitted answers above the transcript.
      await expect(page.getByRole("tab", { name: /Web Chat/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Visitor details")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("Ada")).toBeVisible();
      await expect(page.getByText("Lovelace")).toBeVisible();
    } finally {
      if (conversationId) await deleteConversation(conversationId);
      await deletePreChatField(firstNameField.id);
      await deletePreChatField(lastNameField.id);
      await visitorContext.close();
    }
  });

  test("a site with no pre-chat fields configured starts chatting immediately, unaffected", async ({ page }) => {
    // Regression guard: the demo Site normally has zero PreChatFields configured (the
    // previous test always cleans its own two up) — this pins that the eager
    // POST /conversations-on-mount behavior from before this feature still holds when no
    // fields are configured, i.e. this feature is fully opt-in per site.
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
      const widgetFrame = page.frameLocator("iframe[title='Chat with us']");
      await expect(widgetFrame.getByPlaceholder("Type a message…")).toBeVisible();
    } finally {
      if (conversationId) await deleteConversation(conversationId);
    }
  });
});
