/**
 * Compile the hand-authored YAML in data/authoring into the canonical JSON files in /data.
 *
 *   data/authoring/sources/*.yaml   source registry (id -> url, publisher, title, date, kind)
 *   data/authoring/events/*.yaml    events, compact form (see data/authoring/README.md)
 *   data/authoring/groups.yaml, group_zones.yaml, infrastructure.yaml, routes.yaml
 *
 * Output: data/events.json, data/groups.json, data/group_zones.json,
 *         data/infrastructure.json, data/routes.json
 *
 * Every output is validated with the zod schemas. Any error fails the run.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import {
  Event,
  EventsFile,
  GroupsFile,
  GroupZonesFile,
  InfrastructureFile,
  RoutesFile,
  type Range,
  type Source,
} from "../src/lib/schema";

const ROOT = path.resolve(import.meta.dirname, "..");
const A = path.join(ROOT, "data/authoring");
const errors: string[] = [];

function readYamlDir(dir: string): unknown[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => ({ file: f, doc: YAML.parse(fs.readFileSync(path.join(dir, f), "utf8")) }))
    .flatMap(({ file, doc }) => (Array.isArray(doc) ? doc.map((d) => ({ ...d, __file: file })) : doc ? [{ ...doc, __file: file }] : []));
}

/* ---------- sources ---------- */
type RawSource = { url?: string | null; archive_url?: string; archive_checked?: boolean; publisher: string; title: string; date?: string | null; pages?: string; kind: Source["kind"] };
const registry = new Map<string, RawSource>();
for (const doc of readYamlDir(path.join(A, "sources")) as Record<string, RawSource & { __file: string }>[]) {
  for (const [id, s] of Object.entries(doc)) {
    if (id === "__file") continue;
    if (registry.has(id)) errors.push(`duplicate source id ${id}`);
    registry.set(id, s);
  }
}

const archiveState: Record<string, { archive_url: string; checked: boolean }> = fs.existsSync(path.join(ROOT, "data/archive_state.json"))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, "data/archive_state.json"), "utf8"))
  : {};

export function waybackLookup(url: string) {
  return `https://web.archive.org/web/${url}`;
}

function src(id: string, ctx: string): Source {
  const s = registry.get(id);
  if (!s) {
    errors.push(`${ctx}: unknown source ${id}`);
    return { id: "missing", url: null, archive_url: null, archive_checked: false, publisher: "?", title: "?", date: null, kind: "book" };
  }
  const url = s.url ?? null;
  const known = url ? archiveState[url] : undefined;
  return {
    id,
    url,
    archive_url: url ? (s.archive_url ?? known?.archive_url ?? waybackLookup(url)) : null,
    archive_checked: url ? (s.archive_checked ?? known?.checked ?? false) : false,
    publisher: s.publisher,
    title: s.title,
    date: s.date ? String(s.date) : null,
    pages: s.pages ?? null,
    kind: s.kind,
  };
}

/* ---------- gazetteer ---------- */
type Gaz = { name: string; lat: number; lng: number; precision: string };
const gazetteer: Record<string, Gaz> = JSON.parse(fs.readFileSync(path.join(ROOT, "data/gazetteer.json"), "utf8"));

/* ---------- counts ---------- */
function range(v: unknown, ctx: string): Range {
  if (v === null || v === undefined) return { min: null, max: null };
  if (typeof v === "number") return { min: v, max: v };
  const m = String(v).match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) return { min: +m[1], max: +m[2] };
  errors.push(`${ctx}: bad count ${JSON.stringify(v)}`);
  return { min: null, max: null };
}

/* ---------- events ---------- */
type RawEvent = Record<string, any> & { __file: string };
const rawEvents = readYamlDir(path.join(A, "events")) as RawEvent[];
const events: Event[] = [];

for (const r of rawEvents) {
  const ctx = `${r.__file}:${r.id}`;
  let lat: number, lng: number, precision: string;
  if (r.at) {
    const g = gazetteer[r.at];
    if (!g) {
      errors.push(`${ctx}: unknown gazetteer key ${r.at}`);
      continue;
    }
    lat = g.lat;
    lng = g.lng;
    precision = r.geo ?? g.precision;
    // An event may not claim more precision than its gazetteer point.
    const order = ["exact", "village", "tehsil", "district", "region"];
    if (order.indexOf(precision) < order.indexOf(g.precision)) errors.push(`${ctx}: claims ${precision} but ${r.at} is ${g.precision}`);
  } else if (r.coords) {
    [lat, lng] = r.coords;
    precision = r.geo;
    if (!r.coords_source) errors.push(`${ctx}: explicit coords need coords_source`);
  } else {
    errors.push(`${ctx}: needs at or coords`);
    continue;
  }
  const k = r.killed ?? {};
  const [dAt, dNow] = Array.isArray(r.district) ? r.district : [r.district ?? null, r.district ?? null];
  const sources = (r.src as string[]).map((id) => src(id, ctx));
  const figures = Object.entries((r.figures ?? {}) as Record<string, Record<string, number | null | string>>).map(([sid, f]) => ({
    source_id: sid,
    ...(f.total !== undefined ? { killed_total: f.total as number | null } : {}),
    ...(f.civ !== undefined ? { killed_civilians: f.civ as number | null } : {}),
    ...(f.sf !== undefined ? { killed_security_forces: f.sf as number | null } : {}),
    ...(f.terr !== undefined ? { killed_terrorists: f.terr as number | null } : {}),
    ...(f.injured !== undefined ? { injured: f.injured as number | null } : {}),
    ...(f.note ? { note: String(f.note) } : {}),
  }));
  const ev = {
    id: r.id,
    date: String(r.date),
    end_date: r.end ? String(r.end) : null,
    date_precision: r.dp ?? (String(r.date).length === 10 ? "day" : String(r.date).length === 7 ? "month" : "year"),
    time: r.time ?? null,
    title: r.title,
    place_name: r.place,
    district_at_time: dAt,
    district_current: dNow,
    region: r.region,
    lat,
    lng,
    geo_precision: precision,
    category: r.cat,
    tactic: r.tactic ?? null,
    target_type: r.target,
    victim_community: r.community ?? null,
    perpetrator_group: r.perp ?? [],
    attribution: r.attr ?? "unknown",
    killed: {
      civilians: range(k.civ, ctx),
      security_forces: range(k.sf, ctx),
      terrorists: range(k.terr, ctx),
      total: range(k.total, ctx),
    },
    injured: range(r.injured, ctx),
    abducted: r.abducted ?? null,
    displaced: r.displaced !== undefined ? range(r.displaced, ctx) : null,
    figures_by_source: figures,
    victims: (r.victims ?? []).map((v: any) => ({ name: v.name, age: v.age ?? null, role: v.role ?? null, source_id: v.src })),
    summary: String(r.summary ?? "").trim().replace(/\s+/g, " "),
    sources,
    confidence: r.conf,
    high_profile: r.hp ?? false,
    cross_border: r.cross_border ?? r.region === "Outside J&K",
    tags: r.tags ?? [],
    notes: r.notes ? String(r.notes).trim().replace(/\s+/g, " ") : null,
  };
  const parsed = Event.safeParse(ev);
  if (!parsed.success) {
    for (const i of parsed.error.issues) errors.push(`${ctx}: ${i.path.join(".")} ${i.message}`);
    continue;
  }
  events.push(parsed.data);
}

/* ---------- duplicates ---------- */
const ids = new Set<string>();
const dedupe = new Map<string, string>();
for (const e of events) {
  if (ids.has(e.id)) errors.push(`duplicate event id ${e.id}`);
  ids.add(e.id);
  // Same date + same place + same toll is treated as a duplicate (see methodology).
  const key = `${e.date}|${e.place_name.toLowerCase()}|${e.killed.total.min}-${e.killed.total.max}`;
  if (dedupe.has(key) && !e.tags.includes("distinct-same-day")) errors.push(`possible duplicate: ${e.id} and ${dedupe.get(key)}`);
  dedupe.set(key, e.id);
}
events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

/* ---------- groups and terror infrastructure ---------- */
function expandSources<T extends { src?: string[] }>(items: T[], kind: string) {
  return items.map((it: any) => {
    const { __file, src: s, ...rest } = it;
    return { ...rest, sources: (s ?? []).map((id: string) => src(id, `${kind}:${it.id ?? it.group_id}`)) };
  });
}
function one(file: string) {
  const p = path.join(A, file);
  if (!fs.existsSync(p)) return [];
  return (YAML.parse(fs.readFileSync(p, "utf8")) ?? []).map((d: object) => ({ ...d, __file: file }));
}
const groups = GroupsFile.safeParse(expandSources(one("groups.yaml"), "group"));
const zones = GroupZonesFile.safeParse(
  expandSources(one("group_zones.yaml"), "zone").map((z: any) => ({ ...z, source_ids: z.sources.map((s: Source) => s.id) })),
);
const infra = InfrastructureFile.safeParse(expandSources(one("infrastructure.yaml"), "infra"));
const routes = RoutesFile.safeParse(expandSources(one("routes.yaml"), "route"));
for (const [name, res] of [["groups", groups], ["group_zones", zones], ["infrastructure", infra], ["routes", routes]] as const) {
  if (!res.success) for (const i of res.error.issues) errors.push(`${name}: ${i.path.join(".")} ${i.message}`);
}

// Perpetrators must be registered groups, or prefixed "unidentified" / "pakistan-army" style ids that exist in the registry.
if (groups.success) {
  const gids = new Set(groups.data.map((g) => g.id));
  for (const e of events) for (const p of e.perpetrator_group) if (!gids.has(p)) errors.push(`${e.id}: perpetrator ${p} not in groups.yaml`);
  if (zones.success) for (const z of zones.data) if (!gids.has(z.group_id)) errors.push(`zone: unknown group ${z.group_id}`);
  if (infra.success) for (const i of infra.data) for (const g of i.group_ids) if (!gids.has(g)) errors.push(`infra ${i.id}: unknown group ${g}`);
  for (const g of groups.data) if (g.parent && !gids.has(g.parent)) errors.push(`group ${g.id}: unknown parent ${g.parent}`);
}

if (errors.length) {
  console.error(`\n${errors.length} data error(s):\n  ` + errors.join("\n  "));
  process.exit(1);
}

EventsFile.parse(events);
const out = (f: string, d: unknown) => fs.writeFileSync(path.join(ROOT, "data", f), JSON.stringify(d, null, 1) + "\n");
out("events.json", events);
out("groups.json", groups.success ? groups.data : []);
out("group_zones.json", zones.success ? zones.data : []);
out("infrastructure.json", infra.success ? infra.data : []);
out("routes.json", routes.success ? routes.data : []);
console.log(
  `compiled ${events.length} events, ${groups.success ? groups.data.length : 0} groups, ${zones.success ? zones.data.length : 0} zone-years, ` +
    `${infra.success ? infra.data.length : 0} infrastructure sites, ${routes.success ? routes.data.length : 0} routes, ${registry.size} sources`,
);
