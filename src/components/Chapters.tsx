"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type * as maplibregl from "maplibre-gl";
import { createMap } from "@/lib/createMap";
import { addAtlasLayers, setEvents, setHotspot, setVisible, setTerrorStatic } from "@/lib/mapLayers";
import { loadAtlasData, type AtlasData } from "@/lib/useAtlasData";
import { yearOf } from "@/lib/analysis";
import { CHAPTERS } from "@/lib/chapters";

export function Chapters() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [data, setData] = useState<AtlasData | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    loadAtlasData().then(setData);
    if (!ref.current) return;
    const map = createMap(ref.current, { intro: false, interactive: true });
    mapRef.current = map;
    map.on("load", () => {
      addAtlasLayers(map);
      setReady(true);
    });
    return () => map.remove();
  }, []);

  // Pin the map just below the site nav, whose height changes when it wraps on small screens.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".site-nav");
    const root = document.querySelector<HTMLElement>(".chapters");
    if (!nav || !root) return;
    const ro = new ResizeObserver(() => root.style.setProperty("--nav-h", `${nav.offsetHeight}px`));
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".chapter");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      // On narrow screens the map covers the top of the viewport, so read the chapter below it.
      { rootMargin: window.matchMedia("(max-width: 900px)").matches ? "-62% 0px -28% 0px" : "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !data) return;
    const ch = CHAPTERS[active];
    const es = data.events.filter((e) => yearOf(e) >= ch.years[0] && yearOf(e) <= ch.years[1]);
    setEvents(map, es);
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    map.fitBounds(ch.bounds, { padding: 30, duration: reduced ? 0 : 1800 });
    const drift = ch.id === "2021-2024";
    if (drift) setHotspot(map, data.events.filter((e) => yearOf(e) >= 2000), 2026);
    setVisible(map, ["hotspot-trail", "hotspot-points", "hotspot-label"], drift);
    const sindoor = ch.id === "2025" || ch.id === "2019";
    setTerrorStatic(map, data.infrastructure.filter((i) => (ch.id === "2025" ? i.struck_in.includes("op-sindoor-2025") : i.struck_in.includes("balakot-2019"))), [], []);
    setVisible(map, ["infra-points", "infra-label"], sindoor);
  }, [active, ready, data]);

  const evById = (id: string) => data?.events.find((e) => e.id === id);

  return (
    <div className="chapters">
      <div className="chapter-text">
        <header style={{ paddingTop: 40 }}>
          <h1 style={{ fontSize: "2rem" }}>Chapters</h1>
          <p className="muted">
            Eleven chapters from 1947 to 2026. Scroll to move through time; the map shows the events recorded for each period. Every chapter links to
            the event cards behind it.
          </p>
        </header>
        {CHAPTERS.map((c, i) => (
          <section key={c.id} className={`chapter ${i === active ? "active" : ""}`} data-index={i} aria-labelledby={`ch-${c.id}`}>
            <p className="faint" style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {c.years[0] === c.years[1] ? c.years[0] : `${c.years[0]} to ${c.years[1]}`}
            </p>
            <h2 id={`ch-${c.id}`}>{c.title}</h2>
            {c.body.map((p, k) => (
              <p key={k}>{p}</p>
            ))}
            <ul style={{ fontSize: "0.85rem", paddingLeft: 18 }}>
              {c.events.map((id) => {
                const e = evById(id);
                return (
                  <li key={id}>
                    <Link href={`/event/${id}/`}>{e?.title ?? id}</Link>
                  </li>
                );
              })}
            </ul>
            <p style={{ fontSize: "0.85rem" }}>
              <Link href={`/?year=${c.years[1]}`}>Open {c.years[1]} in the atlas</Link>
            </p>
          </section>
        ))}
      </div>
      <div className="chapter-map" role="region" aria-label="Map of the events in the current chapter">
        <div ref={ref} style={{ position: "absolute", inset: 0 }} />
      </div>
    </div>
  );
}
