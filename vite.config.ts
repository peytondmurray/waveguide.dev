import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import svgr from "vite-plugin-svgr"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  optimizeDeps: {
    exclude: ["splat-web"],
  },
  assetsInclude: ["**/*.wasm"],
  server: {
    proxy: {
      "/elevation": {
        target: "https://waveguide.dev",
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
