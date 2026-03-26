import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import svgr from "vite-plugin-svgr"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  assetsInclude: ["**/*.wasm"],
  server: {
    fs: {
      allow: [".", "../splat-web"],
    },
    proxy: {
      "/elevation": {
        target: "https://waveguide.dev",
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
