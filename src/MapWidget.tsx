import { useAtom } from "jotai"
import { LatLngBounds } from "leaflet"
import React from "react"
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvent,
} from "react-leaflet"
import { activeAtom, configAtom, resultsAtom } from "./atoms"

import "leaflet/dist/leaflet.css"
import "./MapWidget.css"

function MapClickHandleComponent() {
  const [config, setConfig] = useAtom(configAtom)
  const map = useMapEvent("click", (e) => {
    setConfig({
      ...config,
      transmitter: {
        ...config.transmitter,
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      },
    })
    map.flyTo(e.latlng, map.getZoom())
  })
  return null
}

export default function MapWidget() {
  const [config, _setConfig] = useAtom(configAtom)
  const [results, _setResults] = useAtom(resultsAtom)
  const [active, setActive] = useAtom(activeAtom)
  const mapOptions = {
    center: [config.transmitter.latitude, config.transmitter.longitude],
    zoom: 13,
    maxZoom: 18,
    minZoom: 5,
  }

  return (
    <div id="map-wrapper">
      <MapContainer id="map" {...mapOptions}>
        <MapClickHandleComponent />
        <Marker
          position={[config.transmitter.latitude, config.transmitter.longitude]}
        />
        {results.map(({ config, dataUrl, bounds }) => {
          return (
            <React.Fragment key={config.siteName}>
              <Marker
                key={`${config.siteName}-marker`}
                position={[
                  config.transmitter.latitude,
                  config.transmitter.longitude,
                ]}
                eventHandlers={{
                  click: () =>
                    setActive(
                      config.siteName === active ? null : config.siteName,
                    ),
                }}
              >
                <Popup>{config.siteName}</Popup>
              </Marker>
              <ImageOverlay
                key={`${config.siteName}-overlay`}
                bounds={
                  new LatLngBounds(
                    [bounds.south, bounds.west],
                    [bounds.north, bounds.east],
                  )
                }
                url={dataUrl}
                opacity={config.siteName === active ? 0.7 : 0}
                zIndex={10}
              />
            </React.Fragment>
          )
        })}
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </MapContainer>
    </div>
  )
}
