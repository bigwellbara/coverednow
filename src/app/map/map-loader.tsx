"use client";

import dynamic from "next/dynamic";
import type { MapPlace } from "./school-map";

// Leaflet needs the browser's window, so the map is never rendered on the server.
const SchoolMap = dynamic(() => import("./school-map"), {
  ssr: false,
  loading: () => (
    <div className="shimmer grid h-[28rem] place-items-center bg-brand-50 text-sm text-slate-500 sm:h-[34rem]">
      Loading the map…
    </div>
  ),
});

export function MapLoader({ places }: { places: MapPlace[] }) {
  return <SchoolMap places={places} />;
}
