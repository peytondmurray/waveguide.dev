import { useAtom } from "jotai"
import { LatLngBounds } from "leaflet"
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet"
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
        {results.map(({ config, dataUrl, bounds }) => {
          return (
            <>
              <Marker
                key={config.siteName}
                position={[
                  config.transmitter.latitude,
                  config.transmitter.longitude,
                ]}
              >
                <Popup>{config.siteName}</Popup>
              </Marker>
              <ImageOverlay
                key={config.siteName}
                bounds={
                  new LatLngBounds(
                    [bounds.south, bounds.west],
                    [bounds.north, bounds.east],
                  )
                }
                url={dataUrl}
                opacity={0.5}
                zIndex={10}
              />
            </>
          )
        })}
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </MapContainer>
    </div>
  )
}
