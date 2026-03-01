import { useAtom } from "jotai";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { configAtom } from "./atoms";

import "leaflet/dist/leaflet.css"
import "./Map.css"

export default function Map() {
  const [config, _setConfig] = useAtom(configAtom)
  const mapOptions = {
    center: [config.transmitter.latitude, config.transmitter.longitude],
    zoom: 13,
    maxZoom: 18,
    minZoom: 5,
  };

  return (
    <div id="map-wrapper">
      <MapContainer id="map" {...mapOptions} >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </MapContainer>
    </div>
  );
};
