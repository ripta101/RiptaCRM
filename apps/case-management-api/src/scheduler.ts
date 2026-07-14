import cron from "node-cron";
import type { ActionDefinition, CaseInstance } from "../generated/prisma";
import type { EmailActionConfig } from "@riptacrm/shared-types";
import { prisma } from "./db";
import { isUniqueConstraintError } from "./lib/prismaErrors";
import { renderTemplate } from "./lib/template";

function computeThreshold(action: ActionDefinition, slaDueAt: Date): Date {
  const offsetMs = action.offsetMinutes * 60 * 1000;
  if (action.trigger === "BEFORE_BREACH") return new Date(slaDueAt.getTime() - offsetMs);
  if (action.trigger === "AFTER_BREACH") return new Date(slaDueAt.getTime() + offsetMs);
  return slaDueAt; // AT_BREACH
}

function resolveRecipient(config: EmailActionConfig, instance: CaseInstance): string {
  if (config.recipientMode === "STATIC") return config.recipientValue ?? "unassigned@example.com";
  return instance.contactEmail ?? "unassigned@example.com";
}

export async function runSchedulerTick(): Promise<{ checked: number; fired: number }> {
  const now = new Date();

  const openHistories = await prisma.caseStageHistory.findMany({
    where: { exitedAt: null },
    include: {
      stage: { include: { actions: true } },
      caseInstance: true,
    },
  });

  let fired = 0;

  for (const history of openHistories) {
    if (history.stage.isTerminal) continue;

    for (const action of history.stage.actions) {
      if (!action.isActive) continue;

      const threshold = computeThreshold(action, history.slaDueAt);
      if (now < threshold) continue;

      const config = JSON.parse(action.configJson) as EmailActionConfig;
      const recipient = resolveRecipient(config, history.caseInstance);
      const tokens = {
        caseId: history.caseInstanceId,
        stageName: history.stage.name,
        dueAt: history.slaDueAt.toISOString(),
      };
      const subject = renderTemplate(config.subjectTemplate, tokens);
      const body = renderTemplate(config.bodyTemplate, tokens);

      try {
        await prisma.actionLogEntry.create({
          data: {
            caseInstanceId: history.caseInstanceId,
            stageHistoryId: history.id,
            actionDefinitionId: action.id,
            trigger: action.trigger,
            actionType: action.actionType,
            recipient,
            subject,
            body,
            simulated: true,
          },
        });
        fired++;
        console.log(
          `[case-management-api] Simulated ${action.actionType} action (${action.trigger}) for case ${history.caseInstanceId}: to=${recipient} subject="${subject}"`,
        );
      } catch (err) {
        if (isUniqueConstraintError(err)) continue; // already fired for this (stageHistory, action) pair
        throw err;
      }
    }

    if (now >= history.slaDueAt && !history.breached) {
      await prisma.caseStageHistory.update({ where: { id: history.id }, data: { breached: true } });
    }
  }

  return { checked: openHistories.length, fired };
}

export function startScheduler() {
  const cronExpr = process.env.SCHEDULER_CRON || "*/1 * * * *";
  cron.schedule(cronExpr, () => {
    runSchedulerTick().catch((err) => {
      console.error("[case-management-api] Scheduler tick failed:", err);
    });
  });
  console.log(`[case-management-api] SLA scheduler started (cron: "${cronExpr}")`);
}
