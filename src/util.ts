import type { Colormap } from "./colormaps"

export type Prediction = {
  progress?: ProgressUpdate
  result?: Result
  reason?: string
  config: IConfig
  status: "pending" | "finished" | "failed"
}

export type TaskType = "loadwasm" | "process"

export type WorkerResponseType = "progress" | "result" | "wasmloaded"

export type Task = {
  id: number
  type: TaskType
  config?: IConfig
}

type WorkerResponse = {
  task: Task
  type: WorkerResponseType
}

export type WorkerProgress = {
  progress: ProgressUpdate
} & WorkerResponse

export type WorkerResult = {
  result: Result
} & WorkerResponse

export type WorkerFailed = {} & WorkerResponse

export type WorkerWasmLoaded = {} & WorkerResponse

export type ProgressUpdate = {
  value: number
  label: string
}

export type Tile = {
  ziphgtname: string
  hgtname: string
  sdfName: string
  url: string
}

export type Bounds = {
  north: number
  south: number
  east: number
  west: number
}

export type Result = {
  bounds: Bounds
  config: IConfig
  raster: ImageData
  dataUrl: string
}

interface IConfig {
  siteName: string
  transmitter: {
    latitude: number
    longitude: number
    power: number
    frequency: number
    heightAGL: number
    antennaGain: number
  }
  receiver: {
    sensitivity: number
    heightAGL: number
    antennaGain: number
    cableLoss: number
  }
  environment: {
    radioClimate:
      | "equatorial"
      | "continental subtropical"
      | "maritime subtropical"
      | "desert"
      | "continental temperate"
      | "maritime temperate (land)"
      | "maritime temperate (sea)"
    polarization: "horizontal" | "vertical"
    clutterHeight: number
    groundDielectric: number
    groundConductivity: number
    atmosphericBending: number
  }
  simulationOptions: {
    simulationFraction: number
    timeFraction: number
    maxRange: number
  }
  display: {
    minimumSignal: number
    maximumSignal: number
    colormap: Colormap
    transparency: number
  }
}

const DefaultConfig: IConfig = {
  siteName: "default0",
  transmitter: {
    latitude: 37.881492669188205,
    longitude: -121.91447105204122,
    power: 0.125,
    frequency: 907,
    heightAGL: 99,
    antennaGain: 2,
  },
  receiver: {
    sensitivity: -130,
    heightAGL: 1,
    antennaGain: 2,
    cableLoss: 2,
  },
  environment: {
    radioClimate: "continental temperate",
    polarization: "vertical",
    clutterHeight: 1,
    groundDielectric: 15,
    groundConductivity: 0.005,
    atmosphericBending: 301,
  },
  simulationOptions: {
    simulationFraction: 95,
    timeFraction: 95,
    maxRange: 30,
  },
  display: {
    minimumSignal: -130,
    maximumSignal: -80,
    colormap: "plasma",
    transparency: 50,
  },
}

export { type IConfig, DefaultConfig }

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
