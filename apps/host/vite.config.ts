import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

// Module Federation host config. No remotes are registered yet — this
// increment only builds the shell. Future epic modules (Email, WebChat,
// Case Management) get added here as entries under `remotes`.
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "host",
      remotes: {
        customer: {
          type: "module",
          name: "customer",
          entry: "http://localhost:5174/remoteEntry.js",
          entryGlobalName: "customer",
          shareScope: "default",
        },
        caseManagement: {
          type: "module",
          name: "caseManagement",
          entry: "http://localhost:5175/remoteEntry.js",
          entryGlobalName: "caseManagement",
          shareScope: "default",
        },
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        "react-dom": { singleton: true, requiredVersion: false },
        "react-router-dom": { singleton: true, requiredVersion: false },
        "@mui/material": { singleton: true, requiredVersion: false },
        "@emotion/react": { singleton: true, requiredVersion: false },
        "@emotion/styled": { singleton: true, requiredVersion: false },
      },
    }),
  ],
  build: {
    target: "esnext",
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 5173,
  },
});
