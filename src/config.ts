interface IConfig {
  siteName: string
  transmitter: {
    latitude: number
    longitude: number
    power: number
    frequency: number
    heightAGL: number
    antennaGain: number
  }
  receiver: {
    sensitivity: number
    heightAGL: number
    antennaGain: number
    cableLoss: number
  }
  environment: {
    radioClimate: "equatorial" | "continental subtropical"| "maritime subtropical"| "desert"| "continental temperate"| "maritime temperate (land)"| "maritime temperate (sea)"
    polarization: "horizontal" | "vertical"
    clutterHeight: number
    groundDielectric: number
    groundConductivity: number
    atmosphericBending: number
  }
  simulationOptions: {
    simulationFraction: number
    timeFraction: number
    maxRange: number
  }
  display: {
    minimumSignal: number
    maximumSignal: number
    colormap: "plasma" | "viridis"
    transparency: number
  }
}

const DefaultConfig: IConfig = {
  siteName: "default",
  transmitter: {
    latitude: 40,
    longitude: -108,
    power: 0.125,
    frequency: 907,
    heightAGL: 1,
    antennaGain: 2,
  },
  receiver: {
    sensitivity: -130,
    heightAGL: 1,
    antennaGain: 2,
    cableLoss: 2,
  },
  environment: {
    radioClimate: "continental temperate",
    polarization: "vertical",
    clutterHeight: 1,
    groundDielectric: 15,
    groundConductivity: 0.005,
    atmosphericBending: 301,
  },
  simulationOptions: {
    simulationFraction: 95,
    timeFraction: 95,
    maxRange: 30,
  },
  display: {
    minimumSignal: -130,
    maximumSignal: -80,
    colormap: "plasma",
    transparency: 50,
  }
}

export { type IConfig, DefaultConfig }
