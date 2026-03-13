import { atom } from "jotai"
import { DefaultConfig, type IConfig } from "./config"
import type { FSManager } from "./fsStatus"
import type { Result } from "./result"

const configAtom = atom<IConfig>(DefaultConfig)
const simulationsAtom = atom()
const progressAtom = atom<{ value: number; label: string }>({
  value: 0,
  label: "",
})
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
