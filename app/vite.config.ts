import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend build. The API (src/endpoints) is bundled separately by scripts/build-vercel-output.mjs.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false },
  server: {
    // Local dev: run the API with `node scripts/dev-api.mjs` (not needed on Vercel).
    proxy: { "/_api": "http://localhost:3001" },
  },
});
