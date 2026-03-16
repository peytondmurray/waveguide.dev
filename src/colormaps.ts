export const viridis = [
  [68, 1, 84],
  [70, 12, 95],
  [71, 24, 106],
  [72, 34, 115],
  [70, 45, 124],
  [68, 55, 129],
  [65, 65, 134],
  [61, 74, 137],
  [57, 84, 139],
  [53, 92, 140],
  [49, 100, 141],
  [46, 108, 142],
  [42, 117, 142],
  [39, 124, 142],
  [36, 132, 141],
  [34, 139, 141],
  [31, 148, 139],
  [30, 155, 137],
  [31, 163, 134],
  [36, 170, 130],
  [46, 178, 124],
  [57, 185, 118],
  [71, 192, 110],
  [87, 198, 101],
  [107, 205, 89],
  [126, 210, 78],
  [146, 215, 65],
  [167, 219, 51],
  [191, 223, 36],
  [212, 225, 26],
  [233, 228, 25],
  [253, 231, 36],
]
export const cividis = [
  [0, 34, 77],
  [0, 40, 91],
  [0, 45, 105],
  [4, 50, 112],
  [28, 56, 110],
  [40, 62, 109],
  [50, 68, 108],
  [59, 73, 107],
  [69, 79, 107],
  [77, 85, 108],
  [84, 90, 108],
  [91, 96, 110],
  [99, 102, 111],
  [106, 108, 113],
  [113, 114, 115],
  [120, 120, 118],
  [128, 126, 120],
  [135, 132, 120],
  [143, 138, 119],
  [151, 144, 118],
  [160, 151, 117],
  [168, 158, 115],
  [176, 164, 112],
  [184, 171, 109],
  [194, 178, 105],
  [202, 185, 100],
  [211, 192, 95],
  [219, 199, 89],
  [229, 207, 80],
  [238, 215, 71],
  [248, 222, 59],
  [253, 231, 55],
]
export const inferno = [
  [0, 0, 3],
  [3, 2, 18],
  [10, 7, 35],
  [20, 11, 54],
  [34, 11, 76],
  [48, 10, 92],
  [62, 9, 102],
  [75, 12, 107],
  [90, 17, 109],
  [102, 21, 110],
  [115, 26, 109],
  [128, 31, 107],
  [142, 36, 104],
  [155, 40, 100],
  [167, 45, 95],
  [180, 51, 88],
  [193, 58, 80],
  [204, 65, 72],
  [214, 74, 63],
  [223, 84, 54],
  [232, 97, 43],
  [239, 109, 33],
  [244, 122, 22],
  [248, 136, 12],
  [251, 153, 6],
  [251, 168, 13],
  [251, 183, 28],
  [249, 199, 47],
  [245, 217, 72],
  [241, 232, 100],
  [242, 244, 133],
  [252, 254, 164],
]
export const magma = [
  [0, 0, 3],
  [3, 3, 17],
  [10, 7, 34],
  [18, 13, 51],
  [30, 16, 73],
  [42, 17, 92],
  [55, 15, 108],
  [69, 15, 118],
  [83, 19, 124],
  [96, 24, 127],
  [108, 29, 128],
  [121, 34, 129],
  [135, 39, 129],
  [148, 43, 128],
  [161, 47, 126],
  [174, 52, 123],
  [189, 57, 119],
  [202, 62, 114],
  [214, 68, 108],
  [225, 76, 102],
  [236, 88, 95],
  [243, 101, 92],
  [247, 115, 92],
  [250, 130, 95],
  [252, 147, 102],
  [253, 162, 111],
  [254, 177, 121],
  [254, 192, 133],
  [253, 209, 147],
  [253, 223, 161],
  [252, 238, 176],
  [251, 252, 191],
]
export const plasma = [
  [12, 7, 134],
  [33, 5, 143],
  [49, 4, 150],
  [63, 3, 156],
  [78, 2, 161],
  [90, 0, 165],
  [103, 0, 167],
  [115, 0, 168],
  [129, 4, 167],
  [140, 10, 164],
  [151, 19, 160],
  [162, 28, 154],
  [173, 38, 146],
  [182, 47, 139],
  [190, 56, 131],
  [198, 65, 124],
  [207, 75, 116],
  [214, 85, 109],
  [220, 94, 102],
  [227, 103, 95],
  [233, 114, 87],
  [238, 124, 80],
  [243, 134, 73],
  [246, 145, 66],
  [250, 157, 58],
  [252, 169, 52],
  [253, 181, 45],
  [253, 193, 40],
  [251, 208, 36],
  [248, 221, 36],
  [244, 234, 38],
  [239, 248, 33],
]

const cm = new Map([
  ["viridis", viridis],
  ["plasma", plasma],
  ["magma", magma],
  ["cividis", cividis],
  ["inferno", inferno],
])

export const Colormaps = [
  "viridis",
  "plasma",
  "magma",
  "cividis",
  "inferno",
] as const
export type Colormap = (typeof Colormaps)[number]

/**
 * Render a number as a string, left padded with zeroes.
 *
 * @param n - Number to pad
 * @param l - Number of digits to left-pad to
 * @returns The left-padded number, as a string
 */
function padNumber(n: number, l: number): string {
  return `${n}`.padStart(l, " ")
}

/**
 * Format a number, left padded with spaces and including a sign (even for positive numbers).
 *
 * @param n - Number to display
 * @param l - Number of digits to left-pad to
 * @returns The left-padded number string, with the sign included (in front of the padding)
 */
function formatPM(n: number, l: number): string {
  if (n >= 0) {
    return `+${padNumber(n, l)}`
  }
  return `-${padNumber(-1 * n, l)}`
}

/**
 * Get the requested colormap as an array of strings, with numbers scaled to the range [min, max]
 *
 * @param cmName - Name of the colormap
 * @param min - Value associated with the minimum value of the colormap
 * @param max - Value associated with the maximum value of the colormap
 * @returns An array of strings of the format
 *  [
 *    "min: R_min, G_min, B_min",
 *    ...
 *    "max: R_max, G_max, B_max"
 *  ]
 */
export function toScaledStringArray(
  cmName: Colormap,
  min: number,
  max: number,
): string[] {
  const cmap = cm.get(cmName) as number[][]
  const step = (max - min) / (cmap.length - 1)

  const linspace: number[] = []
  for (let x = min; x < max; x += step) {
    linspace.push(x)
  }

  return cmap.map(([r, g, b], i) => {
    return `${formatPM(linspace[i], 4)}: ${padNumber(r, 3)}, ${padNumber(g, 3)}, ${padNumber(b, 3)}`
  })
}

// https://en.wikipedia.org/wiki/SRGB#Transfer_function_(%22gamma%22)
function rgbToLin(val: number) {
  // Send this function a decimal sRGB gamma encoded color value
  // between 0.0 and 1.0, and it returns a linearized value.
  if (val <= 0.04045) {
    return val / 12.92
  } else {
    return ((val + 0.055) / 1.055) ** 2.4
  }
}

// https://en.wikipedia.org/wiki/Relative_luminance#Relative_luminance_and_%22gamma_encoded%22_colorspaces
function rgbToYaPixel(rgb: Uint8ClampedArray): number {
  const [sR, sG, sB] = rgb
  const vR = sR / 255
  const vG = sG / 255
  const vB = sB / 255

  return Math.round(
    (0.2126 * rgbToLin(vR) + 0.7152 * rgbToLin(vG) + 0.0722 * rgbToLin(vB)) *
      255,
  )
}

function rgbToY(rgb: Uint8ClampedArray): Uint8ClampedArray {
  const nPixels = rgb.length / 3
  const ya = new Uint8ClampedArray(nPixels)
  for (let i = 0; i < nPixels; i++) {
    ya[i] = rgbToYaPixel(rgb.slice(3 * i, 3 * i + 3))
  }
  return ya
}

/**
 * Binary search the colormap for the index of the cmap entry just below the given number.
 * @param cmap -
 * @param value -
 */
export function binaryLookup(cmap: number[][], value: number): number {
  let l = 0
  let r = cmap.length - 1

  while (l < r) {
    // Round the midpoint up so we never get stuck if the l and r differ by 1
    const m = Math.ceil((r + l) / 2)
    if (cmap[m][0] <= value) {
      l = m
    } else {
      r = m - 1
    }
  }

  return l
}

/**
 * Map a luminance value
 *
 * @param cmap - Mapped colormap: an array of [value, r, g, b] arrays
 * @param value - Luminance value to remap to rgba
 * @returns
 */
function cmapInterpolate(cmap: number[][], value: number): number[] {
  const ilow = binaryLookup(cmap, value)
  if (ilow === 0) {
    return cmap[ilow].slice(1)
  }
  if (ilow === cmap.length - 1) {
    return cmap[cmap.length - 1].slice(1)
  }

  // Get the [value, r, g, b] arrays for the cmal level on either side of the value
  const lowVrgb = cmap[ilow]
  const highVrgb = cmap[ilow + 1]
  const dv = highVrgb[0] - lowVrgb[0]

  // Linearly interpolate between the colors on either side of the value
  const newRgb = new Array(3)
  for (let i = 0, j = 1; i < 3; i++, j++) {
    newRgb[i] =
      lowVrgb[j] + ((value - lowVrgb[0]) * (highVrgb[j] - lowVrgb[j])) / dv
  }
  return newRgb
}

/**
 * @param rgb - RGB data from a ppm file. Colormapped to whatever splat uses by default
 * @param name - Name of the colormap to use for plotting
 * @param minval - Value the minimum of the colormap should be associated to
 * @param maxval - Value the maximum of the colormap should be associated to
 * @returns RGBA data mapped to the chosen linear colormap; null values produced by splat are
 *  set to be transparent
 */
export function toCmap(
  rgb: Uint8ClampedArray,
  name: string,
  minval: number,
  maxval: number,
): Uint8ClampedArray {
  const Y = rgbToY(rgb)

  const cmapData = cm.get(name)
  if (cmapData === undefined) {
    throw new Error(`No colormap exists named ${name}. Aborting.`)
  }
  const step = (maxval - minval) / (cmapData.length - 1)
  const mappedCmap = cmapData.map((tup, i) => [minval + i * step, ...tup])

  const result = new Uint8ClampedArray((4 * rgb.length) / 3)
  let i = 0
  for (const val of Y) {
    const [r, g, b] = cmapInterpolate(mappedCmap, val)
    result[i++] = r
    result[i++] = g
    result[i++] = b
    result[i++] = val === 255 ? 0 : 255
  }
  return result
}

export default cm
