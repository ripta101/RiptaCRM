import express from "express";
import cors from "cors";
import { profilesRouter } from "./routes/profiles";
import { usersRouter } from "./routes/users";

export function createApp() {
  const app = express();

  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5177")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(cors({ origin: origins }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", profilesRouter);
  app.use("/api", usersRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}
