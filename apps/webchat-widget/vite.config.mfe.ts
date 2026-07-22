import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

// The Module Federation embed path — a customer site that's itself a compatible React+MF
// app can dynamically load this remote directly (via @module-federation/runtime's
// loadRemote(), same as apps/host/src/shell/widgets/DynamicRemote.tsx already does),
// instead of using the <script> loader. Deliberately not part of Host's static remotes map
// — this bundle is meant for arbitrary third-party consumers, not this app's own shell.
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "webChatWidget",
      filename: "remoteEntry.js",
      exposes: {
        "./WebChatWidgetModule": "./src/mfe/WebChatWidgetModule.tsx",
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        "react-dom": { singleton: true, requiredVersion: false },
      },
    }),
  ],
  build: {
    target: "esnext",
    outDir: "dist/mfe",
    emptyOutDir: true,
  },
});
