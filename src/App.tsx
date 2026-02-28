import { AppShell, Burger, MantineProvider } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useEffect, useState } from "react"
import { theme } from "./theme"
import SplatFactory, { type MainModule } from "./wasm/splat"
import "@mantine/core/styles.css"

export default function App() {
  const [splatModule, setSplatModule] = useState<MainModule | null>(null)
  useEffect(() => {
    SplatFactory({ noInitialRun: true }).then((mod) => setSplatModule(mod))
  }, [])

  if (splatModule !== null) {
    console.log(splatModule)
  }

  const [opened, { toggle }] = useDisclosure()

  return (
    <MantineProvider theme={theme}>
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

          <div>Logo</div>
        </AppShell.Header>

        <AppShell.Navbar>Navbar</AppShell.Navbar>

        <AppShell.Main>Main</AppShell.Main>
      </AppShell>
    </MantineProvider>
  )
}
