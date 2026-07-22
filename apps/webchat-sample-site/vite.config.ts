import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A deliberately plain, non-React-by-default, non-Module-Federation multi-page site (three
// of its four pages are static HTML) — most real customer sites embedding a chat widget
// aren't built with this app's own stack, and the primary embed path (the <script> loader)
// needs to be demoed working on exactly that kind of site. The fourth page
// (react-embed-demo.html) is the exception, demonstrating the Module Federation embed path.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
  },
  preview: {
    port: 5180,
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        pricing: resolve(__dirname, "pricing.html"),
        support: resolve(__dirname, "support.html"),
        reactEmbedDemo: resolve(__dirname, "react-embed-demo.html"),
      },
    },
  },
});
