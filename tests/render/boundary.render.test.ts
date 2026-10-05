/**
 * Rendered boundary test. Loads the built static site in Chromium, waits for the
 * map to settle on J&K and Ladakh, and checks that the India fill is actually
 * drawn at points inside PoJK, Gilgit-Baltistan, Aksai Chin and Shaksgam.
 * Fails the build (npm run build runs it last) if any of them is missing.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import { chromium, type Browser, type Page } from "playwright-core";
import { serveOut, CHROMIUM } from "./server";
import { MUST_BE_INDIA, MUST_NOT_BE_INDIA } from "../fixtures";

let browser: Browser;
let page: Page;
let close: () => Promise<void>;

beforeAll(async () => {
  if (!fs.existsSync("out/index.html")) throw new Error("run next build first: out/ is missing");
  const srv = await serveOut();
  close = srv.close;
  browser = await chromium.launch({
    executablePath: fs.existsSync(CHROMIUM) ? CHROMIUM : undefined,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${srv.url}/?nointro=1`);
  await page.waitForFunction(() => {
    const m = (window as unknown as { __atlasMap?: { loaded(): boolean; areTilesLoaded(): boolean } }).__atlasMap;
    return !!m && m.loaded() && m.areTilesLoaded();
  }, null, { timeout: 90_000 });
  await page.evaluate(() => {
    const m = (window as unknown as { __atlasMap: { jumpTo(o: object): void } }).__atlasMap;
    m.jumpTo({ center: [76.2, 34.6], zoom: 5.6 });
  });
  await page.waitForFunction(() => {
    const m = (window as unknown as { __atlasMap: { loaded(): boolean; areTilesLoaded(): boolean } }).__atlasMap;
    return m.loaded() && m.areTilesLoaded();
  });
});

afterAll(async () => {
  await browser?.close();
  await close?.();
});

async function indiaRenderedAt(lngLat: [number, number]) {
  return page.evaluate((ll) => {
    const m = (window as unknown as {
      __atlasMap: { project(l: [number, number]): { x: number; y: number }; queryRenderedFeatures(p: [number, number], o: object): unknown[] };
    }).__atlasMap;
    const p = m.project(ll);
    return m.queryRenderedFeatures([p.x, p.y], { layers: ["india-fill"] }).length > 0;
  }, lngLat);
}

describe("rendered map", () => {
  for (const [name, ll] of Object.entries(MUST_BE_INDIA)) {
    it(`renders ${name} as India`, async () => expect(await indiaRenderedAt(ll)).toBe(true));
  }
  for (const [name, ll] of Object.entries(MUST_NOT_BE_INDIA)) {
    it(`does not render ${name} as India`, async () => expect(await indiaRenderedAt(ll)).toBe(false));
  }
  it("loads nothing from third-party hosts", async () => {
    const hosts = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((r) => new URL(r.name).host),
    );
    const self = new URL(page.url()).host;
    expect(hosts.filter((h) => h !== self)).toEqual([]);
  });
  it("runtime style has no boundary layers visible by default", async () => {
    const visible = await page.evaluate(() => {
      const m = (window as unknown as { __atlasMap: { getStyle(): { layers: { id: string; layout?: { visibility?: string } }[] } } }).__atlasMap;
      return m.getStyle().layers.filter((l) => l.layout?.visibility !== "none").map((l) => l.id);
    });
    expect(visible.filter((id) => /^(loc|lac)-|boundar|border|admin/i.test(id))).toEqual([]);
  });
});
