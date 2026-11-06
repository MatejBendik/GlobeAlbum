"use client";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import { Button } from "./ui/button";
type Point = { latitude: number; longitude: number };
function Selection({
  value,
  onChange,
}: {
  value?: Point;
  onChange: (point: Point) => void;
}) {
  const map = useMapEvents({
    click(event) {
      onChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.wrap().lng,
      });
    },
  });
  return (
    <>
      {value && (
        <CircleMarker
          center={[value.latitude, value.longitude]}
          radius={8}
          pathOptions={{
            color: "#17191b",
            fillColor: "#fff",
            fillOpacity: 1,
            weight: 3,
          }}
        />
      )}
      <div className="map-center-control">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const center = map.getCenter().wrap();
            onChange({ latitude: center.lat, longitude: center.lng });
          }}
        >
          Use map center
        </Button>
      </div>
    </>
  );
}
export default function LocationPicker({
  value,
  onChange,
}: {
  value?: Point;
  onChange: (point: Point) => void;
}) {
  const center: LatLngTuple = value
    ? [value.latitude, value.longitude]
    : [48, 16];
  return (
    <div className="location-picker">
      <p className="field-hint">
        Tap the city on the map, or move the map and choose its center. Use + /
        − to zoom and arrow keys to move.
      </p>
      <MapContainer
        center={center}
        zoom={value ? 10 : 3}
        minZoom={2}
        maxZoom={18}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        style={{ height: 260 }}
        scrollWheelZoom={false}
        aria-label="Choose place location"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          noWrap
        />
        <Selection value={value} onChange={onChange} />
      </MapContainer>
      <p className="field-hint" role="status">
        {value
          ? "Location selected."
          : "Choose a location before adding this place."}
      </p>
    </div>
  );
}
