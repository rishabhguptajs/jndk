/**
 * Match scraped candidates (SATP, GTD) against curated events and list the gaps.
 *
 *   tsx scripts/sources/match-candidates.ts
 *
 * A candidate matches an event when the dates are within one day and either the
 * district matches or the death tolls overlap. Unmatched candidates with one or
 * more deaths are written to data/candidates/unmatched.json, sorted by toll, as
 * the work queue for the next research pass. This is how incident-level
 * completeness is tracked.
 */
import fs from "node:fs";
import path from "node:path";
import type { Candidate } from "./satp";
import type { Event } from "../../src/lib/schema";

const ROOT = path.resolve(import.meta.dirname, "../..");
const events: Event[] = JSON.parse(fs.readFileSync(path.join(ROOT, "data/events.json"), "utf8"));
const cands: Candidate[] = ["satp", "gtd"].flatMap((s) => {
  const f = path.join(ROOT, `data/candidates/${s}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : [];
});

const day = (s: string) => Date.parse(s.length === 10 ? s : s.length === 7 ? `${s}-15` : `${s}-07-01`) / 864e5;
export function matches(c: Candidate, e: Event) {
  if (Math.abs(day(c.date) - day(e.date)) > 1) return false;
  const d = c.district_hint?.toLowerCase();
  if (d && [e.district_current, e.district_at_time].some((x) => x?.toLowerCase() === d)) return true;
  if (c.killed !== null && e.killed.total.min !== null && c.killed >= e.killed.total.min && c.killed <= (e.killed.total.max ?? 0)) return true;
  return false;
}

const unmatched = cands.filter((c) => !events.some((e) => matches(c, e)));
unmatched.sort((a, b) => (b.killed ?? 0) - (a.killed ?? 0));
fs.writeFileSync(path.join(ROOT, "data/candidates/unmatched.json"), JSON.stringify(unmatched, null, 1));
console.log(`${cands.length} candidates, ${cands.length - unmatched.length} matched, ${unmatched.length} unmatched (${unmatched.filter((c) => (c.killed ?? 0) > 0).length} with deaths)`);
