import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { runSchedulerTick } from "./scheduler";

function emailConfig(recipientValue: string): string {
  return JSON.stringify({
    subjectTemplate: "Subject {{caseId}}",
    bodyTemplate: "Body {{caseId}} due {{dueAt}} in {{stageName}}",
    recipientMode: "STATIC",
    recipientValue,
  });
}

describe("runSchedulerTick", () => {
  let caseTypeId: string;
  let versionId: string;
  let stageId: string;

  beforeEach(async () => {
    const caseType = await prisma.caseType.create({
      data: {
        key: `test-scheduler-${randomUUID()}`,
        name: "Test Scheduler Case Type",
        versions: {
          create: {
            versionNumber: 1,
            status: "PUBLISHED",
            publishedAt: new Date(),
            stages: {
              create: {
                key: "stage-1",
                name: "Stage 1",
                slaMinutes: 60,
                displayOrder: 0,
                actions: {
                  create: [
                    { trigger: "BEFORE_BREACH", offsetMinutes: 15, configJson: emailConfig("before@example.com") },
                    { trigger: "AT_BREACH", offsetMinutes: 0, configJson: emailConfig("at@example.com") },
                    { trigger: "AFTER_BREACH", offsetMinutes: 30, configJson: emailConfig("after@example.com") },
                  ],
                },
              },
            },
          },
        },
      },
      include: { versions: { include: { stages: { include: { actions: true } } } } },
    });

    caseTypeId = caseType.id;
    versionId = caseType.versions[0].id;
    stageId = caseType.versions[0].stages[0].id;
  });

  afterEach(async () => {
    // Deleting the CaseInstance(s) cascades stageHistory/fieldValues/actionLogEntries;
    // deleting the CaseType cascades version/stage/action/transition definitions.
    await prisma.caseInstance.deleteMany({ where: { caseTypeId } });
    await prisma.caseType.delete({ where: { id: caseTypeId } });
  });

  async function createInstance(slaOffsetMinutes: number) {
    const now = new Date();
    const slaDueAt = new Date(now.getTime() + slaOffsetMinutes * 60 * 1000);
    return prisma.caseInstance.create({
      data: {
        caseTypeId,
        caseTypeVersionId: versionId,
        currentStageId: stageId,
        contactEmail: "customer@example.com",
        stageHistory: { create: [{ stageId, enteredAt: now, slaDueAt }] },
      },
    });
  }

  it("fires only BEFORE_BREACH once its offset window has been entered", async () => {
    // SLA due in 10 min; BEFORE_BREACH offset is 15 min => threshold (due - 15min) already
    // passed. AT_BREACH threshold (due) and AFTER_BREACH threshold (due + 30min) have not.
    const instance = await createInstance(10);

    await runSchedulerTick();

    const entries = await prisma.actionLogEntry.findMany({ where: { caseInstanceId: instance.id } });
    expect(entries).toHaveLength(1);
    expect(entries[0].trigger).toBe("BEFORE_BREACH");
    expect(entries[0].recipient).toBe("before@example.com");
  });

  it("fires BEFORE_BREACH and AT_BREACH, and marks the stage history breached, once overdue", async () => {
    const instance = await createInstance(-1); // 1 minute overdue

    await runSchedulerTick();

    const entries = await prisma.actionLogEntry.findMany({
      where: { caseInstanceId: instance.id },
      orderBy: { trigger: "asc" },
    });
    expect(entries.map((e) => e.trigger).sort()).toEqual(["AT_BREACH", "BEFORE_BREACH"]);

    const history = await prisma.caseStageHistory.findFirstOrThrow({ where: { caseInstanceId: instance.id } });
    expect(history.breached).toBe(true);
  });

  it("does not create duplicate ActionLogEntry rows on a second tick (idempotency)", async () => {
    const instance = await createInstance(-1);

    await runSchedulerTick();
    const afterFirstTick = await prisma.actionLogEntry.findMany({ where: { caseInstanceId: instance.id } });

    await runSchedulerTick();
    const afterSecondTick = await prisma.actionLogEntry.findMany({ where: { caseInstanceId: instance.id } });

    expect(afterSecondTick).toHaveLength(afterFirstTick.length);
    // Relies on the @@unique([stageHistoryId, actionDefinitionId]) constraint + the
    // isUniqueConstraintError catch-and-continue in runSchedulerTick, not a pre-check query.
  });

  it("does not fire actions on a terminal stage even if overdue", async () => {
    const terminalStage = await prisma.stageDefinition.create({
      data: {
        caseTypeVersionId: versionId,
        key: "terminal-stage",
        name: "Terminal Stage",
        slaMinutes: 60,
        isTerminal: true,
        displayOrder: 1,
        actions: { create: [{ trigger: "AT_BREACH", offsetMinutes: 0, configJson: emailConfig("terminal@example.com") }] },
      },
    });

    const now = new Date();
    const instance = await prisma.caseInstance.create({
      data: {
        caseTypeId,
        caseTypeVersionId: versionId,
        currentStageId: terminalStage.id,
        status: "CLOSED",
        stageHistory: {
          create: [{ stageId: terminalStage.id, enteredAt: now, slaDueAt: new Date(now.getTime() - 60 * 1000) }],
        },
      },
    });

    await runSchedulerTick();

    const entries = await prisma.actionLogEntry.findMany({ where: { caseInstanceId: instance.id } });
    expect(entries).toHaveLength(0);
  });
});
