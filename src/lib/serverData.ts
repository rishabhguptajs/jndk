import fs from "node:fs";
import path from "node:path";
import type { Event, Group, GroupZone, Infrastructure, InfiltrationRoute } from "./schema";

const D = path.join(process.cwd(), "data");
const read = <T,>(f: string): T => JSON.parse(fs.readFileSync(path.join(D, f), "utf8"));

export const getEvents = () => read<Event[]>("events.json");
export const getGroups = () => read<Group[]>("groups.json");
export const getZones = () => read<GroupZone[]>("group_zones.json");
export const getInfrastructure = () => read<Infrastructure[]>("infrastructure.json");
export const getRoutes = () => read<InfiltrationRoute[]>("routes.json");
export const getCoverage = () =>
  read<{ year: number; events: number; two_plus_sources_pct: number; village_geocoded_pct: number; killed_min: number; killed_max: number; unknown_toll: number; gap: boolean }[]>(
    "coverage.json",
  );
