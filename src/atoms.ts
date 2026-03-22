import { atom } from "jotai"
import { DefaultConfig, type IConfig } from "./config"
import type { FSManager } from "./fsManager"
import type { Result } from "./result"
import type { ProgressUpdate, Task } from "./util"

const configAtom = atom<IConfig>(DefaultConfig)
const simulationsAtom = atom()
const progressAtom = atom<Map<Task, ProgressUpdate>>(new Map())
const resultsAtom = atom<Result[]>([])
const activeAtom = atom<string | null>(null)
const fsManagerAtom = atom<FSManager | null>(null)

export {
  configAtom,
  simulationsAtom,
  progressAtom,
  resultsAtom,
  activeAtom,
  fsManagerAtom,
}
