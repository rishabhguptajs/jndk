"use client";
import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { buildStyle, INDIA_BOUNDS, JK_BOUNDS } from "./mapStyle";

let protocolAdded = false;

export const ATTRIBUTION =
  "India boundary: Survey of India via DataMeet | Physical layers: Natural Earth | Terrain: AWS Open Data (Mapzen) | Places: GeoNames";

export function createMap(container: HTMLElement, opts: { intro?: boolean; interactive?: boolean } = {}) {
  if (!protocolAdded) {
    // The worker and its shared chunk are copied to public/maplibre by scripts/build-public-data.ts
    maplibregl.setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    protocolAdded = true;
  }
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const map = new maplibregl.Map({
    container,
    style: buildStyle(base),
    bounds: INDIA_BOUNDS,
    fitBoundsOptions: { padding: 20 },
    attributionControl: false,
    interactive: opts.interactive ?? true,
    maxBounds: [
      [40, -10],
      [120, 50],
    ],
    dragRotate: false,
    pitchWithRotate: false,
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIBUTION }), "bottom-right");
  if (opts.interactive !== false) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.touchZoomRotate.disableRotation();

  const noIntro = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("nointro");
  if (opts.intro !== false && !noIntro) {
    map.once("load", () => {
      const go = () => map.fitBounds(JK_BOUNDS, { padding: 30, duration: reduced ? 0 : 3200, essential: true });
      if (reduced) go();
      else setTimeout(go, 1200);
    });
  }
  if (typeof window !== "undefined") (window as unknown as { __atlasMap: maplibregl.Map }).__atlasMap = map;
  return map;
}
