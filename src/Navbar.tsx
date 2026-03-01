import { Group, NumberInput, Select, Stack, TextInput } from "@mantine/core"
import "./Navbar.css"
import { type IConfig } from "./config"

import { useAtom } from "jotai"
import { configAtom } from "./atoms"

export default function Navbar() {

  const [config, setConfig] = useAtom(configAtom)

  /**
   * Helper which makes the nested object destructuring a little better when updating the config.
   *
   * @template S extends keyof IConfig - A top-level key of IConfig
   * @param section - Section of the config to update; must be one of the top level keys
   * @param setting - Setting inside the config section to update
   * @param value - New value to set
   */
  function updateConfig<S extends keyof IConfig>(section: S, setting: keyof IConfig[S], value: IConfig[S][typeof setting]) {
    setConfig({...config,
      [section]: {
        ...(config[section] as object),
        [setting]: value
      }
    })
  }

  /**
   * Helper which makes the value and onChange props for the inputs to update the config.
   *
   * @template S extends keyof IConfig - A top-level key of IConfig
   * @param section - Section of the config to update; must be one of the top level keys
   * @param setting - Setting inside the config section to update
   * @param cast - Function to call on the event emitted from the onChange callback which
   *  gets the value to be inserted into the config
   * @returns Props to be passed to an input widget
   */
  function makeProps<S extends keyof IConfig>(section: S, setting: keyof IConfig[S], cast: (value: any) => IConfig[S][typeof setting]) {
    return {
      value: config[section][setting],
      onChange: (event: string | number) => updateConfig(section, setting, cast(event))
    }
  }

  function makeLabeledValues(values: string[]) {
    return values.map(item => {
      return {value: item.toLowerCase(), label: item}
    })
  }

  return (
    <div id="navbar">
      <Stack className="section">
        <h4 className="sectionTitle">Transmitter</h4>
        <TextInput
          label="Site name"
          value={config.siteName}
          onChange={(event) => setConfig({ ...config, siteName: event.currentTarget.value })}
        />
        <Group grow gap="1em">
          <NumberInput label="Latitude [deg]" min={-90} max={90} {...makeProps('transmitter', 'latitude', Number)} />
          <NumberInput label="Longitude [deg]" min={-180} max={180} {...makeProps('transmitter', 'longitude', Number)} />
        </Group>
        <Group grow gap="1em">
          <NumberInput label="Power [W]" min={0} {...makeProps('transmitter', 'power', Number)} />
          <NumberInput label="Frequency [MHz]" min={0} {...makeProps('transmitter', 'frequency', Number)} />
        </Group>
        <Group grow gap="1em">
          <NumberInput label="Height AGL [m]" min={0} {...makeProps('transmitter', 'heightAGL', Number)} />
          <NumberInput label="Antenna Gain [dB]" min={0} {...makeProps('transmitter', 'antennaGain', Number)} />
        </Group>
      </Stack>
      <Stack className="section">
        <h4 className="sectionTitle">Receiver</h4>
        <Group grow gap="1em">
          <NumberInput label="Sensitivity [dBm]" max={-30} {...makeProps('receiver', 'sensitivity', Number)}/>
          <NumberInput label="Height AGL [m]" min={0} {...makeProps('receiver', 'heightAGL', Number)} />
        </Group>
        <Group grow gap="1em">
          <NumberInput label="Antenna Gain [dB]" min={0} {...makeProps('receiver', 'antennaGain', Number)} />
          <NumberInput label="Cable Loss [dB]" min={0} {...makeProps('receiver', 'cableLoss', Number)} />
        </Group>
      </Stack>
      <Stack className="section">
        <h4 className="sectionTitle">Environment</h4>
        <Select
          label="Radio Climate"
          data={makeLabeledValues([
            "Equatorial",
            "Continental Subtropical",
            "Maritime Subtropical",
            "Desert",
            "Continental Temperate",
            "Maritime Temperate (Land)",
            "Maritime Temperate (Sea)",
          ])}
          value={config.environment.radioClimate}
          onChange={(value) => {
            if (value !== null) {
              updateConfig('environment', 'radioClimate', value as IConfig['environment']['radioClimate'])
            }
          }}
        />
        <Select
          label="Polarization"
          data={makeLabeledValues(["Vertical", "Horizontal"])}
          value={config.environment.polarization}
          onChange={value => {
            if (value !== null) {
              updateConfig('environment', 'polarization', value as IConfig['environment']['polarization'])
            }
          }}
        />
        <Group grow gap="1em">
          <NumberInput label="Clutter Height [m]" min={0} {...makeProps('environment', 'clutterHeight', Number)} />
          <NumberInput label="Ground Dielectric [V/m]" min={0} {...makeProps('environment', 'groundDielectric', Number)} />
        </Group>
        <Group grow gap="1em">
          <NumberInput label="Ground Conductivity [S/m]" min={0} {...makeProps('environment', 'groundConductivity', Number)}/>
          <NumberInput label="Atmospheric Bending [N-units]" min={0} {...makeProps('environment', 'atmosphericBending', Number)}/>
        </Group>
      </Stack>
      <Stack className="section">
        <h4 className="sectionTitle">Simulation Options</h4>
        <Group grow gap="1em">
          <NumberInput label="Simulation Fraction [%]" min={0} max={100} {...makeProps('simulationOptions', 'simulationFraction', Number)}/>
          <NumberInput label="Time Fraction [%]" min={0} max={100} {...makeProps('simulationOptions', 'timeFraction', Number)}/>
        </Group>
        <Group grow gap="1em">
          <NumberInput label="Max Range [km]" min={0} max={100} {...makeProps('simulationOptions', 'maxRange', Number)}/>
        </Group>
      </Stack>
      <Stack className="section">
        <h4 className="sectionTitle">Display</h4>
        <Group grow gap="1em">
          <NumberInput label="Minimum Signal [dBm]" {...makeProps('display', 'minimumSignal', Number)}/>
          <NumberInput label="Maximum Signal [dBm]" {...makeProps('display', 'maximumSignal', Number)}/>
        </Group>
        <Group grow gap="1em">
          <Select
            label="Colormap"
            data={makeLabeledValues(["Plasma", "Viridis"])}
            value={config.display.colormap}
            onChange={value => {
              if (value !== null) {
                updateConfig('display', 'colormap', value as IConfig['display']['colormap'])
              }
            }}
          />
          <NumberInput label="Transparency [%]" min={0} max={100} {...makeProps('display', 'transparency', Number)} />
        </Group>
      </Stack>
    </div>
  )
}
