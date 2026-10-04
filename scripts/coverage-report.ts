/**
 * Coverage report per year: event count, share with 2+ independent sources,
 * share geocoded to village level or better, and deaths recorded.
 *
 *   tsx scripts/coverage-report.ts [fromYear] [toYear]
 *
 * Writes data/coverage.json (used by the methodology page) and
 * docs/coverage/coverage-<from>-<to>.md.
 */
import fs from "node:fs";
import path from "node:path";
import type { Event } from "../src/lib/schema";

const ROOT = path.resolve(import.meta.dirname, "..");
const events: Event[] = JSON.parse(fs.readFileSync(path.join(ROOT, "data/events.json"), "utf8"));
const from = Number(process.argv[2] ?? 1947);
const to = Number(process.argv[3] ?? 2026);

const indep = (e: Event) => new Set(e.sources.filter((s) => s.kind !== "reference").map((s) => s.publisher.toLowerCase())).size;
const village = (e: Event) => e.geo_precision === "exact" || e.geo_precision === "village";

type Row = { year: number; events: number; two_plus_sources_pct: number; village_geocoded_pct: number; killed_min: number; killed_max: number; unknown_toll: number; gap: boolean };
const rows: Row[] = [];
for (let y = 1947; y <= 2026; y++) {
  const es = events.filter((e) => Number(e.date.slice(0, 4)) === y);
  const pct = (f: (e: Event) => boolean) => (es.length ? Math.round((100 * es.filter(f).length) / es.length) : 0);
  rows.push({
    year: y,
    events: es.length,
    two_plus_sources_pct: pct((e) => indep(e) >= 2),
    village_geocoded_pct: pct(village),
    killed_min: es.reduce((a, e) => a + (e.killed.total.min ?? 0), 0),
    killed_max: es.reduce((a, e) => a + (e.killed.total.max ?? 0), 0),
    unknown_toll: es.filter((e) => e.killed.total.min === null).length,
    gap: es.length === 0,
  });
}
fs.writeFileSync(path.join(ROOT, "data/coverage.json"), JSON.stringify(rows, null, 1));

const sel = rows.filter((r) => r.year >= from && r.year <= to);
const all = events.filter((e) => +e.date.slice(0, 4) >= from && +e.date.slice(0, 4) <= to);
const lines = [
  `# Coverage report, ${from} to ${to}`,
  "",
  `Generated ${new Date().toISOString().slice(0, 10)} from data/events.json.`,
  "",
  `- Events: ${all.length}`,
  `- With 2+ independent sources: ${all.filter((e) => indep(e) >= 2).length} (${Math.round((100 * all.filter((e) => indep(e) >= 2).length) / Math.max(1, all.length))}%)`,
  `- Geocoded to village or better: ${all.filter(village).length} (${Math.round((100 * all.filter(village).length) / Math.max(1, all.length))}%)`,
  `- Confidence: ${["confirmed", "reported", "disputed"].map((c) => `${c} ${all.filter((e) => e.confidence === c).length}`).join(", ")}`,
  `- Archive links verified: ${all.flatMap((e) => e.sources).filter((s) => s.archive_checked).length} of ${all.flatMap((e) => e.sources).filter((s) => s.url).length}`,
  `- Years with no events recorded (coverage gaps): ${sel.filter((r) => r.gap).map((r) => r.year).join(", ") || "none"}`,
  "",
  "| Year | Events | 2+ sources | Village geocoded | Killed (min to max) | Toll unknown |",
  "|---|---|---|---|---|---|",
  ...sel.filter((r) => !r.gap).map((r) => `| ${r.year} | ${r.events} | ${r.two_plus_sources_pct}% | ${r.village_geocoded_pct}% | ${r.killed_min === r.killed_max ? r.killed_min : `${r.killed_min} to ${r.killed_max}`} | ${r.unknown_toll} |`),
  "",
];
fs.mkdirSync(path.join(ROOT, "docs/coverage"), { recursive: true });
const out = path.join(ROOT, `docs/coverage/coverage-${from}-${to}.md`);
fs.writeFileSync(out, lines.join("\n"));
console.log(lines.slice(4, 11).join("\n"));
console.log("wrote", path.relative(ROOT, out));
