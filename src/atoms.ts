import { atom } from "jotai"
import { DefaultConfig, type IConfig } from "./config"

const configAtom = atom<IConfig>(DefaultConfig)
const simulationsAtom = atom()

export { configAtom, simulationsAtom }
