import { atom } from "jotai"
import type { FSManager } from "./fsManager"
import type { Prediction } from "./util"
import { DefaultConfig, type IConfig } from "./util"

const configAtom = atom<IConfig>(DefaultConfig)
const predictionAtom = atom<Record<string, Prediction>>({})
const activeAtom = atom<string | null>(null)
const fsManagerAtom = atom<FSManager | null>(null)

export { configAtom, activeAtom, fsManagerAtom, predictionAtom }
