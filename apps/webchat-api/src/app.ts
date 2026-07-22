import express from "express";
import cors from "cors";
import { publicCors } from "./lib/originValidator";
import { agentStatusRouter } from "./routes/agentStatus";
import { capacityOverridesRouter } from "./routes/capacityOverrides";
import { conversationsRouter } from "./routes/conversations";
import { publicRouter } from "./routes/public";
import { routingRulesRouter } from "./routes/routingRules";
import { sitesRouter } from "./routes/sites";
import { queuesRouter } from "./routes/queues";
import { usersRouter } from "./routes/users";

export function createApp() {
  const app = express();

  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5178")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Widget-facing routes — no requirePermission() (there's no logged-in visitor), a
  // per-Site dynamic CORS origin check instead of the fixed allowlist below, and rate
  // limiting. Mounted first, and deliberately never touches the admin/agent routers'
  // fixed-allowlist cors() — see lib/originValidator.ts and routes/public.ts.
  app.use("/api/public", cors(publicCors), publicRouter);

  // Admin + agent routes — same locked-down posture as every other backend (fixed CORS
  // allowlist, requirePermission on every route).
  app.use("/api", cors({ origin: origins }), sitesRouter);
  app.use("/api", cors({ origin: origins }), queuesRouter);
  app.use("/api", cors({ origin: origins }), routingRulesRouter);
  app.use("/api", cors({ origin: origins }), capacityOverridesRouter);
  app.use("/api", cors({ origin: origins }), agentStatusRouter);
  app.use("/api", cors({ origin: origins }), conversationsRouter);
  app.use("/api", cors({ origin: origins }), usersRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}
