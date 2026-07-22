import { expect, test } from "@playwright/test";
import {
  deleteCapacityOverride,
  deleteConversation,
  getAgentStatusOptions,
  grantCapacityOverride,
  setAgentStatus,
} from "../fixtures/webchatApi";

// Matches apps/webchat-api/prisma/seed.ts's fixed siteKey and "General Support" queue —
// the same seeded Site every other webchat e2e spec reuses (a throwaway siteKey can't be
// embedded into the sample site's already-built static HTML). This spec is purely about the
// routing/assignment backend, not the embed UI, so it talks to the public API directly
// rather than driving a browser through the widget.
const DEMO_SITE_KEY = "demo-site-key-please-change";
const WEBCHAT_API_URL = "http://localhost:4315";

test.describe("WebChat auto-assignment fairness", () => {
  test("distributes two consecutive chats round-robin across seeded queue members, not by spare capacity", async ({
    request,
  }) => {
    // Two of General Support's three seeded members (see seed.ts) — deliberately mismatched
    // capacity to prove the reported bug is fixed: the higher-capacity agent must not keep
    // getting picked just because they have more room. The third seeded member
    // (user-frontline-2) is left with no status set, so it stays ineligible and out of the way.
    const highCapacityAgent = "user-1";
    const lowCapacityAgent = "user-frontline-1";
    const conversationIds: string[] = [];

    try {
      const options = await getAgentStatusOptions();
      const available = options.find((o) => o.isAvailableForChats);
      expect(available, "seed data must include an isAvailableForChats status option").toBeTruthy();

      await grantCapacityOverride(highCapacityAgent, 5);
      await grantCapacityOverride(lowCapacityAgent, 1);
      await setAgentStatus(highCapacityAgent, available!.id);
      await setAgentStatus(lowCapacityAgent, available!.id);

      const first = await request.post(`${WEBCHAT_API_URL}/api/public/conversations`, {
        data: { siteKey: DEMO_SITE_KEY, pageUrlPath: "/support.html" },
      });
      const firstBody = await first.json();
      conversationIds.push(firstBody.id);

      const second = await request.post(`${WEBCHAT_API_URL}/api/public/conversations`, {
        data: { siteKey: DEMO_SITE_KEY, pageUrlPath: "/support.html" },
      });
      const secondBody = await second.json();
      conversationIds.push(secondBody.id);

      expect([highCapacityAgent, lowCapacityAgent]).toContain(firstBody.assignedToUserId);
      expect([highCapacityAgent, lowCapacityAgent]).toContain(secondBody.assignedToUserId);
      expect(secondBody.assignedToUserId).not.toBe(firstBody.assignedToUserId);
    } finally {
      for (const id of conversationIds) await deleteConversation(id);
      await deleteCapacityOverride(highCapacityAgent);
      await deleteCapacityOverride(lowCapacityAgent);
      await setAgentStatus(highCapacityAgent, null);
      await setAgentStatus(lowCapacityAgent, null);
    }
  });
});
