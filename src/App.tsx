/// <reference types="vite-plugin-svgr/client" />
import { AppShell, Burger, Group, MantineProvider } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useEffect, useRef, useState } from "react"
import Icon from "./logo.svg?react"
import MapWidget from "./MapWidget"
import Navbar from "./Navbar"
import type { WorkerProgress, WorkerResult } from "./util"

import "@mantine/core/styles.css"

import "./App.css"
import { useAtom } from "jotai"
import { activeAtom, configAtom, progressAtom, resultsAtom } from "./atoms"

export default function App() {
  const [opened, { toggle }] = useDisclosure()
  const [workerLoaded, setWorkerLoaded] = useState<boolean>(false)

  const [config, _setConfig] = useAtom(configAtom)
  const [_progress, setProgress] = useAtom(progressAtom)
  const [_results, setResults] = useAtom(resultsAtom)
  const [_active, setActive] = useAtom(activeAtom)

  const workerRef = useRef<Worker>(null)
  const taskId = useRef<number>(0)

  useEffect(() => {
    workerRef.current = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    })

    workerRef.current.onmessage = (
      e: MessageEvent<WorkerProgress | WorkerResult>,
    ) => {
      if (e.data.type === "result") {
        const result = (e.data as WorkerResult).result
        setResults((res) => [...res, result])
        setActive(result.config.siteName)
      } else if (e.data.type === "progress") {
        const { task, progress } = e.data as WorkerProgress
        setProgress((current) => {
          current.set(task, progress)
          return current
        })
      } else if (e.data.type === "wasmloaded") {
        setWorkerLoaded(true)
      } else {
        console.error("Malformed worker response received: ", e.data)
      }
    }

    workerRef.current.postMessage({
      id: taskId.current++,
      type: "loadwasm",
    })
  }, [setResults, setProgress, setActive])

  async function handleRun() {
    if (workerRef.current) {
      workerRef.current.postMessage({
        id: taskId.current++,
        type: "process",
        config,
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
