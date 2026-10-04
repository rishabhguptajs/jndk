"use client";
import { useEffect, useState } from "react";
import type { Event, Group, GroupZone, Infrastructure, InfiltrationRoute } from "./schema";
import type { DistrictPeriod } from "./analysis";

export type AtlasData = {
  events: Event[];
  groups: Group[];
  zones: GroupZone[];
  infrastructure: Infrastructure[];
  routes: InfiltrationRoute[];
  periods: DistrictPeriod[];
};

let cache: Promise<AtlasData> | null = null;

export function loadAtlasData(): Promise<AtlasData> {
  if (!cache) {
    const j = <T,>(p: string) => fetch(p).then((r) => r.json() as Promise<T>);
    cache = Promise.all([
      j<Event[]>("/data/events.json"),
      j<Group[]>("/data/groups.json"),
      j<GroupZone[]>("/data/group_zones.json"),
      j<Infrastructure[]>("/data/infrastructure.json"),
      j<InfiltrationRoute[]>("/data/routes.json"),
      j<DistrictPeriod[]>("/data/districts_index.json"),
    ]).then(([events, groups, zones, infrastructure, routes, periods]) => ({ events, groups, zones, infrastructure, routes, periods }));
  }
  return cache;
}

export function useAtlasData() {
  const [data, setData] = useState<AtlasData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadAtlasData().then(setData, (e) => setError(String(e)));
  }, []);
  return { data, error };
}
