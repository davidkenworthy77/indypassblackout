import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" so the built bundle works when served from a subpath.
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 5174,
  },
});
