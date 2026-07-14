import express from "express";
import cors from "cors";
import { caseTypesRouter } from "./routes/caseTypes";
import { caseInstancesRouter } from "./routes/caseInstances";
import { actionLogRouter } from "./routes/actionLog";
import { schedulerRouter } from "./routes/scheduler";

export function createApp() {
  const app = express();

  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5175")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(cors({ origin: origins }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", caseTypesRouter);
  app.use("/api", caseInstancesRouter);
  app.use("/api", actionLogRouter);
  app.use("/api", schedulerRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}
