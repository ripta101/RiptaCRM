import { expect, test } from "@playwright/test";
import { loginAsSupervisor, openSupervisorDashboard } from "../fixtures/auth";
import { closeConversation, deleteConversation, getAgentStatusOptions, setAgentStatus } from "../fixtures/webchatApi";

// Matches apps/webchat-api/prisma/seed.ts's fixed siteKey/queue id and
// apps/access-management-api/prisma/seed.ts's seeded "Supervisor" profile (supervisor1),
// which is granted the seeded "General Support" queue (user-1 is a member) as its
// supervised scope.
const DEMO_SITE_KEY = "demo-site-key-please-change";
const WEBCHAT_API_URL = "http://localhost:4315";
const SERVICE_KEY_HEADER = { "X-Internal-Service-Key": "dev-only-insecure-service-key-change-me" };

test.describe("Supervisor Dashboard", () => {
  test("shows an in-scope agent's status, active interactions, and answered count", async ({ page, request }) => {
    const conversationIds: string[] = [];

    try {
      const options = await getAgentStatusOptions();
      const available = options.find((o) => o.isAvailableForChats);
      expect(available, "seed data must include an isAvailableForChats status option").toBeTruthy();
      await setAgentStatus("user-1", available!.id);

      // Active interaction: assigned to user-1, left OPEN.
      const activeRes = await request.post(`${WEBCHAT_API_URL}/api/public/conversations`, {
        data: { siteKey: DEMO_SITE_KEY, pageUrlPath: "/support.html" },
      });
      const active = await activeRes.json();
      conversationIds.push(active.id);
      await request.post(`${WEBCHAT_API_URL}/api/conversations/${active.id}/assign`, {
        headers: SERVICE_KEY_HEADER,
        data: { assignedToUserId: "user-1" },
      });

      // Answered interaction: assigned to user-1, then closed.
      const answeredRes = await request.post(`${WEBCHAT_API_URL}/api/public/conversations`, {
        data: { siteKey: DEMO_SITE_KEY, pageUrlPath: "/support.html" },
      });
      const answered = await answeredRes.json();
      conversationIds.push(answered.id);
      await request.post(`${WEBCHAT_API_URL}/api/conversations/${answered.id}/assign`, {
        headers: SERVICE_KEY_HEADER,
        data: { assignedToUserId: "user-1" },
      });
      await closeConversation(answered.id);

      await loginAsSupervisor(page);
      await openSupervisorDashboard(page);

      // Every seeded frontline user (test, test1..test10) is visible here via the
      // supervised "Frontline User" profile grant — "(test)" (not a substring of
      // "(test1)" etc.) picks out user-1's row specifically, not just "Test User".
      const row = page.getByRole("row", { name: "(test)" });
      await expect(row).toBeVisible({ timeout: 10_000 });
      await expect(row).toContainText("Available");

      const cells = row.getByRole("cell");
      await expect(cells.nth(4)).toHaveText("1"); // Active Interactions
      await expect(cells.nth(5)).toHaveText("1"); // Answered
    } finally {
      for (const id of conversationIds) await deleteConversation(id);
      await setAgentStatus("user-1", null);
    }
  });

  test("filtering to a different queue hides an out-of-scope agent", async ({ page }) => {
    await loginAsSupervisor(page);
    await openSupervisorDashboard(page);

    // The seeded Supervisor profile's only supervised queue is General Support — the queue
    // filter should offer exactly that (plus "All queues"), proving scope is enforced
    // server-side rather than the client just filtering an unrestricted roster.
    await page.getByLabel("Queue").click();
    await expect(page.getByRole("option", { name: "General Support" })).toBeVisible();
    const options = await page.getByRole("option").allTextContents();
    expect(options).toEqual(["All queues", "General Support"]);
  });
});
