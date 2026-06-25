import { defineConfig } from "vite";

// Build a single self-executing bundle: one file the host drops in via
// <script src="indy-widgets.js" data-source="data.json">. CSS is injected by
// the bundle itself (see theme.ts), so there is no separate stylesheet —
// the whole integration surface is one JS file plus the data URL.
export default defineConfig({
  // Serve the canonical data at /data.json in dev, and copy it into dist/ on
  // build, so the bundle + data ship together.
  publicDir: "../data",
  build: {
    lib: {
      entry: "src/main.ts",
      name: "IndyWidgets",
      formats: ["iife"],
      fileName: () => "indy-widgets.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
  },
  server: { port: 5173 },
});
