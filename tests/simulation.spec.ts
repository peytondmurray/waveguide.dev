import fs from "node:fs"
import path from "node:path"
import { expect, test } from "@playwright/test"

test("Run Simulation produces a map overlay", async ({ page }) => {
  await page.goto("/")

  // Wait for the app and WASM modules to finish initializing
  const runButton = page.getByRole("button", { name: "Run Simulation" })
  await expect(runButton).toBeVisible({ timeout: 30_000 })

  await runButton.click()

  // Wait for the simulation to complete. The WASM engine + tile downloads can
  // take several minutes, so use the full test timeout here.
  // Completion is signalled by an <img> with a data: URL appearing inside the
  // Leaflet overlay pane (react-leaflet renders ImageOverlay as an <img>).
  const overlayImg = page
    .locator(".leaflet-overlay-pane img")
    .filter({ hasNot: page.locator('[src=""]') })
  await expect(overlayImg).toBeAttached({ timeout: 300_000 })

  // Save a screenshot of the map
  const outDir = path.join("test-results")
  fs.mkdirSync(outDir, { recursive: true })
  await page.locator("#map-wrapper").screenshot({
    path: path.join(outDir, "simulation-map.png"),
  })
})
