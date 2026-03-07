import { describe, expect, it } from "vitest"

import { binaryLookup, viridis } from "./colormaps"

describe("binaryLookup", () => {
  const step = 1 / (viridis.length - 1)

  const cmap = viridis.map((rgb, i) => [i * step, ...rgb])

  it("should find the first value", () => {
    expect(binaryLookup(cmap, 0)).toBe(0)
  })

  it("should handle less than the first value", () => {
    expect(binaryLookup(cmap, -2)).toBe(0)
  })

  it("should handle the last value", () => {
    expect(binaryLookup(cmap, 1)).toBe(cmap.length - 1)
  })

  it("should handle less more than the last value", () => {
    expect(binaryLookup(cmap, 3)).toBe(cmap.length - 1)
  })

  for (let i = 0; i < cmap.length; i++) {
    it(`should find the index of the value just to the left of the value in the colormap: ${i}`, () => {
      const result = binaryLookup(cmap, (i + 0.5) * step)
      expect(cmap[result][0]).toBeLessThanOrEqual(cmap[i][0])
    })
  }
})
