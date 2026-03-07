import { AppShell, Burger, MantineProvider } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useEffect, useState } from "react"
import Splat, { type MainModule } from "splat-web/splat"
import Srtm2sdf from "splat-web/srtm2sdf"
import MapWidget from "./MapWidget"
import Navbar from "./Navbar"
import { downloadTiles, generateSplatInputs, runSplat } from "./util"

import "@mantine/core/styles.css"

import "./App.css"
import { useAtom } from "jotai"
import { activeAtom, configAtom, progressAtom, resultsAtom } from "./atoms"

export default function App() {
  const [splatModule, setSplatModule] = useState<MainModule | null>(null)
  const [srtm2sdfModule, setSrtm2sdfModule] = useState<MainModule | null>(null)

  useEffect(() => {
    Splat({ noInitialRun: true }).then((mod) => setSplatModule(mod))
    Srtm2sdf({ noInitialRun: true }).then((mod) => setSrtm2sdfModule(mod))
  }, [])

  const [config, _setConfig] = useAtom(configAtom)
  const [_progress, setProgress] = useAtom(progressAtom)
  const [opened, { toggle }] = useDisclosure()
  const [results, setResults] = useAtom(resultsAtom)
  const [_active, setActive] = useAtom(activeAtom)

  async function handleRun() {
    if (splatModule !== null && srtm2sdfModule !== null) {
      await downloadTiles(
        srtm2sdfModule,
        config.transmitter.latitude,
        config.transmitter.longitude,
        config.simulationOptions.maxRange,
        setProgress,
        "fasma",
      )

      await generateSplatInputs(splatModule, config)
      setResults([...results, await runSplat(splatModule, config, "fasma")])
      setActive(config.siteName)
    }
  }

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

          <div id="logoArea">
            <h1 id="title">waveguide.dev</h1>
          </div>
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
