/// <reference types="vite-plugin-svgr/client" />
import { AppShell, Burger, Group, MantineProvider } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { Notifications, showNotification } from "@mantine/notifications"
import { useAtom } from "jotai"
import { type SetStateAction, useEffect, useRef, useState } from "react"
import { activeAtom, configAtom, predictionAtom } from "./atoms"
import Icon from "./logo.svg?react"
import MapWidget from "./MapWidget"
import Navbar from "./Navbar"
import type {
  IConfig,
  Prediction,
  WorkerFailed,
  WorkerProgress,
  WorkerResult,
} from "./util"

import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "./App.css"

/**
 * Add a completed prediction from the worker to the predictions shown on the map.
 *
 * @param e - Message from the worker
 * @param setPredictions - State setter function for updating predictions
 * @param setActive - State setter function for setting the active prediction
 */
function handleResult(
  e: MessageEvent<WorkerProgress | WorkerResult>,
  setPredictions: (updater: SetStateAction<Record<string, Prediction>>) => void,
  setActive: (obj: string) => void,
) {
  const { task, result } = e.data as WorkerResult

  const conf = task.config
  if (conf) {
    setPredictions((current) => ({
      ...current,
      [conf.siteName]: { config: conf, status: "finished", result },
    }))
  }
  setActive(result.config.siteName)
}

/**
 * Update the progress of an existing prediction.
 *
 * @param e - Message from the worker
 * @param setPredictions - State setter function for updating the progress of a prediction
 */
function handleProgress(
  e: MessageEvent<WorkerProgress | WorkerResult>,
  setPredictions: (updater: SetStateAction<Record<string, Prediction>>) => void,
) {
  const { task, progress } = e.data as WorkerProgress
  const conf = task.config
  if (conf) {
    setPredictions((current) => ({
      ...current,
      [conf.siteName]: { config: conf, status: "pending", progress },
    }))
  }
}

/**
 * Remove a prediction when it fails to complete.
 *
 * @param e - Message from the worker
 * @param setPredictions - State setter function for removing the in progress prediction.
 */
function handleFailed(
  e: MessageEvent<WorkerProgress | WorkerResult>,
  setPredictions: (updater: SetStateAction<Record<string, Prediction>>) => void,
) {
  const { task } = e.data as WorkerFailed
  const conf = task.config
  if (conf) {
    setPredictions((current) => {
      const { [conf.siteName]: _, ...rest } = current
      showNotification({
        title: "Prediction failed",
        message: `Failed to predict site ${conf.siteName}. Check the console log for details.`,
      })
      return rest
    })
  }
}

export default function App() {
  const [opened, { toggle }] = useDisclosure()
  const [workerLoaded, setWorkerLoaded] = useState<boolean>(false)

  const [config, setConfig] = useAtom(configAtom)
  const [active, setActive] = useAtom(activeAtom)
  const [predictions, setPredictions] = useAtom(predictionAtom)

  const workerRef = useRef<Worker>(null)
  const taskId = useRef<number>(0)

  useEffect(() => {
    if (workerRef.current !== null) {
      return
    }

    workerRef.current = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    })

    // Set up the main thread to respond to messages from the web worker
    workerRef.current.onmessage = (
      e: MessageEvent<WorkerProgress | WorkerResult>,
    ) => {
      if (e.data.type === "result") {
        handleResult(e, setPredictions, setActive)
      } else if (e.data.type === "progress") {
        handleProgress(e, setPredictions)
      } else if (e.data.type === "wasmloaded") {
        setWorkerLoaded(true)
      } else if (e.data.type === "failed") {
        handleFailed(e, setPredictions)
      } else {
        console.error("Malformed worker response received: ", e.data)
      }
    }

    // Initialize the worker by loading the wasm immediately
    workerRef.current.postMessage({
      id: taskId.current++,
      type: "loadwasm",
    })
  }, [setActive, setPredictions])

  /**
   * Handle the click of the "Run Simulation" button.
   *
   * Kick off the prediction on the Web Worker. Then increment the current site name so the next
   * prediction doesn't conflict with the name of the one you just initiated.
   */
  async function handleRun() {
    if (workerRef.current) {
      // Create a new prediction in the main thread, then message the worker to enqueue the task
      taskId.current++
      setPredictions((current) => {
        return {
          ...current,
          [config.siteName]: { status: "pending", config },
        }
      })
      workerRef.current.postMessage({
        id: taskId.current,
        type: "process",
        config,
      })

      // Automatically increment the site name so that we never get conflicting sitenames when we
      // are just generating predictions
      setConfig((current: IConfig) => {
        let nextnum = 0
        while (
          Object.hasOwn(predictions, `default${nextnum}`) ||
          config.siteName === `default${nextnum}`
        ) {
          nextnum++
        }
        return { ...current, siteName: `default${nextnum}` }
      })
    }
  }

  return (
    <MantineProvider defaultColorScheme="dark">
      <Notifications />
      <AppShell
        padding="md"
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: "sm",
          collapsed: { mobile: !opened },
        }}
      >
        <AppShell.Header>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Group id="logoArea" align="flex-start">
            <Icon />
            <h1 id="title">waveguide.dev</h1>
            <h2>{active}</h2>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar>
          {workerLoaded ? <Navbar handleRun={handleRun} /> : <p>Loading...</p>}
        </AppShell.Navbar>

        <AppShell.Main>
          <MapWidget />
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  )
}
