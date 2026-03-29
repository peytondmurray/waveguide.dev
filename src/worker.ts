import Splat, { type SplatModule } from "splat-web/splat"
import Srtm2sdf, { type MainModule } from "splat-web/srtm2sdf"
import { FSManager } from "./fsManager"
import { downloadTiles, generateSplatInputs, runSplat } from "./geoutil"
import type { ProgressUpdate, Task } from "./util"

// Make a block here to contain the scope of worker-only variables
{
  const queue: Task[] = []
  let processing = false

  let splat: SplatModule | null = null
  let srtm2sdf: MainModule | null = null
  let fsmanager: FSManager | null = null

  /**
   * Load the WASM modules for SPLAT and SRTM2SDF.
   *
   * @param task - Task which kicked off the job to load the WASM modules
   */
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

  /**
   * Make a prediction about the RF propagation.
   *
   * @param task - Task which kicked off the job to make a prediction.
   */
  async function process(task: Task) {
    if (task.config === undefined) {
      console.error("No config specified for process task")
      return
    }
    if (!fsmanager || !splat || !srtm2sdf) {
      console.error("Wasm worker is not loaded!", fsmanager, splat, srtm2sdf)
      return
    }

    const progressCallback = (progress: ProgressUpdate) => {
      self.postMessage({ task, type: "progress", progress })
    }

    const { transmitter, simulationOptions } = task.config
    try {
      await downloadTiles(
        fsmanager,
        transmitter.latitude,
        transmitter.longitude,
        simulationOptions.maxRange,
        progressCallback,
      )
    } catch (err) {
      self.postMessage({ task, type: "failed", reason: err })
      return
    }

    await generateSplatInputs(fsmanager, splat, task.config)

    const result = await runSplat(
      fsmanager,
      splat,
      task.config,
      progressCallback,
    )
    self.postMessage({ task, type: "result", result })
  }

  self.onmessage = (e: MessageEvent<Task>) => {
    queue.push(e.data)
    if (!processing) {
      processNext()
    }
  }

  /**
   * Process the next task in the queue.
   *
   * If there are no more tasks, stop working; otherwise, execute the first task before kicking off
   * the next.
   */
  function processNext() {
    if (queue.length === 0) {
      processing = false
      return
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
