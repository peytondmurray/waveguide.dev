import Splat, { type MainModule } from "splat-web/splat"
import Srtm2sdf from "splat-web/srtm2sdf"
import type { IConfig } from "./config"
import { FSManager } from "./fsManager"
import { downloadTiles, generateSplatInputs, runSplat } from "./geoutil"
import type { Result } from "./result"
import type { ProgressUpdate } from "./util"

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

export type WorkerWasmLoaded = {} & WorkerResponse

// Make a block here to contain the scope of worker-only variables
{
  const queue: Task[] = []
  let processing = false

  let splat: MainModule | null = null
  let srtm2sdf: MainModule | null = null
  let fsmanager: FSManager | null = null

  async function loadWasm(task: Task) {
    const [splatmod, srtm2sdfmod] = await Promise.all([
      Splat({ noInitialRun: true }),
      Srtm2sdf({ noInitialRun: true }),
    ])

    splat = splatmod
    srtm2sdf = srtm2sdfmod
    fsmanager = new FSManager(splat, srtm2sdf)
    self.postMessage({ task, type: "wasmloaded" })
  }

  async function process(task: Task) {
    if (task.config === undefined) {
      console.error("No config specified for process task")
      return
    }
    if (!fsmanager || !splat || !srtm2sdf) {
      console.error("Wasm worker is not loaded!", fsmanager, splat, srtm2sdf)
      return
    }

    const { transmitter, simulationOptions } = task.config
    await downloadTiles(
      fsmanager,
      transmitter.latitude,
      transmitter.longitude,
      simulationOptions.maxRange,
      (progress) => {
        console.log("Progress: ", { task, progress })
        self.postMessage({ task, type: "progress", progress })
      },
    )

    await generateSplatInputs(fsmanager, splat, task.config)
    const result = await runSplat(fsmanager, splat, task.config)
    self.postMessage({ task, type: "result", result })
  }

  self.onmessage = (e: MessageEvent<Task>) => {
    console.log("Enqueueing task: ", e.data)
    queue.push(e.data)
    if (!processing) {
      processNext()
    }
  }

  function processNext() {
    if (queue.length === 0) {
      processing = false
    }
    processing = true

    const task = queue.shift()
    if (task) {
      if (task.type === "loadwasm") {
        loadWasm(task)
      } else if (task.type === "process") {
        process(task)
      } else {
        console.error("Malformed task for the web worker.")
      }
    }

    // Use a timeout to call processNext again so that we don't bottom out with recursion
    setTimeout(processNext, 0)
  }
}
