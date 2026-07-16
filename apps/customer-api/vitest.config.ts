import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Tests share one throwaway SQLite file (prisma/test.db) — serialize test files to
    // avoid SQLITE_BUSY errors from concurrent writers.
    fileParallelism: false,
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
