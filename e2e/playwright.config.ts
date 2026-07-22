import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // specs share one seeded DB; keep deterministic ordering
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @riptacrm/customer-api run test:e2e:serve",
      cwd: "..",
      url: "http://localhost:4310/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @riptacrm/case-management-api run test:e2e:serve",
      cwd: "..",
      url: "http://localhost:4311/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @riptacrm/auth-api run test:e2e:serve",
      cwd: "..",
      url: "http://localhost:4312/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @riptacrm/access-management-api run test:e2e:serve",
      cwd: "..",
      url: "http://localhost:4314/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @riptacrm/message-broadcast-api run test:e2e:serve",
      cwd: "..",
      url: "http://localhost:4313/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @riptacrm/webchat-api run test:e2e:serve",
      cwd: "..",
      url: "http://localhost:4315/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @riptacrm/message-broadcast run dev",
      cwd: "..",
      url: "http://localhost:5176",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @riptacrm/customer run dev",
      cwd: "..",
      url: "http://localhost:5174",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @riptacrm/case-management run dev",
      cwd: "..",
      url: "http://localhost:5175",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @riptacrm/access-management run dev",
      cwd: "..",
      url: "http://localhost:5177",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @riptacrm/webchat run dev",
      cwd: "..",
      url: "http://localhost:5178",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      // Not a plain `dev` — the widget has no single dev server; `serve` builds all three
      // targets (loader/iframe/mfe) once and serves them together from one static root, so
      // the sample site's real <script> embed and the React/MF embed demo both work as-is.
      command: "pnpm --filter @riptacrm/webchat-widget run test:e2e:serve",
      cwd: "..",
      url: "http://localhost:5179/loader/loader.js",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @riptacrm/webchat-sample-site run dev",
      cwd: "..",
      url: "http://localhost:5180",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm --filter @riptacrm/host run dev",
      cwd: "..",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
