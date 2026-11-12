"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { ZIMBABWE_CENTRE } from "@/lib/zimbabwe-cities";

export type MapPlace = {
  city: string;
  position: [number, number];
  schools: Array<{ id: string; name: string; openBills: number }>;
  openBills: number;
  needLabel: string;
};

/**
 * Zimbabwe, with a circle for each town that has verified schools. Bigger, golder
 * circles are where more students are waiting. Loaded only in the browser.
 */
export default function SchoolMap({ places }: { places: MapPlace[] }) {
  return (
    <MapContainer
      center={ZIMBABWE_CENTRE}
      zoom={6}
      minZoom={5}
      maxBounds={[
        [-24.5, 23.5],
        [-14.5, 35.5],
      ]}
      scrollWheelZoom={false}
      className="h-[28rem] w-full sm:h-[34rem]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => (
        <CircleMarker
          key={place.city}
          center={place.position}
          radius={8 + Math.min(place.openBills, 12) * 2}
          pathOptions={{
            color: place.openBills > 0 ? "#987752" : "#2c2c2e",
            fillColor: place.openBills > 0 ? "#c6a97c" : "#636366",
            fillOpacity: 0.75,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="text-base font-semibold">{place.city}</p>
              <p>
                {place.openBills === 0
                  ? "Every bill here is funded."
                  : `${place.openBills} ${place.openBills === 1 ? "student" : "students"} waiting, ${place.needLabel} needed`}
              </p>
              <ul className="list-disc pl-4">
                {place.schools.map((school) => (
                  <li key={school.id}>
                    <a href={`/browse?school=${school.id}`}>{school.name}</a>
                    {school.openBills > 0 && ` (${school.openBills} open)`}
                  </li>
                ))}
              </ul>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
