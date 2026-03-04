import { useAtom } from "jotai"
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"
import { configAtom, resultsAtom } from "./atoms"

import "leaflet/dist/leaflet.css"
import "./MapWidget.css"

export default function MapWidget() {
  const [config, _setConfig] = useAtom(configAtom)
  const mapOptions = {
    center: [config.transmitter.latitude, config.transmitter.longitude],
    zoom: 13,
    maxZoom: 18,
    minZoom: 5,
  }

  const [results, _setResults] = useAtom(resultsAtom)

  return (
    <div id="map-wrapper">
      <MapContainer id="map" {...mapOptions}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </MapContainer>
      {results.map((result) => {
        return (
          <Marker
            key={result.config.siteName}
            position={[
              result.config.transmitter.latitude,
              result.config.transmitter.longitude,
            ]}
          >
            <Popup>{result.config.siteName}</Popup>
          </Marker>
        )
      })}
    </div>
  )
}
