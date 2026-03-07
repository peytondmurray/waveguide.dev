import type { IConfig } from "./config"

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
