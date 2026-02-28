import { Group, NumberInput, Select, Stack, TextInput } from "@mantine/core"
import "./Navbar.css"

export default function Navbar() {
  return (
    <div id="navbar">
      <Stack className="section">
        <h2 className="sectionTitle">Transmitter</h2>
        <TextInput label="Site name" />
        <Group grow gap="1em">
          <NumberInput label="Latitude [deg]" min={-90} max={90} />
          <NumberInput label="Longitude [deg]" min={-180} max={180} />
        </Group>
        <Group grow gap="1em">
          <NumberInput label="Power [W]" min={0} />
          <NumberInput label="Frequency [MHz]" min={0} />
        </Group>
        <Group grow gap="1em">
          <NumberInput label="Height AGL [m]" min={0} />
          <NumberInput label="Antenna Gain [dB]" min={0} />
        </Group>
      </Stack>
      <Stack className="section">
        <h2 className="sectionTitle">Receiver</h2>
        <Group grow gap="1em">
          <NumberInput label="Sensitivity [dBm]" max={-30} />
          <NumberInput label="Height AGL [m]" min={0} />
        </Group>
        <Group grow gap="1em">
          <NumberInput label="Antenna Gain [dB]" min={0} />
          <NumberInput label="Cable Loss [dB]" min={0} />
        </Group>
      </Stack>
      <Stack className="section">
        <h2 className="sectionTitle">Environment</h2>
        <Select
          label="Radio Climate"
          data={[
            "Equatorial",
            "Continental Subtropical",
            "Maritime Subtropical",
            "Desert",
            "Continental Temperate",
            "Maritime Temperate (Land)",
            "Maritime Temperate (Sea)",
          ]}
        />
        <Select label="Polarization" data={["Vertical", "Horizontal"]} />
        <Group grow gap="1em">
          <NumberInput label="Clutter Height [m]" min={0} />
          <NumberInput label="Ground Dielectric [V/m]" min={0} />
        </Group>
        <Group grow gap="1em">
          <NumberInput label="Ground Conductivity [S/m]" min={0} />
          <NumberInput label="Atmospheric Bending [N-units]" min={0} />
        </Group>
      </Stack>
      <Stack className="section">
        <h2 className="sectionTitle">Simulation Options</h2>
        <Group grow gap="1em">
          <NumberInput label="Simulation Fraction [%]" min={0} max={100} />
          <NumberInput label="Time Fraction [%]" min={0} max={100} />
        </Group>
        <Group grow gap="1em">
          <NumberInput label="Max Range [km]" min={0} max={100} />
        </Group>
      </Stack>
      <Stack className="section">
        <h2 className="sectionTitle">Display</h2>
        <Group grow gap="1em">
          <NumberInput label="Minimum Signal [dBm]" />
          <NumberInput label="Maximum Signal [dBm]" />
        </Group>
        <Group grow gap="1em">
          <Select label="Colormap" data={["Plasma", "Viridis"]} />
          <NumberInput label="Transparency [%]" min={0} max={100} />
        </Group>
      </Stack>
    </div>
  )
}
