import type { IConfig } from "./config"

export type Bounds = {
  north: number
  south: number
  east: number
  west: number
}

export type Result = {
  config: IConfig
  bounds: Bounds
}
