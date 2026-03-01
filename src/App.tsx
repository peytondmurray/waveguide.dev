import { AppShell, Burger, MantineProvider } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useEffect, useState } from "react"
import Navbar from "./Navbar"
import SplatFactory, { type MainModule } from "splat-web"
import Map from "./Map"
import { downloadTiles, getTiles } from "./util"

import "@mantine/core/styles.css"

import "./App.css"
import { useAtom } from "jotai"
import { configAtom } from "./atoms"
import type { IConfig } from "./config"

export default function App() {
  const [splatModule, setSplatModule] = useState<MainModule | null>(null)
  useEffect(() => {
    SplatFactory({ noInitialRun: true }).then((mod) => setSplatModule(mod))
  }, [])

  const [config, _setConfig] = useAtom(configAtom)
  const [opened, { toggle }] = useDisclosure()

  async function handleRun() {
    if (splatModule !== null) {

      await downloadTiles(
        splatModule,
        config.transmitter.latitude,
        config.transmitter.longitude,
        config.simulationOptions.maxRange,
      )

      splatModule.callMain([
        "-t",
        "tx.qth",
        "-L",
        config.receiver.heightAGL,
        "-metric",
        config.simulationOptions.maxRange / 1000,
        "-sc",
        "-gc",
        config.environment.clutterHeight,
        "-ngs",
        "-N",
        "-o",
        "output.ppm",
        "-dbm",
        "-db",
        config.display.minimumSignal,
        "-kml",
        "-olditm"
      ])
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
          {splatModule === null ? <p>Loading...</p> : <Navbar handleRun={handleRun} />}
        </AppShell.Navbar>

        <AppShell.Main>
          <Map />
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  )
}
