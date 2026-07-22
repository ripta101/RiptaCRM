import { defineConfig } from "vite";

// The single script a customer site embeds directly: <script src=".../loader.js"
// data-site-key="..."></script>. Built as a standalone IIFE with zero dependencies (no
// React, no shared chunks) so it's safe to drop into any page regardless of that page's
// own toolchain.
export default defineConfig({
  build: {
    target: "esnext",
    outDir: "dist/loader",
    emptyOutDir: true,
    lib: {
      entry: "src/loader/loader.ts",
      formats: ["iife"],
      name: "RiptaCRMWebChatLoader",
      fileName: () => "loader.js",
    },
  },
});
