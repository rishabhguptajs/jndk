import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { parseTimelineHtml, extractCounts } from "../scripts/sources/satp";
import { EventsFile, GroupsFile } from "@/lib/schema";

describe("SATP parser", () => {
  const html = `<div><p>June 9: Nine pilgrims were killed and 41 injured when terrorists fired on a bus at Pouni in Reasi District.</p>
  <p>Not an incident line, just text that is long enough to be considered.</p>
  <p>June 11: Two militants were killed in an encounter at Kathua.</p></div>`;
  const out = parseTimelineHtml(html, { url: "https://example.org/x", year: 2024, month: 6, kind: "timeline" });
  it("reads dated incident lines only", () => expect(out.map((c) => c.date)).toEqual(["2024-06-09", "2024-06-11"]));
  it("extracts district and counts", () => {
    expect(out[0].district_hint).toBe("Reasi");
    expect(out[0].killed).toBe(9);
    expect(out[0].injured).toBe(41);
    expect(out[1].killed_terr).toBe(2);
  });
  it("handles number words", () => expect(extractCounts("three civilians were killed").killed_civ).toBe(3));
});

describe("compiled data", () => {
  const events = JSON.parse(fs.readFileSync("data/events.json", "utf8"));
  it("events.json passes the schema", () => expect(EventsFile.safeParse(events).success).toBe(true));
  it("groups.json passes the schema", () => expect(GroupsFile.safeParse(JSON.parse(fs.readFileSync("data/groups.json", "utf8"))).success).toBe(true));
  it("every web source has an archive link", () => {
    for (const e of events) for (const s of e.sources) if (s.url) expect(s.archive_url, `${e.id}/${s.id}`).toBeTruthy();
  });
  it("no em dashes in public copy", () => {
    for (const e of events) expect(`${e.title} ${e.summary} ${e.notes ?? ""}`).not.toMatch(/—/);
  });
  it("events sit inside the map frame or are flagged cross-border", () => {
    for (const e of events) if (!e.cross_border) expect(e.lng > 60 && e.lng < 100 && e.lat > 5 && e.lat < 40, e.id).toBe(true);
  });
});
