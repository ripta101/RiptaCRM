import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "caseManagement",
      filename: "remoteEntry.js",
      exposes: {
        "./CaseManagementModule": "./src/CaseManagementModule.tsx",
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        "react-dom": { singleton: true, requiredVersion: false },
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
    port: 5175,
    origin: "http://localhost:5175",
  },
  preview: {
    port: 5175,
  },
});
