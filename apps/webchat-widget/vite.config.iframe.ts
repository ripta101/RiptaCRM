import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The plain SPA an embed's floating bubble opens inside a hidden <iframe> — reads its
// siteKey from its own URL query string (see src/iframe/WidgetApp.tsx). No Module
// Federation here; this is the primary/default embed path (works on any site regardless
// of tech stack), served standalone.
export default defineConfig({
  plugins: [react()],
  build: {
    target: "esnext",
    outDir: "dist/iframe",
    emptyOutDir: true,
  },
  base: "./",
  server: {
    port: 5179,
  },
  preview: {
    port: 5179,
  },
});
