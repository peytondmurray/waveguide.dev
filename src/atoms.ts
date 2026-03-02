import { atom } from "jotai"
import { DefaultConfig, type IConfig } from "./config"

const configAtom = atom<IConfig>(DefaultConfig)
const simulationsAtom = atom()
const progressAtom = atom<{ value: number; label: string }>({
  value: 0,
  label: "",
})

export { configAtom, simulationsAtom, progressAtom }
