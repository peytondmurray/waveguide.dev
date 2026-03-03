import type { MainModule } from "splat-web/splat"
import type { IConfig } from "./config"

type Tile = {
  latMin: number
  latMax: number
  longMin: number
  longMax: number
  phi: number
  lambda: number
  shortHgtName: string
  hgtName: string
  sdfName: string
  sdfHDName: string
}

const radioClimateMap = new Map([
  ["equatorial", 1],
  ["continental_subtropical", 2],
  ["maritime_subtropical", 3],
  ["desert", 4],
  ["continental_temperate", 5],
  ["maritime_temperate_land", 6],
  ["maritime_temperate_sea", 7],
])

const polarizationMap = new Map([
  ["horizontal", 1],
  ["vertical", 2],
])

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
function listTiles(lat: number, long: number, maxRange: number): Tile[] {
  const rEarth = 6378137

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

      tiles.push({
        latMin: phi,
        latMax: phi + 1,
        phi,
        lambda,
        longMin,
        longMax,
        shortHgtName: `${ns}${absPhi}${ew}${absLambda}.hgt.gz`,
        hgtName: `${ns}${absPhi}/${ns}${absPhi}${ew}${absLambda}.hgt.gz`,
        sdfName: `${phi}:${phi + 1}:${longMin}:${longMax}.sdf`,
        sdfHDName: `${phi}:${phi + 1}:${longMin}:${longMax}-hd.sdf`,
      })
    }
  }

  console.log({ tiles })

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
) {
  const tiles = listTiles(lat, long, maxRange)
  let done = 0
  progressCallback({ value: 0, label: "Downloading tiles..." })

  // Mount the IDBFS filesystem to persist the tiles; sync the IDBFS to the emscripten filesystem
  // If this directory already exists, no need to remake it
  if (!mod.FS.analyzePath("/idbfs", true).exists) {
    mod.FS.mkdir("/idbfs")
  }
  mod.FS.mount(mod.IDBFS, {}, "/idbfs")
  await awaitableSyncfs(mod, true)

  // Download and convert all the .hgt.gz -> .sdf. Persist .hgt so that downloads only need to
  // happen as needed
  await Promise.all(
    tiles
      .filter(
        ({ sdfName }) => !mod.FS.analyzePath(`/idbfs/${sdfName}`, true).exists,
      )
      .map(async ({ hgtName, shortHgtName, sdfName }) => {
        let response: Response

        if (mod.FS.analyzePath(`/${shortHgtName}`, true).exists) {
          // If the .hgt.gz exists in the filesystem already, read it as a blob

          const contents = mod.FS.readFile(`/idbfs/${shortHgtName}`, {
            encoding: "binary",
          })
          const blob = new Blob([contents])
          response = new Response(blob)
        } else {
          // Otherwise fetch it from AWS

          response = await fetch(
            `https://s3.amazonaws.com/elevation-tiles-prod/skadi/${hgtName}`,
          )
        }
        await hgtToSdf(mod, shortHgtName, sdfName, await response.blob())
        done++
        progressCallback({
          value: done / tiles.length,
          label: "Downloading tiles...",
        })
      }),
  )

  await awaitableSyncfs(mod, false)
  console.log(mod.FS.readdir("/idbfs"))
  mod.FS.unmount("/idbfs")
}

// https://github.com/whatwg/compression/blob/main/explainer.md
async function hgtToSdf(
  mod: MainModule,
  shortHgtName: string,
  sdfName: string,
  cBlob: Blob,
) {
  const decompressedStream = cBlob
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  const dBlob = await new Response(decompressedStream).blob()

  const decompressedHgtName = shortHgtName.substring(0, shortHgtName.length - 3)
  const mountedHgtName = `/idbfs/${decompressedHgtName}`

  const ab = new Uint8Array(await dBlob.arrayBuffer())
  mod.FS.writeFile(mountedHgtName, ab)
  mod.callMain([mountedHgtName]) // <-- Writes back into the root of the srtm2sdfMod FS

  // Can't just rename between filesystems - need to copy the file contents instead
  const content = mod.FS.readFile(sdfName, { encoding: "binary" })
  mod.FS.writeFile(`/idbfs/${sdfName}`, content)
}

export async function runSplat(mod: MainModule, _config: IConfig) {
  // Mount the IDBFS filesystem to persist the tiles; sync the IDBFS to the emscripten filesystem
  // If this directory already exists, no need to remake it
  if (!mod.FS.analyzePath("/idbfs", true).exists) {
    mod.FS.mkdir("/idbfs")
  }
  mod.FS.mount(mod.IDBFS, {}, "/idbfs")
  await awaitableSyncfs(mod, true)

  // mod.callMain([
  //   "-t",
  //   "tx.qth",
  //   "-L",
  //   config.receiver.heightAGL.toString(),
  //   "-metric",
  //   (config.simulationOptions.maxRange / 1000).toString(),
  //   "-sc",
  //   "-gc",
  //   config.environment.clutterHeight.toString(),
  //   "-ngs",
  //   "-N",
  //   "-o",
  //   "output.ppm",
  //   "-dbm",
  //   "-db",
  //   config.display.minimumSignal.toString(),
  //   "-kml",
  //   "-olditm",
  // ])
  //
  console.log(mod.FS.readdir("/idbfs"))
  console.log(mod.FS.readdir("/"))
}

export async function generateSplatInputs(mod: MainModule, config: IConfig) {
  if (!mod.FS.analyzePath("/idbfs", true).exists) {
    mod.FS.mkdir("/idbfs")
  }
  mod.FS.mount(mod.IDBFS, {}, "/idbfs")
  await awaitableSyncfs(mod, true)

  mod.FS.writeFile(
    "/idbfs/tx.qth",
    [
      "tx",
      config.transmitter.latitude.toFixed(6),
      (360 - config.transmitter.longitude).toFixed(6),
      config.transmitter.heightAGL.toFixed(2),
      "",
    ].join("\n"),
  )

  const climate = radioClimateMap.get(config.environment.radioClimate)
  if (climate === undefined) {
    throw new Error("Undefined value for radio climate")
  }
  const polarization = polarizationMap.get(config.environment.polarization)
  if (polarization === undefined) {
    throw new Error("Undefined value for polarization")
  }

  mod.FS.writeFile("/idbfs/splat.lrp", [
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
  ])

  await awaitableSyncfs(mod, false)
}

function calculateErpWatts(
  txPower: number,
  txGain: number,
  systemLoss: number,
): number {
  return 10 ** ((txPower + txGain - systemLoss - 30) / 10)
}
