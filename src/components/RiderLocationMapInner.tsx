import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const riderIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:22px;height:22px;border-radius:9999px;
    background:#22c55e;border:3px solid #fff;
    box-shadow:0 0 0 2px rgba(34,197,94,.35), 0 2px 6px rgba(0,0,0,.25);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function Recenter({
  lat,
  lng,
  trigger,
}: {
  lat: number;
  lng: number;
  trigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 0.8 });
  }, [lat, lng, map]);
  useEffect(() => {
    if (trigger > 0) map.setView([lat, lng], 16, { animate: true });
  }, [trigger, lat, lng, map]);
  return null;
}

interface Props {
  lat: number;
  lng: number;
  recenterTrigger: number;
}

export default function RiderLocationMapInner({
  lat,
  lng,
  recenterTrigger,
}: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={riderIcon} />
      <Recenter lat={lat} lng={lng} trigger={recenterTrigger} />
    </MapContainer>
  );
}
