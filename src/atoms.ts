import { atom } from "jotai"
import { DefaultConfig, type IConfig } from "./config"
import type { FSManager } from "./fsManager"
import type { Prediction } from "./util"

const configAtom = atom<IConfig>(DefaultConfig)
const simulationsAtom = atom()

const predictionAtom = atom<Record<string, Prediction>>({})
const activeAtom = atom<string | null>(null)
const fsManagerAtom = atom<FSManager | null>(null)

export {
  configAtom,
  simulationsAtom,
  activeAtom,
  fsManagerAtom,
  predictionAtom,
}
