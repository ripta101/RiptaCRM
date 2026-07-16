import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { prisma } from "../db";

const app = createApp();

describe("DELETE /api/stages/:stageId and /api/stage-transitions/:transitionId", () => {
  let caseTypeId: string;
  let stageAId: string;
  let stageBId: string;
  let transitionId: string;

  beforeEach(async () => {
    const caseType = await prisma.caseType.create({
      data: {
        key: `test-delete-race-${randomUUID()}`,
        name: "Test Delete Race Case Type",
        versions: {
          create: {
            versionNumber: 1,
            status: "DRAFT",
            stages: {
              create: [
                { key: "a", name: "A", slaMinutes: 60, displayOrder: 0 },
                { key: "b", name: "B", slaMinutes: 60, displayOrder: 1 },
              ],
            },
          },
        },
      },
      include: { versions: { include: { stages: true } } },
    });

    caseTypeId = caseType.id;
    const stages = caseType.versions[0].stages;
    stageAId = stages.find((s) => s.key === "a")!.id;
    stageBId = stages.find((s) => s.key === "b")!.id;

    const transition = await prisma.stageTransition.create({
      data: { fromStageId: stageAId, toStageId: stageBId },
    });
    transitionId = transition.id;
  });

  afterEach(async () => {
    await prisma.caseType.delete({ where: { id: caseTypeId } }).catch(() => undefined);
  });

  // Regression test for a real crash: React Flow auto-removes a node's connected edges
  // when you delete it, so a canvas-based stage delete fires DELETE /stages/:id and
  // DELETE /stage-transitions/:id for the connected edge concurrently. The stage delete
  // cascades away the transition row as a side effect, so whichever of the two requests
  // loses the race finds nothing left to delete. Both must still succeed (204), not crash
  // the process with an unhandled "record not found" error.
  it("deleting a stage and its connected transition concurrently both succeed", async () => {
    const [stageRes, transitionRes] = await Promise.all([
      request(app).delete(`/api/stages/${stageAId}`),
      request(app).delete(`/api/stage-transitions/${transitionId}`),
    ]);

    expect(stageRes.status).toBe(204);
    expect(transitionRes.status).toBe(204);

    const remainingStage = await prisma.stageDefinition.findUnique({ where: { id: stageAId } });
    expect(remainingStage).toBeNull();
    const remainingTransition = await prisma.stageTransition.findUnique({ where: { id: transitionId } });
    expect(remainingTransition).toBeNull();
  });

  it("deleting an already-deleted transition returns 204, not an error", async () => {
    const first = await request(app).delete(`/api/stage-transitions/${transitionId}`);
    expect(first.status).toBe(204);

    const second = await request(app).delete(`/api/stage-transitions/${transitionId}`);
    expect(second.status).toBe(204);
  });

  it("deleting an already-deleted stage returns 204, not an error", async () => {
    const first = await request(app).delete(`/api/stages/${stageAId}`);
    expect(first.status).toBe(204);

    const second = await request(app).delete(`/api/stages/${stageAId}`);
    expect(second.status).toBe(204);
  });
});
