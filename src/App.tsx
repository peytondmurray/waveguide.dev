/// <reference types="vite-plugin-svgr/client" />
import { AppShell, Burger, Group, MantineProvider } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useEffect, useRef, useState } from "react"
import Icon from "./logo.svg?react"
import MapWidget from "./MapWidget"
import Navbar from "./Navbar"
import type {
  IConfig,
  WorkerFailed,
  WorkerProgress,
  WorkerResult,
} from "./util"

import "@mantine/core/styles.css"

import "./App.css"
import { useAtom } from "jotai"
import { activeAtom, configAtom, predictionAtom } from "./atoms"

export default function App() {
  const [opened, { toggle }] = useDisclosure()
  const [workerLoaded, setWorkerLoaded] = useState<boolean>(false)

  const [config, setConfig] = useAtom(configAtom)
  const [_active, setActive] = useAtom(activeAtom)
  const [predictions, setPredictions] = useAtom(predictionAtom)

  const workerRef = useRef<Worker>(null)
  const taskId = useRef<number>(0)

  useEffect(() => {
    workerRef.current = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    })

    // Set up the main thread to respond to messages from the web worker
    workerRef.current.onmessage = (
      e: MessageEvent<WorkerProgress | WorkerResult>,
    ) => {
      if (e.data.type === "result") {
        const { task, result } = e.data as WorkerResult

        const conf = task.config
        if (conf) {
          setPredictions((current) => {
            return {
              ...current,
              [conf.siteName]: { config: conf, status: "finished", result },
            }
          })
        }
        setActive(result.config.siteName)
      } else if (e.data.type === "progress") {
        const { task, progress } = e.data as WorkerProgress

        const conf = task.config
        if (conf) {
          setPredictions((current) => {
            return {
              ...current,
              [conf.siteName]: { config: conf, status: "pending", progress },
            }
          })
        }
      } else if (e.data.type === "wasmloaded") {
        setWorkerLoaded(true)
      } else if (e.data.type === "failed") {
        const { task } = e.data as WorkerFailed
        const conf = task.config
        if (conf) {
          setPredictions((current) => {
            return {
              ...current,
              [conf.siteName]: { config: conf, status: "failed" },
            }
          })
        }
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

  const [active, _setActive] = useAtom(activeAtom)

  return (
    <MantineProvider defaultColorScheme="dark">
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
