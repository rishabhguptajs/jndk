"use client";
import type * as maplibregl from "maplibre-gl";
import type { Event, GroupZone, Infrastructure, InfiltrationRoute, Group } from "./schema";
import { colorOf, groupOf, GROUPS } from "./categories";
import { fmtDate, fmtRange, tollWeight, hotspots } from "./analysis";

type FC = GeoJSON.FeatureCollection;
const fc = (features: GeoJSON.Feature[]): FC => ({ type: "FeatureCollection", features });

/** Events that get a map marker. Policy milestones appear as timeline flags only, and events
 * outside J&K that only have a generic region point are kept off the map so they never read as
 * a located incident. */
export const onMap = (e: Event) => e.category !== "policy" && !(e.region === "Outside J&K" && e.geo_precision === "region");

export function eventsToGeoJSON(events: Event[]): FC {
  return fc(
    events.filter(onMap).map((e) => ({
      type: "Feature",
      id: e.id,
      properties: {
        id: e.id,
        title: e.title,
        date: fmtDate(e),
        toll: tollWeight(e),
        tollLabel: fmtRange(e.killed.total),
        color: colorOf(e.category),
        group: groupOf(e.category),
        war: groupOf(e.category) === "war" ? 1 : 0,
        precision: e.geo_precision,
        approx: e.geo_precision === "region" || e.geo_precision === "district" ? 1 : 0,
      },
      geometry: { type: "Point", coordinates: [e.lng, e.lat] },
    })),
  );
}

const SURFACE = "#0b0d10";
const BEFORE = "region-labels"; // keep labels on top

export function addAtlasLayers(map: maplibregl.Map) {
  const empty = fc([]);
  map.addSource("events", {
    type: "geojson",
    data: empty,
    cluster: true,
    clusterRadius: 26,
    clusterMaxZoom: 7,
    clusterProperties: { toll: ["+", ["get", "toll"]] },
  });
  map.addSource("events-flat", { type: "geojson", data: empty });
  map.addSource("districts", { type: "geojson", data: empty, promoteId: "district" });
  map.addSource("zones", { type: "geojson", data: empty });
  map.addSource("hotspot-trail", { type: "geojson", data: empty });
  map.addSource("hotspot-points", { type: "geojson", data: empty });
  map.addSource("infra", { type: "geojson", data: empty });
  map.addSource("routes", { type: "geojson", data: empty });
  map.addSource("hqs", { type: "geojson", data: empty });

  // Choropleth (hidden unless that mode is on)
  map.addLayer(
    {
      id: "districts-fill",
      type: "fill",
      source: "districts",
      layout: { visibility: "none" },
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["feature-state", "value"], 0],
          0, "rgba(0,0,0,0)",
          1, "#4a1d1b",
          5, "#7a2a25",
          20, "#a8362e",
          100, "#d94a3f",
          500, "#f08a7e",
        ],
        "fill-opacity": 0.85,
      },
    },
    "india-outline",
  );
  map.addLayer(
    { id: "districts-line", type: "line", source: "districts", layout: { visibility: "none" }, paint: { "line-color": "#4b535d", "line-width": 0.6 } },
    "india-outline",
  );

  // Group operational zones (terror layer)
  map.addLayer(
    {
      id: "zones-fill",
      type: "fill",
      source: "zones",
      layout: { visibility: "none" },
      paint: { "fill-color": "#c98500", "fill-opacity": 0.22 },
    },
    "india-outline",
  );
  map.addLayer(
    {
      id: "zones-line",
      type: "line",
      source: "zones",
      layout: { visibility: "none" },
      paint: { "line-color": "#c98500", "line-width": 1.2, "line-dasharray": [2, 2] },
    },
    "india-outline",
  );

  // Infiltration routes
  map.addLayer(
    {
      id: "routes-line",
      type: "line",
      source: "routes",
      layout: { visibility: "none", "line-cap": "round" },
      paint: { "line-color": "#e0b25a", "line-width": 2, "line-dasharray": [1, 1.5], "line-opacity": 0.9 },
    },
    BEFORE,
  );

  // Heatmap
  map.addLayer(
    {
      id: "events-heat",
      type: "heatmap",
      source: "events-flat",
      layout: { visibility: "none" },
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "toll"], 0, 0.15, 10, 0.5, 100, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 9, 2],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 14, 9, 36],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.2, "rgba(122,42,37,0.5)",
          0.5, "#a8362e",
          0.8, "#d94a3f",
          1, "#f6b3a8",
        ],
      },
    },
    BEFORE,
  );

  // Hotspot drift
  map.addLayer(
    {
      id: "hotspot-trail",
      type: "line",
      source: "hotspot-trail",
      layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#f0d9a8", "line-width": 1.5, "line-opacity": 0.7 },
    },
    BEFORE,
  );
  map.addLayer(
    {
      id: "hotspot-points",
      type: "circle",
      source: "hotspot-points",
      layout: { visibility: "none" },
      paint: {
        "circle-radius": ["case", ["==", ["get", "current"], 1], 8, 3],
        "circle-color": ["case", ["==", ["get", "current"], 1], "#f0d9a8", "#8c7a58"],
        "circle-stroke-color": SURFACE,
        "circle-stroke-width": 2,
      },
    },
    BEFORE,
  );
  map.addLayer(
    {
      id: "hotspot-label",
      type: "symbol",
      source: "hotspot-points",
      layout: {
        visibility: "none",
        "text-field": ["case", ["==", ["get", "current"], 1], ["concat", "Centre of violence, ", ["to-string", ["get", "year"]]], ""],
        "text-font": ["Noto Sans Medium"],
        "text-size": 11,
        "text-offset": [0, 1.4],
        "text-anchor": "top",
      },
      paint: { "text-color": "#f0d9a8", "text-halo-color": SURFACE, "text-halo-width": 1.5 },
    },
    BEFORE,
  );

  // Clusters
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "events",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#2c323a",
      "circle-stroke-color": "#8a929b",
      "circle-stroke-width": 1,
      "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "toll"]], 0, 11, 10, 16, 40, 22],
    },
  });
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "events",
    filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Medium"], "text-size": 11, "text-allow-overlap": true },
    paint: { "text-color": "#e6e8eb" },
  });

  // Event markers: area scales with the toll; wars are rings (secondary encoding for grey)
  map.addLayer({
    id: "event-points",
    type: "circle",
    source: "events",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "toll"]], 0, 4.5, 1, 5.5, 3, 8, 7, 12, 20, 22],
      "circle-color": ["case", ["==", ["get", "war"], 1], "rgba(0,0,0,0)", ["get", "color"]],
      "circle-opacity": ["case", ["==", ["get", "approx"], 1], 0.5, 0.9],
      "circle-stroke-opacity": ["case", ["==", ["get", "approx"], 1], 0.6, 1],
      "circle-stroke-color": ["case", ["==", ["get", "war"], 1], ["get", "color"], SURFACE],
      "circle-stroke-width": ["case", ["==", ["get", "war"], 1], 2.5, 2],
    },
  });
  map.addLayer({
    id: "event-selected",
    type: "circle",
    source: "events-flat",
    filter: ["==", ["get", "id"], ""],
    paint: { "circle-radius": 14, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#e8c06a", "circle-stroke-width": 2.5 },
  });

  // Infrastructure and HQs (on top of events)
  map.addLayer({
    id: "infra-points",
    type: "circle",
    source: "infra",
    layout: { visibility: "none" },
    paint: {
      "circle-radius": 6,
      "circle-color": "#0b0d10",
      "circle-stroke-color": "#c98500",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "infra-label",
    type: "symbol",
    source: "infra",
    minzoom: 5,
    layout: {
      visibility: "none",
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 10,
      "text-offset": [0, 1.1],
      "text-anchor": "top",
      "text-max-width": 9,
    },
    paint: { "text-color": "#e0b25a", "text-halo-color": SURFACE, "text-halo-width": 1.4 },
  });
  map.addLayer({
    id: "hq-points",
    type: "circle",
    source: "hqs",
    layout: { visibility: "none" },
    paint: { "circle-radius": 7, "circle-color": "#c98500", "circle-stroke-color": SURFACE, "circle-stroke-width": 2 },
  });
  map.addLayer({
    id: "hq-label",
    type: "symbol",
    source: "hqs",
    layout: {
      visibility: "none",
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Medium"],
      "text-size": 11,
      "text-offset": [0, 1.2],
      "text-anchor": "top",
    },
    paint: { "text-color": "#f0d9a8", "text-halo-color": SURFACE, "text-halo-width": 1.5 },
  });
}

export function setVisible(map: maplibregl.Map, ids: string[], on: boolean) {
  for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
}

export function setEvents(map: maplibregl.Map, events: Event[]) {
  const data = eventsToGeoJSON(events);
  (map.getSource("events") as maplibregl.GeoJSONSource | undefined)?.setData(data);
  (map.getSource("events-flat") as maplibregl.GeoJSONSource | undefined)?.setData(data);
}

export function setSelected(map: maplibregl.Map, id: string | null) {
  if (map.getLayer("event-selected")) map.setFilter("event-selected", ["==", ["get", "id"], id ?? ""]);
}

export function setHotspot(map: maplibregl.Map, events: Event[], year: number) {
  const pts = hotspots(events).filter((p) => p.year <= year);
  (map.getSource("hotspot-trail") as maplibregl.GeoJSONSource).setData(
    fc(pts.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: pts.map((p) => [p.lng, p.lat]) } }] : []),
  );
  (map.getSource("hotspot-points") as maplibregl.GeoJSONSource).setData(
    fc(
      pts.map((p, i) => ({
        type: "Feature",
        properties: { year: p.year, current: i === pts.length - 1 ? 1 : 0 },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      })),
    ),
  );
  return pts;
}

const districtCache = new Map<string, FC>();
export async function loadDistricts(file: string): Promise<FC> {
  if (!districtCache.has(file)) districtCache.set(file, await fetch(`/data/districts/${file}`).then((r) => r.json()));
  return districtCache.get(file)!;
}

/** Choropleth of victims (lower bound) per district for the period's boundaries. */
export async function setChoropleth(map: maplibregl.Map, file: string | null, counts: Map<string, number>) {
  const src = map.getSource("districts") as maplibregl.GeoJSONSource;
  if (!file) {
    src.setData(fc([]));
    return;
  }
  const gj = await loadDistricts(file);
  src.setData(gj);
  map.once("idle", () => {
    for (const f of gj.features) {
      const d = (f.properties as { district: string }).district;
      map.setFeatureState({ source: "districts", id: d }, { value: counts.get(d) ?? 0 });
    }
  });
}

export async function setZones(map: maplibregl.Map, file: string | null, zones: GroupZone[], year: number, groupId: string | null) {
  const src = map.getSource("zones") as maplibregl.GeoJSONSource;
  if (!file) return src.setData(fc([]));
  const gj = await loadDistricts(file);
  const active = new Set(zones.filter((z) => z.year === year && (!groupId || z.group_id === groupId)).flatMap((z) => z.districts));
  src.setData(fc(gj.features.filter((f) => active.has((f.properties as { district: string }).district))));
}

export function setTerrorStatic(map: maplibregl.Map, infra: Infrastructure[], routes: InfiltrationRoute[], groups: Group[]) {
  (map.getSource("infra") as maplibregl.GeoJSONSource).setData(
    fc(
      infra.map((i) => ({
        type: "Feature",
        properties: { id: i.id, label: i.name, kind: "infra" },
        geometry: { type: "Point", coordinates: [i.lng, i.lat] },
      })),
    ),
  );
  (map.getSource("routes") as maplibregl.GeoJSONSource).setData(
    fc(routes.map((r) => ({ type: "Feature", properties: { id: r.id, label: r.sector }, geometry: { type: "LineString", coordinates: r.path } }))),
  );
  (map.getSource("hqs") as maplibregl.GeoJSONSource).setData(
    fc(
      groups
        .filter((g) => g.hq && g.kind !== "state_military")
        .map((g) => ({
          type: "Feature",
          properties: { id: g.id, label: `${g.name.replace(/ \(.*\)$/, "")} HQ` },
          geometry: { type: "Point", coordinates: [g.hq!.lng, g.hq!.lat] },
        })),
    ),
  );
}

export const LEGEND = Object.values(GROUPS);
