import { useAtom } from "jotai"
import L, { LatLngBounds, type LeafletMouseEvent } from "leaflet"
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
import type { IConfig } from "./util"

/**
 * Handle clicks on a map, updating the config as needed, to move around the main marker.
 */
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

const icon = L.icon({
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
  iconAnchor: [12, 41],
  // popupAnchor: [-3, -76],
})

export default function MapWidget() {
  const [config, _setConfig] = useAtom(configAtom)
  const [predictions, _setPredictions] = useAtom(predictionAtom)
  const [active, setActive] = useAtom(activeAtom)

  function handleMarkerClick(event: LeafletMouseEvent, conf: IConfig) {
    setActive(conf.siteName === active ? null : conf.siteName)
    event.originalEvent.stopPropagation()
    event.originalEvent.preventDefault()
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
          icon={icon}
        />
        {Object.entries(predictions).map(([_, prediction]) => {
          if (prediction.status === "finished" && prediction.result) {
            const { config: conf, bounds, dataUrl } = prediction.result
            return (
              <React.Fragment key={conf.siteName}>
                <Marker
                  key={`${conf.siteName}-marker`}
                  position={[
                    conf.transmitter.latitude,
                    conf.transmitter.longitude,
                  ]}
                  eventHandlers={{
                    click: (event) => handleMarkerClick(event, conf),
                  }}
                >
                  <Popup>{conf.siteName}</Popup>
                </Marker>
                <ImageOverlay
                  key={`${conf.siteName}-overlay`}
                  bounds={
                    new LatLngBounds(
                      [bounds.south, bounds.west],
                      [bounds.north, bounds.east],
                    )
                  }
                  url={dataUrl}
                  opacity={conf.siteName === active ? 0.7 : 0}
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
