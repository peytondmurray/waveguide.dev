import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import svgr from "vite-plugin-svgr"

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), cloudflare()],
  optimizeDeps: {
    exclude: ["splat-web"],
  },
  server: {
    fs: {
      // Allow serving files from the linked splat-web package
      allow: [".."],
    },
  },
  assetsInclude: ["**/*.wasm"],
})