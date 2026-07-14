import { Router } from "express";
import { runSchedulerTick } from "../scheduler";

export const schedulerRouter = Router();

schedulerRouter.post("/scheduler/run-once", async (_req, res) => {
  const result = await runSchedulerTick();
  res.json(result);
});
