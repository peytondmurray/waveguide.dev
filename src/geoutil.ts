import { XMLParser } from "fast-xml-parser"
import type { SplatModule } from "splat-web/splat"
import { toCmap } from "./colormaps"
import type { IConfig } from "./config"
import type { FSManager } from "./fsManager"
import type { Bounds, Result } from "./result"
import type { Tile } from "./tile"

import {
  clamp0to360,
  degToRad,
  type ProgressUpdate,
  padNumber,
  radToDeg,
} from "./util"

const radioClimateMap = new Map([
  ["equatorial", 1],
  ["continental subtropical", 2],
  ["maritime subtropical", 3],
  ["desert", 4],
  ["continental temperate", 5],
  ["maritime temperate (land)", 6],
  ["maritime temperate (sea)", 7],
])

const polarizationMap = new Map([
  ["horizontal", 1],
  ["vertical", 2],
])

async function toDataUrl(raster: ImageData): Promise<string> {
  const canvas = new OffscreenCanvas(raster.width, raster.height)
  const ctx = canvas.getContext("2d")

  ctx?.putImageData(raster, 0, 0)
  const blob = await canvas.convertToBlob()

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.onabort = () =>
      reject(new Error("Cannot convert the ppm raster to data url"))
    reader.readAsDataURL(blob)
  })
}

function nextNonSpaceByte(arr: Uint8Array, start: number): number {
  let i = start
  while (i < arr.length && [10, 32].includes(arr[i])) {
    i++
  }
  if (i === arr.length) {
    throw new Error("Unable to parse the output ppm file. Aborting.")
  }
  return i
}

function parsePpm(
  arr: Uint8Array,
  config: IConfig,
  progressCallback: (update: ProgressUpdate) => void,
): ImageData {
  // P6\nNx Ny\n255\nRGB data, one byte after another. Spaces or newlines can be repeated.
  // where Nx and Ny are number of pixels in each direction

  // Pass by the first 3 bytes: P6\n
  const decoder = new TextDecoder()
  if (arr.length < 4) {
    throw new Error("Malformed ppm file. Aborting.")
  }
  let i = 3
  progressCallback({ label: "Reading PPM data...", value: 0 })

  // Skip any spaces between 'P6\n' and the next byte representing a number
  // Advance until you reach ' ' or '\n', then slice out the number
  let width: number | null = null
  i = nextNonSpaceByte(arr, i)
  for (let j = i; j < arr.length; j++) {
    if ([10, 32].includes(arr[j])) {
      width = Number.parseInt(decoder.decode(arr.slice(i, j)), 10)
      i = j + 1
      break
    }
  }

  let height: number | null = null
  i = nextNonSpaceByte(arr, i)
  // Advance until you hit ' ' (char code 32) or '\n' (char code 10)
  for (let j = i; j < arr.length; j++) {
    if ([10, 32].includes(arr[j])) {
      height = Number.parseInt(decoder.decode(arr.slice(i, j)), 10)
      i = j + 1
      break
    }
  }

  if (
    width === null ||
    height === null ||
    Number.isNaN(width) ||
    Number.isNaN(height)
  ) {
    throw new Error("Couldn't find width or length of the output.ppm image.")
  }

  i = nextNonSpaceByte(arr, i)
  let maxval: number | null = null
  for (let j = i; j < arr.length; j++) {
    if ([10, 32].includes(arr[j])) {
      maxval = Number.parseInt(decoder.decode(arr.slice(i, j)), 10)
      i = j + 1
      break
    }
  }

  if (maxval === null) {
    throw new Error("Couldn't find max value for the output.ppm image.")
  }

  // ppm image files contain 3-tuples of (r, g, b) values. Each value is 1 byte
  // (if the max value < 256) or 2 bytes (if the max value is anything else)
  // Let's not deal with 2-byte values; splat doesn't seem to use them, and anyway I have
  // enough to worry about
  const valueSize = maxval < 256 ? 1 : 2
  if (valueSize > 1) {
    throw new Error("Multibyte ppms not supported.")
  }

  i = nextNonSpaceByte(arr, i)
  const rgb = Uint8ClampedArray.from(arr.slice(i))
  const cmap = toCmap(rgb, config.display.colormap, 0, maxval)
  if (height * width * 4 !== cmap.length) {
    throw new Error(
      "Height and width of the splat output doesn't match the image pixel array size.",
    )
  }

  progressCallback({ label: "Reading PPM data...", value: 100 })

  // No idea why tsc thinks this isn't valid, but we coerce the type here to make it okay
  return new ImageData(cmap as Uint8ClampedArray<ArrayBuffer>, width, height)
}

/**
 * Calculate the bounding box of tiles some max range surrounding a point.
 *
 * The haversine formula is used here, see https://www.movable-type.co.uk/scripts/latlong.html. To
 * find the longitude bounds, hold ɸ constant and solve for Δλ. To find the latitude bounds, hold λ
 * constant and solve for Δɸ.
 *
 * @param lat - Starting latitude
 * @param long - Starting longitude
 * @param maxRange - Range [m] of tiles to include from the starting latitude/longitude
 * @returns
 */
function listTiles(lat: number, long: number, maxRange: number): Tile[] {
  const rEarth = 6378.137

  const dphi = radToDeg(maxRange / rEarth)
  const dtheta = radToDeg(
    2 * Math.asin(Math.sin(maxRange / (2 * rEarth)) / Math.cos(degToRad(lat))),
  )

  const latitudeBounds = [Math.floor(lat - dphi), Math.ceil(lat + dphi)]
  const longitudeBounds = [Math.floor(long - dtheta), Math.ceil(long + dtheta)]

  const tiles: Tile[] = []
  for (let phi = latitudeBounds[0]; phi < latitudeBounds[1] + 1; phi++) {
    for (
      let lambda = longitudeBounds[0];
      lambda < longitudeBounds[1] + 1;
      lambda++
    ) {
      const ns = phi >= 0 ? "N" : "S"
      const ew = lambda >= 0 ? "E" : "W"

      // For whatever reason, SDF uses a coordinate system which increases towards the West rather
      // than the East, i.e. it increases in the direction of -lambda.
      const longMin = clamp0to360(360 - lambda) - 1 // srtm2sdf treats lambda as upper bound
      const longMax = longMin === 359 ? 0 : longMin + 1

      const absPhi = padNumber(Math.abs(phi).toFixed(0), 2, "0")
      const absLambda = padNumber(Math.abs(lambda).toFixed(0), 3, "0")
      const hgtname = `${ns}${absPhi}${ew}${absLambda}.SRTMGL3S.hgt`
      const ziphgtname = `${hgtname}.zip`
      tiles.push({
        url: `/elevation/${ziphgtname}`,
        hgtname,
        ziphgtname,
        sdfName: `${phi}:${phi + 1}:${longMin}:${longMax}.sdf`,
      })
    }
  }

  return tiles
}

/**
 * Download V3 SRTM data from OpenTopoData to the emscripten filesystem.
 *
 * Documentation about file formats: https://github.com/tilezen/joerd/blob/0b86765156d0612d837548c2cf70376c43b3405c/docs/formats.md
 * We're using the 'skadi' tiles, which are unprojected .hgt files 1°x1° in size. These are
 * essentially gzipped SRTMGL1 tiles. A guide to SRTM data format is here:
 * https://lpdaac.usgs.gov/sites/default/files/public/measures/docs/NASA_SRTM_V3.pdf
 *
 * See https://emscripten.org/docs/api_reference/Filesystem-API.html#proxyfs for documentation about
 * how to mount one module's filesystem into another, which we need for splat and srtm2sdf to work
 * on the same data files.
 *
 * @param mod - The emcripten module for splat (need to write to the FS)
 * @param lat - Latitude to center on
 * @param long - Longitude to center on
 * @param maxRange - Radius [m] around (lat, long) to include tiles from
 */
export async function downloadTiles(
  fsManager: FSManager,
  lat: number,
  long: number,
  maxRange: number,
  progressCallback: (update: ProgressUpdate) => void,
) {
  await fsManager.getSdfs(listTiles(lat, long, maxRange), progressCallback)
}

export async function runSplat(
  fsManager: FSManager,
  mod: SplatModule,
  config: IConfig,
  progressCallback: (update: ProgressUpdate) => void,
): Promise<Result> {
  fsManager.mountAndSync(mod)

  mod.progress = (label: string, val: number, total: number) => {
    progressCallback({ label, value: (100 * val) / total })
  }

  mod.callMain([
    // txsite.qth
    "-t",
    "tx.qth",

    // plot path loss map of TX based on an RX at X feet/meters AGL
    "-L",
    config.receiver.heightAGL.toString(),

    // employ metric rather than imperial units for all user I/O
    "-metric",

    // modify default range for -c or -L (miles/kilometers)
    "-R",
    config.simulationOptions.maxRange.toString(),

    // display smooth rather than quantized contour levels
    "-sc",

    // ground clutter height (feet/meters)
    "-gc",
    config.environment.clutterHeight.toString(),

    // display greyscale topography as white in .ppm files
    "-ngs",

    // do not produce unnecessary site or obstruction reports
    "-N",

    // filename of topographic map to generate (.ppm)
    "-o",
    "output.ppm",

    // plot signal power level contours rather than field strength
    "-dbm",

    // threshold beyond which contours will not be displayed
    "-db",
    config.display.minimumSignal.toString(),

    // generate Google Earth (.kml) compatible output
    "-kml",

    // invoke Longley-Rice rather than the default ITWOM model
    "-olditm",

    // sdf file directory path (overrides path in ~/.splat_path file)
    "-d",
    fsManager.idbfsMountPoint,
  ])

  const raster = parsePpm(
    (await fsManager.readFile(mod, "output.ppm", {
      encoding: "binary",
    })) as Uint8Array,
    config,
    progressCallback,
  )

  return {
    bounds: await getKmlBounds(fsManager, mod),
    config,
    raster,
    dataUrl: await toDataUrl(raster),
  }
}

export async function generateSplatInputs(
  fsManager: FSManager,
  mod: SplatModule,
  config: IConfig,
) {
  const climate = radioClimateMap.get(config.environment.radioClimate)
  if (climate === undefined) {
    throw new Error("Undefined value for radio climate")
  }
  const polarization = polarizationMap.get(config.environment.polarization)
  if (polarization === undefined) {
    throw new Error("Undefined value for polarization")
  }

  const tx = [
    "tx",
    config.transmitter.latitude.toFixed(6),
    clamp0to360(360 - config.transmitter.longitude).toFixed(6),
    config.transmitter.heightAGL.toFixed(2),
    "",
  ].join("\n")
  await fsManager.writeFile(mod, "tx.qth", tx, {})

  const lrp = [
    config.environment.groundDielectric.toFixed(3),
    config.environment.groundConductivity.toFixed(6),
    config.environment.atmosphericBending.toFixed(3),
    config.transmitter.frequency.toFixed(3),
    climate.toString(),
    polarization.toString(),
    (config.simulationOptions.simulationFraction / 100).toFixed(2),
    (config.simulationOptions.timeFraction / 100).toFixed(2),
    calculateErpWatts(
      config.transmitter.power,
      config.transmitter.antennaGain,
      config.receiver.cableLoss,
    ).toFixed(2),
    "",
  ].join("\n")
  await fsManager.writeFile(mod, "splat.lrp", lrp, {})
  await fsManager.syncFS(mod, "MEMFS->IDBFS")
}

function calculateErpWatts(
  txPower: number,
  txGain: number,
  systemLoss: number,
): number {
  return 10 ** ((txPower + txGain - systemLoss - 30) / 10)
}

export async function getKmlBounds(
  fsManager: FSManager,
  mod: SplatModule,
): Promise<Bounds> {
  // Can't use DOMParser on a web worker (whyyyyy????)
  const parser = new XMLParser()
  const { north, south, east, west } = parser.parse(
    (await fsManager.readFile(mod, "output.kml", {
      encoding: "utf8",
    })) as string,
  ).kml.Folder.GroundOverlay.LatLonBox

  return { north, south, east, west }
}
