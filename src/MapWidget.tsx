import { useAtom } from "jotai"
import { MapContainer, TileLayer } from "react-leaflet"
import { configAtom } from "./atoms"

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

  return (
    <div id="map-wrapper">
      <MapContainer id="map" {...mapOptions}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </MapContainer>
    </div>
  )
}
