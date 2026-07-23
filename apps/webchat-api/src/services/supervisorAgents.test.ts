import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../db";
import { countAgentInteractions } from "./supervisorAgents";

const createdSiteIds: string[] = [];
const createdConversationIds: string[] = [];

afterEach(async () => {
  await prisma.conversation.deleteMany({ where: { id: { in: createdConversationIds.splice(0) } } });
  await prisma.site.deleteMany({ where: { id: { in: createdSiteIds.splice(0) } } });
});

async function setupSite() {
  const site = await prisma.site.create({ data: { name: `Site ${randomUUID()}`, siteKey: `key-${randomUUID()}` } });
  createdSiteIds.push(site.id);
  return site.id;
}

async function createConversation(
  siteId: string,
  assignedToUserId: string,
  overrides: { status?: "OPEN" | "CLOSED"; closedAt?: Date } = {},
) {
  const conversation = await prisma.conversation.create({
    data: { siteId, pageUrlPath: "/support", assignedToUserId, status: overrides.status ?? "OPEN", closedAt: overrides.closedAt },
  });
  createdConversationIds.push(conversation.id);
  return conversation;
}

const RANGE_FROM = new Date("2026-01-01T00:00:00.000Z");
const RANGE_TO = new Date("2026-01-01T23:59:59.999Z");

describe("countAgentInteractions", () => {
  it("counts an OPEN conversation toward active, not answered", async () => {
    const siteId = await setupSite();
    const userId = `user-${randomUUID()}`;
    await createConversation(siteId, userId, { status: "OPEN" });

    const result = await countAgentInteractions([userId], RANGE_FROM, RANGE_TO);
    expect(result.get(userId)).toEqual({ activeInteractionCount: 1, answeredCount: 0 });
  });

  it("counts a CLOSED conversation within range toward answered, not active", async () => {
    const siteId = await setupSite();
    const userId = `user-${randomUUID()}`;
    await createConversation(siteId, userId, { status: "CLOSED", closedAt: new Date("2026-01-01T12:00:00.000Z") });

    const result = await countAgentInteractions([userId], RANGE_FROM, RANGE_TO);
    expect(result.get(userId)).toEqual({ activeInteractionCount: 0, answeredCount: 1 });
  });

  it("includes conversations closed exactly at the range boundaries", async () => {
    const siteId = await setupSite();
    const userId = `user-${randomUUID()}`;
    await createConversation(siteId, userId, { status: "CLOSED", closedAt: RANGE_FROM });
    await createConversation(siteId, userId, { status: "CLOSED", closedAt: RANGE_TO });

    const result = await countAgentInteractions([userId], RANGE_FROM, RANGE_TO);
    expect(result.get(userId)?.answeredCount).toBe(2);
  });

  it("excludes conversations closed just outside the range", async () => {
    const siteId = await setupSite();
    const userId = `user-${randomUUID()}`;
    await createConversation(siteId, userId, { status: "CLOSED", closedAt: new Date(RANGE_FROM.getTime() - 1) });
    await createConversation(siteId, userId, { status: "CLOSED", closedAt: new Date(RANGE_TO.getTime() + 1) });

    const result = await countAgentInteractions([userId], RANGE_FROM, RANGE_TO);
    expect(result.get(userId)?.answeredCount).toBe(0);
  });

  it("still reports 0/0 for a candidate with no conversations at all", async () => {
    const userId = `user-${randomUUID()}`;
    const result = await countAgentInteractions([userId], RANGE_FROM, RANGE_TO);
    expect(result.get(userId)).toEqual({ activeInteractionCount: 0, answeredCount: 0 });
  });

  it("short-circuits to an empty map for an empty candidate list", async () => {
    const result = await countAgentInteractions([], RANGE_FROM, RANGE_TO);
    expect(result.size).toBe(0);
  });
});
