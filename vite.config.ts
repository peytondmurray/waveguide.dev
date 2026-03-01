import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
