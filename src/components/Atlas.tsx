"use client";
import { useEffect, useRef, useState } from "react";
import type * as maplibregl from "maplibre-gl";
import { createMap } from "@/lib/createMap";

export function Atlas() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loc, setLoc] = useState(false);
  const [lac, setLac] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const map = createMap(ref.current);
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const apply = () => {
      for (const id of ["loc-line", "loc-label"]) m.setLayoutProperty(id, "visibility", loc ? "visible" : "none");
      for (const id of ["lac-line", "lac-label"]) m.setLayoutProperty(id, "visibility", lac ? "visible" : "none");
    };
    if (m.isStyleLoaded()) apply();
    else m.once("load", apply);
  }, [loc, lac]);

  return (
    <div className="atlas">
      <aside className="atlas-filters" aria-label="Filters"></aside>
      <section className="atlas-map" aria-label="Map of Jammu & Kashmir and Ladakh">
        <div ref={ref} className="map-canvas" role="region" aria-label="Interactive map" />
        <div className="map-controls">
          <button className="btn" aria-pressed={loc} onClick={() => setLoc(!loc)}>
            Line of Control
          </button>
          <button className="btn" aria-pressed={lac} onClick={() => setLac(!lac)}>
            LAC
          </button>
        </div>
      </section>
      <section className="atlas-timeline" aria-label="Timeline"></section>
    </div>
  );
}
