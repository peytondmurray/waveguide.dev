import { useAtom } from "jotai"
import { LatLngBounds, type LeafletMouseEvent } from "leaflet"
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
import type { IConfig } from "./config"

function MapClickHandleComponent() {
  const [config, setConfig] = useAtom(configAtom)
  useMapEvent("click", (e) => {
    setConfig({
      ...config,
      transmitter: {
        ...config.transmitter,
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      },
    })
  })
  return null
}

export default function MapWidget() {
  const [config, _setConfig] = useAtom(configAtom)
  const [results, _setResults] = useAtom(resultsAtom)
  const [active, setActive] = useAtom(activeAtom)

  function handleMarkerClick(event: LeafletMouseEvent, conf: IConfig) {
    setActive(conf.siteName === active ? null : conf.siteName)
    event.originalEvent.stopPropagation()
  }

  return (
    <div id="map-wrapper">
      <MapContainer
        id="map"
        zoom={13}
        maxZoom={18}
        minZoom={5}
        center={[config.transmitter.latitude, config.transmitter.longitude]}
      >
        <MapClickHandleComponent />
        <Marker
          position={[config.transmitter.latitude, config.transmitter.longitude]}
        />
        {results.map((result) => {
          return (
            <React.Fragment key={result.config.siteName}>
              <Marker
                key={`${result.config.siteName}-marker`}
                position={[
                  result.config.transmitter.latitude,
                  result.config.transmitter.longitude,
                ]}
                eventHandlers={{
                  click: (event) => handleMarkerClick(event, result.config),
                }}
              >
                <Popup>{result.config.siteName}</Popup>
              </Marker>
              <ImageOverlay
                key={`${result.config.siteName}-overlay`}
                bounds={
                  new LatLngBounds(
                    [result.bounds.south, result.bounds.west],
                    [result.bounds.north, result.bounds.east],
                  )
                }
                url={result.dataUrl}
                opacity={result.config.siteName === active ? 0.7 : 0}
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
