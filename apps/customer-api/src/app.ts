import express from "express";
import cors from "cors";
import { customersRouter } from "./routes/customers";
import { caseTypesRouter } from "./routes/caseTypes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: ["http://localhost:5173", "http://localhost:5174"],
    }),
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/customers", customersRouter);
  app.use("/api", caseTypesRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}
