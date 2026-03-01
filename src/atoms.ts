import { atom } from "jotai"
import { DefaultConfig, type IConfig } from "./config"

const configAtom = atom<IConfig>(DefaultConfig)

export {
  configAtom,
}
