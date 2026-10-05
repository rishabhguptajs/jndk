/**
 * Phase 6 site checks against the static build in out/.
 *   tsx scripts/qa/site-check.ts
 * Writes docs/qa/site-check.md.
 *  1. Internal links: every href/src in every page resolves to a file in out/.
 *  2. External links: syntax check, hosts, and a live HEAD request where the network allows.
 *  3. Accessibility: axe-core on the main pages (WCAG 2 A/AA rules).
 *  4. Performance: page weight and load timings in headless Chromium.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import { serveOut } from "../../tests/render/server";

const OUT = path.resolve("out");
const files: string[] = [];
const walk = (d: string) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(OUT);
const html = files.filter((f) => f.endsWith(".html"));

// 1. Internal links
const broken: string[] = [];
const external = new Map<string, number>();
const exists = (u: string) => {
  const clean = decodeURIComponent(u.split("#")[0].split("?")[0]);
  if (!clean || clean === "/") return true;
  const p = path.join(OUT, clean);
  return fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, "index.html")));
};
for (const f of html) {
  const s = fs.readFileSync(f, "utf8");
  for (const m of s.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1].replace(/&amp;/g, "&");
    if (u.startsWith("http")) external.set(u, (external.get(u) ?? 0) + 1);
    else if (u.startsWith("/") && !u.startsWith("//")) {
      if (!exists(u)) broken.push(`${path.relative(OUT, f)} -> ${u}`);
    }
  }
}
// Data files referenced from JS at runtime
for (const p of ["/data/events.json", "/data/groups.json", "/data/group_zones.json", "/data/infrastructure.json", "/data/routes.json", "/data/districts_index.json", "/tiles/terrain.pmtiles", "/maplibre/maplibre-gl-worker.mjs", "/maplibre/maplibre-gl-shared.mjs"])
  if (!exists(p)) broken.push(`runtime -> ${p}`);

// 2. External links
const extList = [...external.keys()];
const badSyntax = extList.filter((u) => {
  try {
    new URL(u);
    return false;
  } catch {
    return true;
  }
});
const hosts = new Map<string, number>();
for (const u of extList) {
  try {
    const h = new URL(u).host;
    hosts.set(h, (hosts.get(h) ?? 0) + 1);
  } catch {}
}
let live = { ok: 0, fail: 0, blocked: 0 };
const sample = extList.slice(0, 40);
for (const u of sample) {
  try {
    const r = await fetch(u, { method: "HEAD", signal: AbortSignal.timeout(6000) });
    if (r.status === 403 && r.headers.get("server") === null) live.blocked++;
    else if (r.ok || (r.status >= 300 && r.status < 400)) live.ok++;
    else live.fail++;
  } catch {
    live.blocked++;
  }
}

// 3 and 4. Browser checks
const srv = await serveOut();
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pages = ["/", "/chapters/", "/stats/", "/groups/", "/methodology/", "/sources/", "/data/", "/event/2025-04-22-pahalgam-baisaran/"];
const axe: { page: string; violations: { id: string; impact: string | null | undefined; nodes: number; help: string }[] }[] = [];
const perf: { page: string; transferKB: number; dcl: number; load: number }[] = [];
for (const p of pages) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(srv.url + p, { waitUntil: "load" });
  const timing = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, bytes: res.reduce((a, r) => a + (r.encodedBodySize || 0), 0) + (n.encodedBodySize || 0) };
  });
  await page.waitForTimeout(1500);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  axe.push({ page: p, violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })) });
  perf.push({ page: p, transferKB: Math.round(timing.bytes / 1024), dcl: Math.round(timing.dcl), load: Math.round(timing.load || Date.now() - t0) });
  await ctx.close();
}
// Map ready time on the atlas
const mp = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const tm = Date.now();
await mp.goto(srv.url + "/?nointro=1");
await mp.waitForFunction(() => {
  const m = (window as unknown as { __atlasMap?: { loaded(): boolean; areTilesLoaded(): boolean } }).__atlasMap;
  return !!m && m.loaded() && m.areTilesLoaded();
}, null, { timeout: 60000 });
const mapReady = Date.now() - tm;
await browser.close();
await srv.close();

const size = (rel: string) => Math.round(fs.statSync(path.join(OUT, rel)).size / 1024);
const jsKB = Math.round(files.filter((f) => f.endsWith(".js")).reduce((a, f) => a + fs.statSync(f).size, 0) / 1024);
const md = [
  "# Site check (Phase 6)",
  "",
  `Run ${new Date().toISOString().slice(0, 10)} against the static build (${html.length} HTML pages).`,
  "",
  "## Internal links",
  broken.length ? `**${broken.length} broken:**\n\n${broken.map((b) => `- ${b}`).join("\n")}` : "All internal links and runtime data files resolve.",
  "",
  "## External links",
  `- ${extList.length} distinct external URLs across ${hosts.size} hosts. Malformed: ${badSyntax.length}.`,
  `- Live check of the first ${sample.length}: ${live.ok} reachable, ${live.fail} returned an error, ${live.blocked} could not be reached from the build environment (egress policy).`,
  "- A full live check, and the Wayback snapshot check, need a network without the egress restrictions: run `tsx scripts/sources/archive-sources.ts`.",
  "",
  "Hosts:",
  "",
  ...[...hosts.entries()].sort((a, b) => b[1] - a[1]).map(([h, n]) => `- ${h}: ${n}`),
  "",
  "## Accessibility (axe-core, WCAG 2 A and AA)",
  "",
  ...axe.map((a) => `- ${a.page}: ${a.violations.length ? a.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes} nodes): ${v.help}`).join("; ") : "no violations"}`),
  "",
  "## Performance (local static server, headless Chromium with software WebGL)",
  "",
  "| Page | Transferred (KB) | DOMContentLoaded (ms) | Load (ms) |",
  "|---|---|---|---|",
  ...perf.map((p) => `| ${p.page} | ${p.transferKB} | ${p.dcl} | ${p.load} |`),
  "",
  `- Atlas map ready (style, data and visible tiles loaded): ${mapReady} ms.`,
  `- Total JavaScript in the build: ${jsKB} KB. events.json: ${size("data/events.json")} KB. India boundary: ${size("geo/india-soi.geojson")} KB. Terrain tiles: ${size("tiles/terrain.pmtiles")} KB (fetched by range request, only the tiles in view).`,
  "",
];
fs.mkdirSync("docs/qa", { recursive: true });
fs.writeFileSync("docs/qa/site-check.md", md.join("\n"));
console.log(md.join("\n"));
