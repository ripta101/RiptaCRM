import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";

const app = createApp();

describe("POST /api/case-instances/:id/transitions", () => {
  let caseTypeId: string;
  let stageAId: string;
  let stageBId: string;
  let stageCId: string; // reachable from nowhere in this fixture's graph
  let instanceId: string;

  beforeEach(async () => {
    const caseType = await prisma.caseType.create({
      data: {
        key: `test-transitions-${randomUUID()}`,
        name: "Test Transition Case Type",
        versions: {
          create: {
            versionNumber: 1,
            status: "PUBLISHED",
            publishedAt: new Date(),
            stages: {
              create: [
                { key: "a", name: "A", slaMinutes: 60, displayOrder: 0 },
                { key: "b", name: "B", slaMinutes: 60, displayOrder: 1 },
                { key: "c", name: "C", slaMinutes: 60, displayOrder: 2 },
              ],
            },
          },
        },
      },
      include: { versions: { include: { stages: true } } },
    });

    caseTypeId = caseType.id;
    const versionId = caseType.versions[0].id;
    const stages = caseType.versions[0].stages;
    stageAId = stages.find((s) => s.key === "a")!.id;
    stageBId = stages.find((s) => s.key === "b")!.id;
    stageCId = stages.find((s) => s.key === "c")!.id;

    // Only A -> B is configured. A -> C is deliberately absent.
    await prisma.stageTransition.create({ data: { fromStageId: stageAId, toStageId: stageBId } });

    const instance = await prisma.caseInstance.create({
      data: {
        caseTypeId,
        caseTypeVersionId: versionId,
        currentStageId: stageAId,
        stageHistory: {
          create: [{ stageId: stageAId, enteredAt: new Date(), slaDueAt: new Date(Date.now() + 60 * 60 * 1000) }],
        },
      },
    });
    instanceId = instance.id;
  });

  afterEach(async () => {
    await prisma.caseInstance.deleteMany({ where: { caseTypeId } });
    await prisma.caseType.delete({ where: { id: caseTypeId } });
  });

  it("rejects a transition with no configured StageTransition edge", async () => {
    const res = await request(app).post(`/api/case-instances/${instanceId}/transitions`).send({ toStageId: stageCId });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not allowed/i);

    const unchanged = await prisma.caseInstance.findUniqueOrThrow({ where: { id: instanceId } });
    expect(unchanged.currentStageId).toBe(stageAId);
  });

  it("accepts a transition along a configured edge and closes out the prior stage history", async () => {
    const res = await request(app).post(`/api/case-instances/${instanceId}/transitions`).send({ toStageId: stageBId });

    expect(res.status).toBe(200);
    expect(res.body.currentStageId).toBe(stageBId);

    const histories = await prisma.caseStageHistory.findMany({
      where: { caseInstanceId: instanceId },
      orderBy: { enteredAt: "asc" },
    });
    expect(histories).toHaveLength(2);
    expect(histories[0].exitedAt).not.toBeNull();
    expect(histories[1].stageId).toBe(stageBId);
  });

  it("returns 400 when toStageId belongs to a different case type version", async () => {
    const otherCaseType = await prisma.caseType.create({
      data: {
        key: `test-transitions-other-${randomUUID()}`,
        name: "Other Case Type",
        versions: {
          create: {
            versionNumber: 1,
            status: "PUBLISHED",
            publishedAt: new Date(),
            stages: { create: [{ key: "x", name: "X", slaMinutes: 60, displayOrder: 0 }] },
          },
        },
      },
      include: { versions: { include: { stages: true } } },
    });

    try {
      const otherStageId = otherCaseType.versions[0].stages[0].id;
      const res = await request(app)
        .post(`/api/case-instances/${instanceId}/transitions`)
        .send({ toStageId: otherStageId });

      expect(res.status).toBe(400);
    } finally {
      await prisma.caseType.delete({ where: { id: otherCaseType.id } });
    }
  });
});
