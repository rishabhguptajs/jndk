/** Screenshots of key atlas states for review. Usage: tsx scripts/qa/feature-shots.ts <outdir> */
import { chromium } from "playwright-core";
import fs from "node:fs";
import { serveOut } from "../../tests/render/server";

const out = process.argv[2] ?? "docs/screenshots";
fs.mkdirSync(out, { recursive: true });
const srv = await serveOut();
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors: string[] = [];
async function shot(name: string, path: string, act?: (p: import("playwright-core").Page) => Promise<void>, vp = { width: 1440, height: 900 }) {
  const page = await browser.newPage({ viewport: vp });
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(srv.url + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  if (act) await act(page);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}.png` });
  await page.close();
  console.log("saved", name);
}
const layers = async (p: import("playwright-core").Page, ...labels: string[]) => {
  await p.getByRole("tab", { name: "Layers" }).click();
  for (const l of labels) await p.getByRole("button", { name: l, exact: true }).click();
};
await shot("phase5-event-card", "/?nointro=1&event=2024-06-09-reasi-bus");
await shot("phase5-choropleth-2002", "/?nointro=1&year=2002", (p) => layers(p, "Districts"));
await shot("phase5-heatmap", "/?nointro=1", (p) => layers(p, "Heatmap"));
await shot("phase5-hotspot-drift", "/?nointro=1", (p) => layers(p, "Hotspot drift"));
await shot("phase5-terror-layer", "/?nointro=1", async (p) => {
  await layers(p, "Group zones", "Camps and launch pads", "Group HQs", "Infiltration routes", "Line of Control");
  await p.evaluate(() => (window as any).__atlasMap.jumpTo({ center: [74.2, 32.9], zoom: 5.4 }));
});
await shot("phase5-stats", "/stats/");
await shot("phase5-groups", "/groups/");
await shot("phase5-mobile-atlas", "/", undefined, { width: 390, height: 844 });
await shot("phase5-mobile-event", "/event/2025-04-22-pahalgam-baisaran/", undefined, { width: 390, height: 844 });
await browser.close();
await srv.close();
console.log(errors.length ? `page errors:\n${errors.join("\n")}` : "no page errors");
