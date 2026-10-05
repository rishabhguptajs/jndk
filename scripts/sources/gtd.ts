/**
 * Global Terrorism Database (START, University of Maryland) parser.
 *
 *   tsx scripts/sources/gtd.ts <path-to-globalterrorismdb.xlsx|csv>
 *
 * The GTD is distributed on request under START's terms, which do not allow
 * redistribution of the raw file. Download it yourself from
 * https://www.start.umd.edu/gtd/ and keep it out of git (data/raw/gtd/ is ignored).
 * This script keeps only Indian incidents in Jammu and Kashmir and writes
 * candidate leads to data/candidates/gtd.json for matching and review.
 *
 * STATUS: written against the documented GTD codebook fields; not yet run here
 * because the GTD file cannot be fetched from the build environment.
 */
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import type { Candidate } from "./satp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const file = process.argv[2];
if (!file) {
  console.log("usage: tsx scripts/sources/gtd.ts <globalterrorismdb.xlsx|csv>");
  process.exit(0);
}
const wb = XLSX.read(fs.readFileSync(file), { type: "buffer", dense: true });
const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });

const n = (v: unknown) => (v === "" || v === null || v === undefined || Number(v) < 0 ? null : Number(v));
const out: Candidate[] = [];
for (const r of rows) {
  if (r.country_txt !== "India") continue;
  if (!/jammu|kashmir|ladakh/i.test(String(r.provstate))) continue;
  const m = Number(r.imonth), d = Number(r.iday);
  const date = `${r.iyear}${m ? "-" + String(m).padStart(2, "0") : ""}${m && d ? "-" + String(d).padStart(2, "0") : ""}`;
  out.push({
    source: "gtd",
    source_url: `https://www.start.umd.edu/gtd/search/IncidentSummary.aspx?gtdid=${r.eventid}`,
    source_ref: String(r.eventid),
    date,
    place_hint: String(r.city || "") || null,
    district_hint: null,
    killed: n(r.nkill),
    killed_sf: null,
    killed_civ: null,
    killed_terr: n(r.nkillter),
    injured: n(r.nwound),
    group_hint: String(r.gname || "") || null,
    excerpt: `${r.attacktype1_txt}; target ${r.targtype1_txt}; ${r.latitude},${r.longitude} (specificity ${r.specificity})`,
  });
}
fs.mkdirSync(path.join(ROOT, "data/candidates"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "data/candidates/gtd.json"), JSON.stringify(out, null, 1));
console.log(`${out.length} GTD candidates for Jammu and Kashmir`);
