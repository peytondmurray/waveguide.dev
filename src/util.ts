import { type MainModule } from "splat-web"

type Tile = {
  latMin: number
  latMax: number
  longMin: number
  longMax: number
  hgtName: string
  sdfName: string
  sdfHDName: string
}

function degToRad(deg: number): number {
  return deg*Math.PI/180
}

function radToDeg(rad: number): number {
  return rad*180/Math.PI
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
export function getTiles(lat: number, long: number, maxRange: number): Tile[] {
  const rEarth = 6378137

  const dphi = radToDeg(maxRange / rEarth)
  const dtheta = radToDeg(2*Math.asin(Math.sin(maxRange / (2* rEarth)) / Math.cos(degToRad(lat))))

  const latitudeBounds = [Math.floor(lat - dphi), Math.ceil(lat + dphi)]
  const longitudeBounds = [Math.floor(long - dtheta), Math.ceil(long + dtheta)]

  let tiles: Tile[] = []
  for (let phi = latitudeBounds[0]; phi<latitudeBounds[1]+1; phi++) {
    for (let lambda = longitudeBounds[0]; lambda<longitudeBounds[1]+1; lambda++) {
      const ns = phi >= 0 ? "N" : "S"
      const ew = lambda >= 0 ? "E" : "W"

      // SDF files clamp the longitude to the interval (-180, 180) rather than using E/W
      const longMin = lambda < 0 ? 360 - lambda : lambda
      const longMax = longMin == 359 ? 0 : longMin + 1

      tiles.push({
        latMin: phi,
        latMax: phi+1,
        longMin,
        longMax,
        hgtName: `${ns}${Math.abs(phi).toFixed(2)}${ew}${Math.abs(lambda).toFixed(3)}.hgt.gz`,
        sdfName: `${phi}:${phi+1}:${longMin}:${longMax}.sdf`,
        sdfHDName: `${phi}:${phi+1}:${longMin}:${longMax}-hd.sdf`,
      })
    }
  }

  return tiles
}

/**
 * Download V3 SRTM data from OpenTopoData
 *
 * @param mod - The emcripten module for splat (need to write to the FS)
 * @param lat - Latitude to center on
 * @param long - Longitude to center on
 * @param maxRange - Radius [m] around (lat, long) to include tiles from
 */
export async function downloadTiles(mod: MainModule, lat: number, long: number, maxRange: number) {
  const tiles = getTiles(lat, long, maxRange)

  tiles.forEach(({hgtName, sdfName, sdfHDName}) => {
    fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${lat},${long}`)
  })
  mod.FS.analyzePath
}
