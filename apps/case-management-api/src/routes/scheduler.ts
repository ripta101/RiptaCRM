import { Router } from "express";
import { runSchedulerTick } from "../scheduler";
import { requirePermission } from "../lib/requirePermission";

export const schedulerRouter = Router();

schedulerRouter.post("/scheduler/run-once", requirePermission(), async (_req, res) => {
  try {
    const result = await runSchedulerTick();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Scheduler tick failed." });
  }
});
