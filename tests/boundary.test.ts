import { describe, expect, it } from "vitest";
import fs from "node:fs";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import { PMTiles, FetchSource, TileType } from "pmtiles";
import { buildStyle } from "@/lib/mapStyle";
import { MUST_BE_INDIA, MUST_NOT_BE_INDIA } from "./fixtures";

const india = JSON.parse(fs.readFileSync("public/geo/india-soi.geojson", "utf8"));
const indiaGeom = india.features[0];

describe("Survey of India country boundary", () => {
  it("is a single India feature sourced from the SoI file", () => {
    expect(india.features).toHaveLength(1);
    expect(india.features[0].properties.source).toMatch(/Survey of India/);
  });
  for (const [name, [lng, lat]] of Object.entries(MUST_BE_INDIA)) {
    it(`includes ${name}`, () => expect(booleanPointInPolygon(point([lng, lat]), indiaGeom)).toBe(true));
  }
  for (const [name, [lng, lat]] of Object.entries(MUST_NOT_BE_INDIA)) {
    it(`excludes ${name}`, () => expect(booleanPointInPolygon(point([lng, lat]), indiaGeom)).toBe(false));
  }
});

describe("basemap audit", () => {
  const style = buildStyle("");
  it("India is filled only from the SoI file", () => {
    expect((style.sources.india as { data: string }).data).toBe("/geo/india-soi.geojson");
    const fill = style.layers.find((l) => l.id === "india-fill")!;
    expect(fill.type).toBe("fill");
    expect((fill as { source: string }).source).toBe("india");
  });
  it("loads no remote tiles or remote data", () => {
    for (const [id, s] of Object.entries(style.sources)) {
      const anyS = s as { url?: string; tiles?: string[]; data?: unknown };
      const urls = [anyS.url, ...(anyS.tiles ?? []), typeof anyS.data === "string" ? anyS.data : undefined].filter(Boolean) as string[];
      for (const u of urls) expect(u, `source ${id}`).not.toMatch(/^(https?:)?\/\//);
    }
  });
  it("has no boundary layers apart from the opt-in military lines", () => {
    for (const l of style.layers) {
      const sl = (l as { "source-layer"?: string })["source-layer"] ?? "";
      expect(`${l.id} ${sl}`).not.toMatch(/boundar|admin|border|country/i);
    }
  });
  it("shows LoC and LAC only on request, labelled as military lines", () => {
    for (const id of ["loc-line", "lac-line", "loc-label", "lac-label"]) {
      const l = style.layers.find((x) => x.id === id)!;
      expect((l.layout as { visibility?: string }).visibility).toBe("none");
    }
    for (const f of ["loc", "lac"]) {
      const gj = JSON.parse(fs.readFileSync(`public/geo/${f}.geojson`, "utf8"));
      expect(gj.features[0].properties.label).toMatch(/military line, not a border/);
    }
  });
  it("physical layers carry no names or political attributes", () => {
    for (const f of ["land", "rivers", "lakes", "glaciers", "ocean"]) {
      const gj = JSON.parse(fs.readFileSync(`public/geo/${f}.geojson`, "utf8"));
      for (const ft of gj.features) expect(Object.keys(ft.properties ?? {})).toEqual(["sr"]);
    }
  });
  it("terrain PMTiles is an elevation raster, not a vector basemap", async () => {
    const buf = fs.readFileSync("public/tiles/terrain.pmtiles");
    const src = {
      getKey: () => "terrain",
      getBytes: async (offset: number, length: number) => ({
        data: buf.buffer.slice(buf.byteOffset + offset, buf.byteOffset + offset + length),
      }),
    };
    const p = new PMTiles(src as unknown as FetchSource);
    const h = await p.getHeader();
    expect(h.tileType).toBe(TileType.Png);
    const meta = (await p.getMetadata()) as { encoding?: string };
    expect(meta.encoding).toBe("terrarium");
  });
});

describe("mandated labels", () => {
  const labels = JSON.parse(fs.readFileSync("public/geo/region-labels.geojson", "utf8")).features.map(
    (f: { properties: { label: string } }) => f.properties.label,
  );
  for (const l of [
    "Pakistan-occupied Jammu & Kashmir (PoJK)",
    "Gilgit-Baltistan (Pakistan-occupied)",
    "Aksai Chin (China-occupied)",
    "Shaksgam Valley (illegally ceded by Pakistan to China, 1963)",
  ])
    it(`has label "${l}"`, () => expect(labels).toContain(l));
});
