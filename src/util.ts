import type { MainModule } from "splat-web/splat"

type Tile = {
  latMin: number
  latMax: number
  longMin: number
  longMax: number
  hgtName: string
  sdfName: string
  sdfHDName: string
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

      // SDF files clamp the longitude to the interval (-180, 180) rather than using E/W
      const longMin = lambda < 0 ? 360 - lambda : lambda
      const longMax = longMin === 359 ? 0 : longMin + 1

      const absPhi = Math.abs(phi).toFixed(0)
      const absLambda = Math.abs(lambda).toFixed(0)

      tiles.push({
        latMin: phi,
        latMax: phi + 1,
        longMin,
        longMax,
        hgtName: `${ns}${absPhi}/${ns}${absPhi}${ew}${absLambda}.hgt.gz`,
        sdfName: `${phi}:${phi + 1}:${longMin}:${longMax}.sdf`,
        sdfHDName: `${phi}:${phi + 1}:${longMin}:${longMax}-hd.sdf`,
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
  splatMod: MainModule,
  srtm2sdfMod: MainModule,
  lat: number,
  long: number,
  maxRange: number,
) {
  const tiles = listTiles(lat, long, maxRange)
  await Promise.all(
    tiles
      .filter(({ hgtName }) => !splatMod.FS.analyzePath(hgtName, true).exists)
      .map(async ({ hgtName, sdfName }) => {
        const response = await fetch(
          `https://s3.amazonaws.com/elevation-tiles-prod/skadi/${hgtName}`,
        )
        await hgtToSdf(
          splatMod,
          srtm2sdfMod,
          hgtName,
          sdfName,
          await response.blob(),
        )
      }),
  )
}

// https://github.com/whatwg/compression/blob/main/explainer.md
async function hgtToSdf(
  splatMod: MainModule,
  srtm2sdfMod: MainModule,
  hgtName: string,
  sdfName: string,
  cBlob: Blob,
) {
  const decompressedStream = cBlob
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  const dBlob = await new Response(decompressedStream).blob()

  const decompressedHgtName = hgtName.substring(0, hgtName.length - 3)
  const mountedHgtName = `/fs1/${decompressedHgtName}`

  srtm2sdfMod.FS.mkdir("/fs1")
  srtm2sdfMod.FS.mount(
    srtm2sdfMod.PROXYFS,
    {
      root: "/",
      fs: splatMod.FS,
    },
    "/fs1",
  )

  // TODO: Two things:
  // 1. `mountedHgtName` contains slashes, e.g. 'N41/N41W120.hgt'
  // 2. Whatever dBlob.arrayBuffer() is, it FS.writeFile doesn't accept it
  srtm2sdfMod.FS.writeFile(mountedHgtName, await dBlob.arrayBuffer())
  console.log(`SRTM file created at ${mountedHgtName}`)
  srtm2sdfMod.callMain([mountedHgtName]) // <-- Writes back into the root of the (mounted) splat FS
  console.log(`SDF file created at ${sdfName}`)
  console.log(splatMod.FS.analyzePath(sdfName, true))
  srtm2sdfMod.FS.unmount("/fs1")
}
