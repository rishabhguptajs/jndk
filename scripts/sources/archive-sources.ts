/**
 * Check every cited web source against the Wayback Machine.
 *
 *   tsx scripts/sources/archive-sources.ts          check snapshots
 *   tsx scripts/sources/archive-sources.ts --save   also request a capture for sources with no snapshot
 *
 * Results go to data/archive_state.json, which compile-data.ts reads. Sources
 * start with an unverified Wayback lookup URL (https://web.archive.org/web/<url>)
 * and archive_checked: false; this script replaces it with the closest snapshot
 * and sets archive_checked: true.
 *
 * STATUS: archive.org is blocked by the build environment's network policy, so
 * this has not been run yet. Every archive link in the current data is unverified.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const ROOT = path.resolve(import.meta.dirname, "../..");
const STATE = path.join(ROOT, "data/archive_state.json");
const state: Record<string, { archive_url: string; checked: boolean; checked_at?: string }> = fs.existsSync(STATE)
  ? JSON.parse(fs.readFileSync(STATE, "utf8"))
  : {};
const dir = path.join(ROOT, "data/authoring/sources");
const urls = new Set<string>();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")))
  for (const s of Object.values(YAML.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Record<string, { url?: string }>))
    if (s?.url) urls.add(s.url);

const save = process.argv.includes("--save");
let ok = 0, missing = 0;
for (const url of urls) {
  if (state[url]?.checked) continue;
  try {
    const r = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`);
    const j = (await r.json()) as { archived_snapshots?: { closest?: { url: string; available: boolean } } };
    const snap = j.archived_snapshots?.closest;
    if (snap?.available) {
      state[url] = { archive_url: snap.url.replace(/^http:/, "https:"), checked: true, checked_at: new Date().toISOString() };
      ok++;
    } else {
      missing++;
      if (save) await fetch(`https://web.archive.org/save/${url}`, { method: "POST" });
    }
  } catch (e) {
    console.error("failed", url, (e as Error).message);
  }
  await new Promise((r) => setTimeout(r, 1500));
}
fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
console.log(`${urls.size} source URLs: ${ok} newly verified, ${missing} without a snapshot${save ? " (capture requested)" : ""}`);
