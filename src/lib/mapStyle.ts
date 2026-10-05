import type { StyleSpecification } from "maplibre-gl";

/**
 * The atlas basemap. Rules (see METHODOLOGY and tests/boundary.test.ts):
 *  - India is drawn ONLY from the Survey of India boundary (public/geo/india-soi.geojson).
 *  - No third-party tiles that carry political boundaries. The only tiled source is a
 *    self-hosted terrain PMTiles (elevation only).
 *  - Physical layers (land, water, glaciers) come from Natural Earth physical data with
 *    every attribute stripped.
 *  - Line of Control and LAC are off by default and labelled as military lines.
 */

export const COLORS = {
  bg: "#07080a",
  ocean: "#07080a",
  land: "#121418",
  india: "#20252b",
  indiaEdge: "#7b8794",
  water: "#0d1b26",
  river: "#1b3446",
  glacier: "#2a323b",
  label: "#c9cdd2",
  labelMuted: "#8a929b",
  massacre: "#9b1c1c",
  targeted: "#b42323",
  terror: "#c98a1a",
  india_response: "#4a7aa8",
  war: "#8d9196",
  policy: "#6b8fb3",
} as const;

export const JK_BOUNDS: [[number, number], [number, number]] = [
  [72.4, 32.2],
  [80.6, 37.2],
];
export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [67.5, 6.0],
  [98.0, 37.5],
];

export function buildStyle(base = ""): StyleSpecification {
  const u = (p: string) => `${base}${p}`;
  return {
    version: 8,
    name: "J&K Conflict Atlas",
    glyphs: u("/fonts/{fontstack}/{range}.pbf"),
    sources: {
      land: { type: "geojson", data: u("/geo/land.geojson") },
      lakes: { type: "geojson", data: u("/geo/lakes.geojson") },
      rivers: { type: "geojson", data: u("/geo/rivers.geojson") },
      glaciers: { type: "geojson", data: u("/geo/glaciers.geojson") },
      india: { type: "geojson", data: u("/geo/india-soi.geojson") },
      ocean: { type: "geojson", data: u("/geo/ocean.geojson") },
      mask: { type: "geojson", data: u("/geo/outside-mask.geojson") },
      "region-labels": { type: "geojson", data: u("/geo/region-labels.geojson") },
      "place-labels": { type: "geojson", data: u("/geo/place-labels.geojson") },
      loc: { type: "geojson", data: u("/geo/loc.geojson") },
      lac: { type: "geojson", data: u("/geo/lac.geojson") },
      terrain: {
        type: "raster-dem",
        url: `pmtiles://${u("/tiles/terrain.pmtiles")}`,
        encoding: "terrarium",
        bounds: [60, 5, 100, 38],
        maxzoom: 9,
        tileSize: 256,
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": COLORS.ocean } },
      { id: "land", type: "fill", source: "land", paint: { "fill-color": COLORS.land } },
      { id: "india-fill", type: "fill", source: "india", paint: { "fill-color": COLORS.india } },
      {
        id: "hillshade",
        type: "hillshade",
        source: "terrain",
        paint: {
          "hillshade-exaggeration": 0.45,
          "hillshade-shadow-color": "#000000",
          "hillshade-highlight-color": "#3b4149",
          "hillshade-accent-color": "#15181c",
        },
      },
      { id: "ocean-cover", type: "fill", source: "ocean", paint: { "fill-color": COLORS.ocean } },
      { id: "glaciers", type: "fill", source: "glaciers", paint: { "fill-color": COLORS.glacier, "fill-opacity": 0.55 } },
      { id: "lakes", type: "fill", source: "lakes", paint: { "fill-color": COLORS.water } },
      {
        id: "rivers",
        type: "line",
        source: "rivers",
        paint: { "line-color": COLORS.river, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 9, 1.6] },
      },
      { id: "outside-mask", type: "fill", source: "mask", paint: { "fill-color": COLORS.bg, "fill-opacity": 0.8 } },
      {
        id: "india-outline",
        type: "line",
        source: "india",
        paint: { "line-color": COLORS.indiaEdge, "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.6, 8, 1.4] },
      },
      {
        id: "loc-line",
        type: "line",
        source: "loc",
        layout: { visibility: "none" },
        paint: { "line-color": "#a0a6ad", "line-width": 1, "line-dasharray": [3, 3], "line-opacity": 0.8 },
      },
      {
        id: "lac-line",
        type: "line",
        source: "lac",
        layout: { visibility: "none" },
        paint: { "line-color": "#a0a6ad", "line-width": 1, "line-dasharray": [3, 3], "line-opacity": 0.8 },
      },
      {
        id: "loc-label",
        type: "symbol",
        source: "loc",
        layout: {
          visibility: "none",
          "symbol-placement": "line",
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Italic"],
          "text-size": 11,
        },
        paint: { "text-color": "#a0a6ad", "text-halo-color": COLORS.bg, "text-halo-width": 1.2 },
      },
      {
        id: "lac-label",
        type: "symbol",
        source: "lac",
        layout: {
          visibility: "none",
          "symbol-placement": "line",
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Italic"],
          "text-size": 11,
        },
        paint: { "text-color": "#a0a6ad", "text-halo-color": COLORS.bg, "text-halo-width": 1.2 },
      },
      {
        id: "place-labels",
        type: "symbol",
        source: "place-labels",
        minzoom: 6,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 6, 10, 10, 13],
          "text-offset": [0, 0.9],
          "text-anchor": "top",
          "symbol-sort-key": ["get", "rank"],
        },
        paint: { "text-color": COLORS.labelMuted, "text-halo-color": COLORS.bg, "text-halo-width": 1.2 },
      },
      {
        id: "region-labels",
        type: "symbol",
        source: "region-labels",
        minzoom: 4.5,
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 8, 13],
          "text-max-width": 10,
          "text-letter-spacing": 0.04,
          "text-allow-overlap": true,
        },
        paint: { "text-color": COLORS.label, "text-halo-color": COLORS.bg, "text-halo-width": 1.5 },
      },
    ],
  };
}
