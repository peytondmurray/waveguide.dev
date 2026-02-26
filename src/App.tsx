import { useState, useEffect } from 'react'
import SplatFactory, { type MainModule } from './wasm/splat';
import './App.css'

function App() {
  const [splatModule, setSplatModule] = useState<MainModule | null>(null);
  useEffect(() => {
    SplatFactory({ noInitialRun: true }).then((mod) => setSplatModule(mod))
  }, [])

  if (splatModule !== null) {
    console.log(splatModule);
  }

  return (
    <>
      <h1>Vite + React</h1>
    </>
  )
}

export default App
