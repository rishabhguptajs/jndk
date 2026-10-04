"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as maplibregl from "maplibre-gl";
import { createMap } from "@/lib/createMap";
import { useAtlasData } from "@/lib/useAtlasData";
import { applyFilters, EMPTY_FILTERS, type Filters } from "@/lib/filters";
import { monthIndex, periodFor, fmtDate, fmtRange, yearOf, hotspots } from "@/lib/analysis";
import { GROUPS, GROUP_ORDER, colorOf } from "@/lib/categories";
import {
  addAtlasLayers,
  setChoropleth,
  setEvents,
  setHotspot,
  setSelected,
  setTerrorStatic,
  setVisible,
  setZones,
  onMap,
} from "@/lib/mapLayers";
import { Timeline, T_MAX, tYear, type TimeState } from "./Timeline";
import { FilterPanel } from "./FilterPanel";
import { EventDetail } from "./EventDetail";
import { JK_BOUNDS } from "@/lib/mapStyle";

type Mode = "markers" | "heatmap" | "choropleth";
type Tab = "filters" | "list" | "layers";

export function Atlas() {
  const { data, error } = useAtlasData();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [time, setTimeState] = useState<TimeState>({ t: T_MAX, playing: false, speed: 1, resolution: "year", mode: "cumulative" });
  const setTime = useCallback((fn: (t: TimeState) => TimeState) => setTimeState(fn), []);
  const [selected, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("markers");
  const [tab, setTab] = useState<Tab>("filters");
  const [overlays, setOverlays] = useState({ hotspot: false, zones: false, infra: false, routes: false, hqs: false, loc: false, lac: false });
  const [zoneGroup, setZoneGroup] = useState<string>("");
  const [legendOpen, setLegendOpen] = useState(true);
  useEffect(() => {
    if (window.innerWidth < 900) setLegendOpen(false);
  }, []);

  // URL state: ?event=<id>
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const ev = p.get("event");
    if (ev) setSelectedId(ev);
    const grp = p.get("group");
    if (grp) setFilters((f) => ({ ...f, perpetrators: [grp] }));
    const y = Number(p.get("year"));
    if (y >= 1947 && y <= 2026) setTimeState((s) => ({ ...s, t: Math.min(T_MAX, (y - 1947) * 12 + 11) }));
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set("event", selected);
    else url.searchParams.delete("event");
    window.history.replaceState(null, "", url);
  }, [selected]);

  // Map
  useEffect(() => {
    if (!ref.current) return;
    const map = createMap(ref.current, { intro: !new URLSearchParams(window.location.search).get("event") });
    mapRef.current = map;
    map.on("load", () => {
      addAtlasLayers(map);
      setReady(true);
    });
    map.on("click", "event-points", (e) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) setSelectedId(id);
    });
    map.on("click", "clusters", async (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const src = map.getSource("events") as maplibregl.GeoJSONSource;
      const zoom = await src.getClusterExpansionZoom(f.properties!.cluster_id as number);
      map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
    });
    let popup: maplibregl.Popup | null = null;
    map.on("mousemove", "event-points", async (e) => {
      map.getCanvas().style.cursor = "pointer";
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const { Popup } = await import("maplibre-gl");
      popup?.remove();
      popup = new Popup({ closeButton: false, offset: 10 })
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${escapeHtml(p.title)}</strong><br/>${escapeHtml(p.date)}<br/>Killed: ${escapeHtml(p.tollLabel)}`)
        .addTo(map);
    });
    map.on("mouseleave", "event-points", () => {
      map.getCanvas().style.cursor = "";
      popup?.remove();
    });
    for (const id of ["clusters"]) {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
    }
    return () => map.remove();
  }, []);

  const groupNames = useMemo(() => Object.fromEntries((data?.groups ?? []).map((g) => [g.id, g.name])), [data]);
  const filtered = useMemo(() => (data ? applyFilters(data.events, filters, groupNames) : []), [data, filters, groupNames]);
  const visible = useMemo(() => {
    if (time.t >= T_MAX && time.mode === "cumulative") return filtered;
    return filtered.filter((e) => {
      const m = monthIndex(e);
      if (time.mode === "cumulative") return m <= time.t;
      if (time.resolution === "year") return yearOf(e) === tYear(time.t);
      return m === time.t;
    });
  }, [filtered, time]);
  const year = tYear(time.t);
  const selectedEvent = data?.events.find((e) => e.id === selected) ?? null;

  // Push data to the map
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !data) return;
    setEvents(map, visible);
  }, [ready, visible, data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    setSelected(map, selected);
    if (selectedEvent && selectedEvent.region !== "Outside J&K") {
      map.easeTo({ center: [selectedEvent.lng, selectedEvent.lat], zoom: Math.max(map.getZoom(), 7), duration: 900 });
    }
  }, [ready, selected, selectedEvent]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    setVisible(map, ["event-points", "clusters", "cluster-count"], mode === "markers");
    setVisible(map, ["events-heat"], mode === "heatmap");
    setVisible(map, ["districts-fill", "districts-line"], mode === "choropleth");
    setVisible(map, ["hotspot-trail", "hotspot-points", "hotspot-label"], overlays.hotspot);
    setVisible(map, ["zones-fill", "zones-line"], overlays.zones);
    setVisible(map, ["infra-points", "infra-label"], overlays.infra);
    setVisible(map, ["routes-line"], overlays.routes);
    setVisible(map, ["hq-points", "hq-label"], overlays.hqs);
    setVisible(map, ["loc-line", "loc-label"], overlays.loc);
    setVisible(map, ["lac-line", "lac-label"], overlays.lac);
  }, [ready, mode, overlays]);

  // Choropleth for the district boundaries in force in the current year
  const period = data ? periodFor(data.periods, year) : null;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !data || mode !== "choropleth" || !period) return;
    const counts = new Map<string, number>();
    const pool = time.mode === "window" ? visible : filtered.filter((e) => yearOf(e) === year);
    for (const e of pool) {
      const d = e.district_at_time ?? e.district_current;
      if (!d) continue;
      counts.set(d, (counts.get(d) ?? 0) + Math.max(1, e.killed.total.min ?? 0));
    }
    setChoropleth(map, period.file, counts);
  }, [ready, data, mode, period, filtered, visible, year, time.mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !data) return;
    if (overlays.hotspot) setHotspot(map, filtered, year);
    if (overlays.zones) setZones(map, period?.file ?? "jk_ladakh_2019_present.geojson", data.zones, year, zoneGroup || null);
    setTerrorStatic(map, data.infrastructure, data.routes, data.groups);
  }, [ready, data, overlays, filtered, year, period, zoneGroup]);

  const hs = useMemo(() => (overlays.hotspot ? hotspots(filtered).filter((p) => p.year <= year).slice(-1)[0] : null), [overlays.hotspot, filtered, year]);

  if (error) return <p className="page">Could not load data: {error}</p>;

  return (
    <div className="atlas">
      <aside className="atlas-filters" aria-label="Atlas controls">
        <div className="chips" role="tablist" aria-label="Panels" style={{ marginBottom: 12 }}>
          {(["filters", "list", "layers"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className="chip" aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t === "filters" ? "Filter and search" : t === "list" ? `List (${visible.length})` : "Layers"}
            </button>
          ))}
        </div>
        {data && tab === "filters" && <FilterPanel events={data.events} groups={data.groups} filters={filters} setFilters={setFilters} shown={filtered.length} />}
        {data && tab === "list" && (
          <div>
            <p className="faint" style={{ fontSize: "0.78rem" }}>
              Events shown on the map for the current filters and timeline, newest first. Select one to open its card.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[...visible].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
                <li key={e.id} style={{ borderBottom: "1px solid var(--line)", padding: "6px 0" }}>
                  <button
                    onClick={() => setSelectedId(e.id)}
                    style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}
                    aria-label={`${e.title}, ${fmtDate(e)}, killed ${fmtRange(e.killed.total)}`}
                  >
                    <span className="swatch" style={{ background: colorOf(e.category), marginRight: 6 }} aria-hidden />
                    <span style={{ fontSize: "0.85rem" }}>{e.title}</span>
                    <br />
                    <span className="faint" style={{ fontSize: "0.75rem" }}>
                      {fmtDate(e)} · killed {fmtRange(e.killed.total)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data && tab === "layers" && (
          <div>
            <fieldset className="filter-group">
              <legend>Map mode</legend>
              <div className="chips">
                {(["markers", "heatmap", "choropleth"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    className="chip"
                    aria-pressed={mode === m}
                    onClick={() => {
                      setMode(m);
                      if (m !== "markers") mapRef.current?.fitBounds(JK_BOUNDS, { padding: 30 });
                    }}
                  >
                    {m === "markers" ? "Markers" : m === "heatmap" ? "Heatmap" : "Districts"}
                  </button>
                ))}
              </div>
              {mode === "choropleth" && period && (
                <p className="faint" style={{ fontSize: "0.75rem" }}>
                  Deaths recorded in {time.mode === "window" ? "the current window" : year}, on {period.file ? `the district map in force in ${year}` : "no map"}.{" "}
                  {period.note}
                </p>
              )}
            </fieldset>
            <fieldset className="filter-group">
              <legend>Overlays</legend>
              <div className="chips">
                {(
                  [
                    ["hotspot", "Hotspot drift"],
                    ["zones", "Group zones"],
                    ["infra", "Camps and launch pads"],
                    ["hqs", "Group HQs"],
                    ["routes", "Infiltration routes"],
                    ["loc", "Line of Control"],
                    ["lac", "LAC"],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    className="chip"
                    aria-pressed={overlays[k]}
                    onClick={() => {
                      if (!overlays[k]) {
                        const wide = k === "infra" || k === "hqs";
                        mapRef.current?.fitBounds(wide ? [[69.5, 28.8], [80.6, 37.2]] : JK_BOUNDS, { padding: 30 });
                      }
                      setOverlays((o) => ({ ...o, [k]: !o[k] }));
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {overlays.zones && (
                <label className="filter-label" style={{ marginTop: 8 }}>
                  Group
                  <select value={zoneGroup} onChange={(e) => setZoneGroup(e.target.value)}>
                    <option value="">All groups</option>
                    {data.groups
                      .filter((g) => g.kind === "terror_group" || g.kind === "front")
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <p className="faint" style={{ fontSize: "0.75rem" }}>
                Group zones show districts where an event in {year} is attributed to the group in this dataset. Camps, launch pads and HQs are
                shown at area level only, as publicly reported. Routes are schematic. The Line of Control and LAC are military lines, not borders.
              </p>
            </fieldset>
            {hs && (
              <p className="callout" style={{ fontSize: "0.8rem" }}>
                Toll-weighted centre of recorded violence in {hs.year}: {hs.lat.toFixed(2)}°N, {hs.lng.toFixed(2)}°E, from {hs.n} events.
              </p>
            )}
          </div>
        )}
      </aside>

      <section className="atlas-map" aria-label="Map of Jammu & Kashmir and Ladakh">
        <div ref={ref} className="map-canvas" aria-label="Interactive map. Use the List panel for a keyboard-accessible list of the events shown." role="region" />
        <div className="map-controls">
          <button className="btn" onClick={() => mapRef.current?.fitBounds(JK_BOUNDS, { padding: 30 })}>
            J&amp;K and Ladakh
          </button>
          <button className="btn" onClick={() => mapRef.current?.fitBounds([[67.5, 6], [98, 37.5]], { padding: 20 })}>
            All India
          </button>
        </div>
        <details className="legend" open={legendOpen} onToggle={(e) => setLegendOpen((e.target as HTMLDetailsElement).open)}>
          <summary style={{ cursor: "pointer" }}>Legend</summary>
          <ul>
            {GROUP_ORDER.map((g) => (
              <li key={g}>
                <span
                  className="swatch"
                  style={g === "war" ? { border: `2px solid ${GROUPS[g].color}`, background: "transparent" } : { background: GROUPS[g].color }}
                  aria-hidden
                />
                {GROUPS[g].label}
              </li>
            ))}
            <li className="faint">Size shows the number killed. Faded markers are placed at district or region level only. Grey numbered circles group nearby events.</li>
          </ul>
        </details>
        {selectedEvent && data && (
          <div className="event-panel" role="dialog" aria-label={selectedEvent.title}>
            <button className="btn" onClick={() => setSelectedId(null)} style={{ float: "right" }} aria-label="Close event card">
              Close
            </button>
            <EventDetail e={selectedEvent} groups={data.groups} />
          </div>
        )}
        <div className="map-note">
          {visible.length} events match; {visible.filter(onMap).length} have map markers (policy milestones are on the timeline)
        </div>
      </section>

      <section className="atlas-timeline" aria-label="Timeline">
        {data && <Timeline events={filtered} allEvents={data.events} time={time} setTime={setTime} />}
      </section>
    </div>
  );
}

function escapeHtml(s: unknown) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
