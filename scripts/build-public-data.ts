/**
 * Copy validated data into public/ for the static site, and produce download exports.
 *
 *   public/data/events.json, groups.json, group_zones.json, infrastructure.json, routes.json,
 *               coverage.json, districts_index.json, districts/*.geojson
 *   public/data/download/events.csv, events.geojson, groups.csv, sources.csv
 *   public/maplibre/  MapLibre worker (served as a module worker)
 */
import fs from "node:fs";
import path from "node:path";
import type { Event, Group } from "../src/lib/schema";

const ROOT = path.resolve(import.meta.dirname, "..");
const D = path.join(ROOT, "data");
const P = path.join(ROOT, "public/data");
fs.mkdirSync(path.join(P, "download"), { recursive: true });
fs.mkdirSync(path.join(P, "districts"), { recursive: true });

for (const f of ["events.json", "groups.json", "group_zones.json", "infrastructure.json", "routes.json", "coverage.json"])
  if (fs.existsSync(path.join(D, f))) fs.copyFileSync(path.join(D, f), path.join(P, f));
fs.copyFileSync(path.join(D, "districts_by_period/index.json"), path.join(P, "districts_index.json"));
for (const f of fs.readdirSync(path.join(D, "districts_by_period")).filter((f) => f.endsWith(".geojson")))
  fs.copyFileSync(path.join(D, "districts_by_period", f), path.join(P, "districts", f));

const events: Event[] = JSON.parse(fs.readFileSync(path.join(D, "events.json"), "utf8"));
const groups: Group[] = JSON.parse(fs.readFileSync(path.join(D, "groups.json"), "utf8"));

function csv(rows: (string | number | boolean | null | undefined)[][]) {
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}
const r = (x: { min: number | null; max: number | null }) => [x.min, x.max];

fs.writeFileSync(
  path.join(P, "download/events.csv"),
  csv([
    ["id", "date", "end_date", "date_precision", "title", "place_name", "district_at_time", "district_current", "region", "lat", "lng", "geo_precision",
      "category", "tactic", "target_type", "victim_community", "perpetrator_group", "attribution",
      "killed_civilians_min", "killed_civilians_max", "killed_sf_min", "killed_sf_max", "killed_terrorists_min", "killed_terrorists_max",
      "killed_total_min", "killed_total_max", "injured_min", "injured_max", "abducted", "confidence", "source_count", "source_urls", "summary"],
    ...events.map((e) => [
      e.id, e.date, e.end_date, e.date_precision, e.title, e.place_name, e.district_at_time, e.district_current, e.region, e.lat, e.lng, e.geo_precision,
      e.category, e.tactic, e.target_type.join("; "), e.victim_community, e.perpetrator_group.join("; "), e.attribution,
      ...r(e.killed.civilians), ...r(e.killed.security_forces), ...r(e.killed.terrorists), ...r(e.killed.total), ...r(e.injured), e.abducted,
      e.confidence, e.sources.length, e.sources.map((s) => s.url ?? s.title).join(" | "), e.summary,
    ]),
  ]),
);
fs.writeFileSync(
  path.join(P, "download/events.geojson"),
  JSON.stringify({
    type: "FeatureCollection",
    features: events.map((e) => ({ type: "Feature", properties: { ...e, lat: undefined, lng: undefined }, geometry: { type: "Point", coordinates: [e.lng, e.lat] } })),
  }),
);
fs.writeFileSync(
  path.join(P, "download/groups.csv"),
  csv([
    ["id", "name", "kind", "aliases", "founded", "parent", "relationship", "hq", "sponsor", "india_uapa_ban", "un_1267", "us_fto", "active_from", "active_to", "status"],
    ...groups.map((g) => [g.id, g.name, g.kind, g.aliases.join("; "), g.founded, g.parent, g.relationship_to_parent, g.hq?.name, g.sponsor,
      g.bans.india_uapa?.date, g.bans.un_1267?.date, g.bans.us_fto?.date, g.active_years.from, g.active_years.to, g.status]),
  ]),
);
const seen = new Map<string, { publisher: string; title: string; url: string | null; archive: string | null; checked: boolean; events: string[] }>();
for (const e of events)
  for (const s of e.sources) {
    const k = s.id;
    if (!seen.has(k)) seen.set(k, { publisher: s.publisher, title: s.title, url: s.url, archive: s.archive_url, checked: s.archive_checked, events: [] });
    seen.get(k)!.events.push(e.id);
  }
fs.writeFileSync(
  path.join(P, "download/sources.csv"),
  csv([["source_id", "publisher", "title", "url", "archive_url", "archive_verified", "cited_by"], ...[...seen].map(([id, s]) => [id, s.publisher, s.title, s.url, s.archive, s.checked, s.events.join("; ")])]),
);

fs.mkdirSync(path.join(ROOT, "public/maplibre"), { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"])
  fs.copyFileSync(path.join(ROOT, "node_modules/maplibre-gl/dist", f), path.join(ROOT, "public/maplibre", f));

console.log(`public data: ${events.length} events, ${groups.length} groups, ${seen.size} cited sources`);
