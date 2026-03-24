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
import { activeAtom, configAtom, predictionAtom } from "./atoms"

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
  const [predictions, _setPredictions] = useAtom(predictionAtom)
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
        {Object.entries(predictions).map(([_, prediction]) => {
          const { config: resultConfig, result } = prediction
          if (result && resultConfig) {
            return (
              <React.Fragment key={resultConfig.siteName}>
                <Marker
                  key={`${resultConfig.siteName}-marker`}
                  position={[
                    resultConfig.transmitter.latitude,
                    resultConfig.transmitter.longitude,
                  ]}
                  eventHandlers={{
                    click: (event) => handleMarkerClick(event, resultConfig),
                  }}
                >
                  <Popup>{resultConfig.siteName}</Popup>
                </Marker>
                <ImageOverlay
                  key={`${resultConfig.siteName}-overlay`}
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
          } else {
            return null
          }
        })}
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </MapContainer>
    </div>
  )
}
