import { BlobReader, type FileEntry, ZipReader } from "@zip.js/zip.js"
import type { MainModule } from "splat-web/splat"
import { toCmap } from "./colormaps"
import type { IConfig } from "./config"
import type { Bounds, Result } from "./result"

type Tile = {
  filename: string
  url: string
  sdfName: string
}

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

function toDataUrl(raster: ImageData): string {
  const canvas = document.createElement("canvas")
  canvas.width = raster.width
  canvas.height = raster.height

  const ctx = canvas.getContext("2d")
  ctx?.putImageData(raster, 0, 0)
  return canvas.toDataURL()
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

function parsePpm(arr: Uint8Array): ImageData {
  // P6\n2400 2400\n255\nRGB data, one byte after another. Spaces or newlines can be repeated.

  // Pass by the first 3 bytes: P6\n
  // Read until space
  const decoder = new TextDecoder()

  if (arr.length < 4) {
    throw new Error("Malformed ppm file. Aborting.")
  }
  let i = 3
  let width: number | null = null

  // Skip any spaces between 'P6\n' and the next byte representing a number
  // Advance until you reach ' ' or '\n', then slice out the number
  i = nextNonSpaceByte(arr, i)
  for (let j = i; j < arr.length; j++) {
    if ([10, 32].includes(arr[j])) {
      width = Number.parseInt(decoder.decode(arr.slice(i, j)), 10)
      i = j + 1
      break
    }
  }

  i = nextNonSpaceByte(arr, i)
  let height: number | null = null
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
  const valueSize = maxval < 256 ? 1 : 2

  i = nextNonSpaceByte(arr, i)
  // const nVals = (arr.length - j)/(3*valueSize)
  // const rgb = new Array(nVals)

  let rgb: Uint8ClampedArray
  if (valueSize === 1) {
    rgb = Uint8ClampedArray.from(arr.slice(i))
  } else {
    throw new Error("Multibyte ppms not supported.")
  }

  const cmap = toCmap(rgb, "magma", 0, maxval)

  if (height * width * 4 !== cmap.length) {
    throw new Error(
      "Height and width of the splat output doesn't match the image pixel array size.",
    )
  }
  return new ImageData(cmap, width, height, { pixelFormat: "rgba-unorm8" })
}

/**
 * Convert degrees to radians.
 *
 * @param deg - Degrees to convert to radians
 * @returns Radians
 */
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Convert radians to degrees.
 *
 * @param rad - Radians to convert to degrees
 * @returns Degrees
 */
function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
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
function listTiles(
  lat: number,
  long: number,
  maxRange: number,
  source: "aws" | "fasma",
): Tile[] {
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

      const absPhi = Math.abs(phi).toFixed(0)
      const absLambda = Math.abs(lambda).toFixed(0)

      let filename: string
      let url: string
      if (source === "aws") {
        filename = `${ns}${absPhi}${ew}${absLambda}.hgt.gz`
        url = `https://s3.amazonaws.com/elevation-tiles-prod/skadi/${ns}${absPhi}/${filename}`
      } else {
        filename = `${ns}${absPhi}${ew}${absLambda}.SRTMGL3S.hgt.zip`
        // url = `https://srtm.fasma.org/${filename}`
        url = `http://localhost:5173/${filename}`
      }

      tiles.push({
        filename,
        url,
        sdfName: `${phi}:${phi + 1}:${longMin}:${longMax}.sdf`,
      })
    }
  }

  return tiles
}

function clamp0to360(a: number): number {
  if (a > 360) {
    return clamp0to360(a - 360)
  } else if (a < 0) {
    return clamp0to360(a + 360)
  } else {
    return a
  }
}

/**
 * A version of FS.syncfs that you can await.
 *
 * See https://github.com/emscripten-core/emscripten/issues/18306#issuecomment-1502710013
 *
 * @param mod - Emscripten module whose filesystem is to be synced
 * @param b - If true, sync from IDBFS to MEMFS. If false, write MEMFS to IDBFS
 * @returns A promise that resolves when syncing is done
 */
async function awaitableSyncfs(mod: MainModule, b: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    mod.FS.syncfs(b, (err: Error) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
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
  mod: MainModule,
  lat: number,
  long: number,
  maxRange: number,
  progressCallback: ({
    value,
    label,
  }: {
    value: number
    label: string
  }) => void,
  source: "aws" | "fasma",
) {
  // Mount the IDBFS filesystem to persist the tiles; sync the IDBFS to the emscripten filesystem
  // If this directory already exists, no need to remake it
  if (!mod.FS.analyzePath("/idbfs", true).exists) {
    mod.FS.mkdir("/idbfs")
  }
  mod.FS.mount(mod.IDBFS, {}, "/idbfs")
  await awaitableSyncfs(mod, true)

  // Generate the subdirectories for aws and fasma
  if (!mod.FS.analyzePath("/idbfs/aws", true).exists) {
    mod.FS.mkdir("/idbfs/aws")
  }
  if (!mod.FS.analyzePath("/idbfs/fasma", true).exists) {
    mod.FS.mkdir("/idbfs/fasma")
  }

  let done = 0
  progressCallback({ value: 0, label: "Downloading tiles..." })
  const tiles = listTiles(lat, long, maxRange, source)

  // Download and convert all the .hgt.{gz,zip} -> .sdf. Persist .hgt so that downloads only need to
  // happen as needed
  await Promise.all(
    tiles
      .filter(
        ({ sdfName }) =>
          !mod.FS.analyzePath(`/idbfs/${source}/${sdfName}`, true).exists,
      )
      .map(async ({ filename, url, sdfName }) => {
        let response: Response

        if (mod.FS.analyzePath(`/idbfs/${source}/${filename}`, true).exists) {
          // If the .hgt.gz exists in the filesystem already, read it as a blob

          const contents = mod.FS.readFile(`/idbfs/${source}/${filename}`, {
            encoding: "binary",
          })
          const blob = new Blob([contents])
          response = new Response(blob)
        } else {
          // Otherwise fetch it from AWS
          response = await fetch(url)
        }
        await hgtToSdf(mod, filename, sdfName, await response.blob(), source)
        done++
        progressCallback({
          value: done / tiles.length,
          label: "Downloading tiles...",
        })
      }),
  )

  await awaitableSyncfs(mod, false)
  mod.FS.unmount("/idbfs")
}

async function ungz(blob: Blob): Promise<Uint8Array> {
  const decompressedStream = blob
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  const dBlob = await new Response(decompressedStream).blob()

  return new Uint8Array(await dBlob.arrayBuffer())
}

async function unzip(blob: Blob): Promise<Uint8Array> {
  // https://github.com/gildas-lormeau/zip.js
  const zipFileReader = new BlobReader(blob)

  const zipReader = new ZipReader(zipFileReader)
  const firstEntry = (await zipReader.getEntries()).shift()
  if (firstEntry === undefined) {
    return new Uint8Array()
  }
  if (firstEntry.directory) {
    throw new Error("Unrecognized format for .hgt.zip file.")
  }
  const buf = await (firstEntry as FileEntry).arrayBuffer()
  await zipReader.close()

  return new Uint8Array(buf)
}

function getSuffix(filename: string): string {
  const splits = filename.split(".")
  return splits[splits.length - 1]
}

// https://github.com/whatwg/compression/blob/main/explainer.md
async function hgtToSdf(
  mod: MainModule,
  filename: string,
  sdfName: string,
  cBlob: Blob,
  source: "aws" | "fasma",
) {
  let ab: Uint8Array
  if (source === "aws") {
    ab = await ungz(cBlob)
  } else {
    ab = await unzip(cBlob)
  }

  const ext = getSuffix(filename)
  const decompressedHgtName = filename.substring(
    0,
    filename.length - ext.length,
  )
  const mountedHgtName = `/idbfs/${source}/${decompressedHgtName}`

  mod.FS.writeFile(mountedHgtName, ab)
  mod.callMain([mountedHgtName]) // <-- Writes back into the root of the FS

  // Can't just rename between filesystems - need to copy the file contents instead
  const content = mod.FS.readFile(sdfName, { encoding: "binary" })
  mod.FS.writeFile(`/idbfs/${source}/${sdfName}`, content)
}

export async function runSplat(
  mod: MainModule,
  config: IConfig,
  _source: "aws" | "fasma",
): Promise<Result> {
  console.log("Syncing the IDBFS filesystem...")
  // Mount the IDBFS filesystem to persist the tiles; sync the IDBFS to the emscripten filesystem
  // If this directory already exists, no need to remake it
  if (!mod.FS.analyzePath("/idbfs", true).exists) {
    mod.FS.mkdir("/idbfs")
  }
  mod.FS.mount(mod.IDBFS, {}, "/idbfs")
  await awaitableSyncfs(mod, true)

  try {
    console.log("Running splat...")

    // mod.callMain([
    //   // txsite.qth
    //   "-t",
    //   "tx.qth",
    //
    //   // plot path loss map of TX based on an RX at X feet/meters AGL
    //   "-L",
    //   config.receiver.heightAGL.toString(),
    //
    //   // employ metric rather than imperial units for all user I/O
    //   "-metric",
    //
    //   // modify default range for -c or -L (miles/kilometers)
    //   "-R",
    //   config.simulationOptions.maxRange.toString(),
    //
    //   // display smooth rather than quantized contour levels
    //   "-sc",
    //
    //   // ground clutter height (feet/meters)
    //   "-gc",
    //   config.environment.clutterHeight.toString(),
    //
    //   // display greyscale topography as white in .ppm files
    //   "-ngs",
    //
    //   // do not produce unnecessary site or obstruction reports
    //   "-N",
    //
    //   // filename of topographic map to generate (.ppm)
    //   "-o",
    //   "output.ppm",
    //
    //   // plot signal power level contours rather than field strength
    //   "-dbm",
    //
    //   // threshold beyond which contours will not be displayed
    //   "-db",
    //   config.display.minimumSignal.toString(),
    //
    //   // generate Google Earth (.kml) compatible output
    //   "-kml",
    //
    //   // invoke Longley-Rice rather than the default ITWOM model
    //   "-olditm",
    //
    //   // sdf file directory path (overrides path in ~/.splat_path file)
    //   "-d",
    //   `/idbfs/${source}`,
    // ])

    const raster = parsePpm(
      await (await fetch("http://localhost:5173/output.ppm")).bytes(),
    )

    return {
      bounds: await getKmlBounds(mod),
      config,
      raster,
      dataUrl: toDataUrl(raster),
    }
  } finally {
    mod.FS.unmount("/idbfs")
  }
}

export async function generateSplatInputs(mod: MainModule, config: IConfig) {
  const tx = [
    "tx",
    config.transmitter.latitude.toFixed(6),
    clamp0to360(360 - config.transmitter.longitude).toFixed(6),
    config.transmitter.heightAGL.toFixed(2),
    "",
  ].join("\n")

  mod.FS.writeFile("tx.qth", tx)

  const climate = radioClimateMap.get(config.environment.radioClimate)
  if (climate === undefined) {
    throw new Error("Undefined value for radio climate")
  }
  const polarization = polarizationMap.get(config.environment.polarization)
  if (polarization === undefined) {
    throw new Error("Undefined value for polarization")
  }

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

  mod.FS.writeFile("splat.lrp", lrp)

  // const ssa = [
  //   "; SPLAT! Auto-generated DBM Signal Level Color Definition",
  //   ";",
  //   "; Format: dBm: red, green, blue",
  //   ";",
  // ]
  //   .concat(
  //     toScaledStringArray(
  //       config.display.colormap,
  //       config.display.minimumSignal,
  //       config.display.maximumSignal,
  //     ),
  //   )
  //   .concat("")
  //   .join("\n")
  //
  // mod.FS.writeFile("splat.dcf", ssa)
  await awaitableSyncfs(mod, false)
}

function calculateErpWatts(
  txPower: number,
  txGain: number,
  systemLoss: number,
): number {
  return 10 ** ((txPower + txGain - systemLoss - 30) / 10)
}

export async function getKmlBounds(_mod: MainModule): Promise<Bounds> {
  const doc = new DOMParser().parseFromString(
    await (await fetch("http://localhost:5173/output.kml")).text(),
    "text/xml",
  )

  // const doc = new DOMParser().parseFromString(
  //   mod.FS.readFile("output.kml", { encoding: "utf8" }) as unknown as string,
  //   "text/xml",
  // )

  return {
    north: Number.parseFloat(doc.getElementsByTagName("north")[0].textContent),
    south: Number.parseFloat(doc.getElementsByTagName("south")[0].textContent),
    east: Number.parseFloat(doc.getElementsByTagName("east")[0].textContent),
    west: Number.parseFloat(doc.getElementsByTagName("west")[0].textContent),
  }
}
