export type ProgressUpdate = {
  value: number
  label: string
}

/**
 * Render a number or string as a string, left padded with a string.
 *
 * @param n - Number or string to pad
 * @param l - Number of digits to left-pad to
 * @param fillString - String to pad with
 * @returns The left-padded number, as a string
 */
export function padNumber(
  n: number | string,
  l: number,
  fillString?: string,
): string {
  let str = ""
  if (typeof n === "number") {
    str = `${n}`
  } else {
    str = n
  }
  return str.padStart(l, fillString)
}

/**
 * Convert degrees to radians.
 *
 * @param deg - Degrees to convert to radians
 * @returns Radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Convert radians to degrees.
 *
 * @param rad - Radians to convert to degrees
 * @returns Degrees
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function clamp0to360(a: number): number {
  if (a > 360) {
    return clamp0to360(a - 360)
  } else if (a < 0) {
    return clamp0to360(a + 360)
  } else {
    return a
  }
}
