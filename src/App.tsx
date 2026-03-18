/// <reference types="vite-plugin-svgr/client" />
import { AppShell, Burger, Group, MantineProvider } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useEffect, useState } from "react"
import Splat, { type MainModule } from "splat-web/splat"
import Srtm2sdf from "splat-web/srtm2sdf"
import { FSManager } from "./fsManager"
import { downloadTiles, generateSplatInputs, runSplat } from "./geoutil"
import Icon from "./logo.svg?react"
import MapWidget from "./MapWidget"
import Navbar from "./Navbar"

import "@mantine/core/styles.css"

import "./App.css"
import { useAtom } from "jotai"
import {
  activeAtom,
  configAtom,
  fsManagerAtom,
  progressAtom,
  resultsAtom,
} from "./atoms"

export default function App() {
  const [splatModule, setSplatModule] = useState<MainModule | null>(null)
  const [srtm2sdfModule, setSrtm2sdfModule] = useState<MainModule | null>(null)
  const [config, _setConfig] = useAtom(configAtom)
  const [_progress, setProgress] = useAtom(progressAtom)
  const [opened, { toggle }] = useDisclosure()
  const [results, setResults] = useAtom(resultsAtom)
  const [_active, setActive] = useAtom(activeAtom)
  const [fsManager, setFsManager] = useAtom(fsManagerAtom)

  useEffect(() => {
    Splat({ noInitialRun: true }).then((mod) => setSplatModule(mod))
    Srtm2sdf({ noInitialRun: true }).then((mod) => setSrtm2sdfModule(mod))
  }, [])

  useEffect(() => {
    if (splatModule === null || srtm2sdfModule === null) {
      return
    }
    setFsManager(new FSManager(splatModule, srtm2sdfModule))
  }, [splatModule, srtm2sdfModule, setFsManager])

  async function handleRun() {
    // If the wasm modules or the filesystem manager aren't ready, just exit early
    if (splatModule === null || srtm2sdfModule === null || fsManager === null) {
      return
    }

    await downloadTiles(
      fsManager,
      config.transmitter.latitude,
      config.transmitter.longitude,
      config.simulationOptions.maxRange,
      setProgress,
    )

    await generateSplatInputs(fsManager, splatModule, config)
    setResults([...results, await runSplat(fsManager, splatModule, config)])
    setActive(config.siteName)
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
          {splatModule === null ? (
            <p>Loading...</p>
          ) : (
            <Navbar handleRun={handleRun} />
          )}
        </AppShell.Navbar>

        <AppShell.Main>
          <MapWidget />
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  )
}
