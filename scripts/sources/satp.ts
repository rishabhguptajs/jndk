/**
 * SATP (South Asia Terrorism Portal) scraper for Jammu & Kashmir.
 *
 *   tsx scripts/sources/satp.ts fetch   download pages listed in scripts/sources/satp-pages.json
 *                                       into data/raw/satp/ (raw snapshots, never published)
 *   tsx scripts/sources/satp.ts parse   turn the raw timeline pages into candidate incidents
 *                                       in data/candidates/satp.json
 *
 * Candidates are leads, not events. Each one has to be matched or reviewed
 * (scripts/sources/match-candidates.ts) and written up in data/authoring with
 * a summary in our own words before it reaches the atlas.
 *
 * STATUS: written against SATP's public timeline layout but not yet run,
 * because satp.org is blocked by the build environment's network policy.
 * Run it from a machine that can reach satp.org and review the parse output.
 */
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const ROOT = path.resolve(import.meta.dirname, "../..");
const RAW = path.join(ROOT, "data/raw/satp");
const OUT = path.join(ROOT, "data/candidates");
const PAGES = path.join(import.meta.dirname, "satp-pages.json");

type Page = { url: string; year: number; month?: number; kind: "timeline" | "major_incidents" | "massacres" | "suicide" | "explosions" | "fatalities" };

export type Candidate = {
  source: "satp" | "gtd";
  source_url: string;
  source_ref: string;
  date: string; // YYYY-MM-DD or YYYY-MM
  place_hint: string | null;
  district_hint: string | null;
  killed: number | null;
  killed_sf: number | null;
  killed_civ: number | null;
  killed_terr: number | null;
  injured: number | null;
  group_hint: string | null;
  /** short machine extract for matching; never shown publicly */
  excerpt: string;
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const DISTRICTS = [
  "Anantnag", "Budgam", "Badgam", "Bandipora", "Bandipore", "Baramulla", "Doda", "Ganderbal", "Jammu", "Kargil", "Kathua", "Kishtwar",
  "Kulgam", "Kupwara", "Leh", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur",
];

const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
function num(s: string | undefined): number | null {
  if (!s) return null;
  const n = Number(s);
  if (!Number.isNaN(n)) return n;
  return WORD_NUM[s.toLowerCase()] ?? null;
}

/** Pull simple counts out of an incident paragraph. Deliberately conservative. */
export function extractCounts(text: string) {
  const t = text.replace(/\s+/g, " ");
  const n = "(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";
  const grab = (re: RegExp) => num(t.match(re)?.[1]);
  return {
    killed: grab(new RegExp(`${n}\\s+(?:persons?|people|civilians?|soldiers?|militants?|terrorists?|SF personnel|policemen|pilgrims?)?\\s*(?:were\\s+)?(?:killed|shot dead|died)`, "i")),
    killed_sf: grab(new RegExp(`${n}\\s+(?:SF personnel|soldiers?|troopers?|policemen|jawans?|security force personnel)\\s+(?:were\\s+)?(?:killed|shot dead)`, "i")),
    killed_civ: grab(new RegExp(`${n}\\s+civilians?\\s+(?:were\\s+)?(?:killed|shot dead)`, "i")),
    killed_terr: grab(new RegExp(`${n}\\s+(?:militants?|terrorists?)\\s+(?:were\\s+)?(?:killed|shot dead)`, "i")),
    injured: grab(new RegExp(`${n}\\s+(?:persons?|people|civilians?|soldiers?|pilgrims?)?\\s*(?:were\\s+)?(?:injured|wounded)`, "i")),
  };
}

export function parseTimelineHtml(html: string, page: Page): Candidate[] {
  const $ = cheerio.load(html);
  const out: Candidate[] = [];
  // SATP timelines are a sequence of paragraphs or table rows that start with "Month Day:".
  const blocks = $("p, tr, li")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 30);
  for (const b of blocks) {
    const m = b.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*[:.-]\s*(.*)$/is);
    if (!m) continue;
    const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    const date = `${page.year}-${String(month).padStart(2, "0")}-${String(+m[2]).padStart(2, "0")}`;
    const body = m[3];
    const district = DISTRICTS.find((d) => new RegExp(`\\b${d}\\b`, "i").test(body)) ?? null;
    const place = body.match(/\bat\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/)?.[1] ?? null;
    const group = body.match(/\b(Lashkar-e-Toiba|Lashkar-e-Taiba|Jaish-e-Mohammed|Hizb-ul-Mujahideen|Harkat-ul-Ansar|Harkat-ul-Mujahideen|Al-Badr|The Resistance Front|People's Anti-Fascist Front|JKLF)\b/i)?.[1] ?? null;
    out.push({
      source: "satp",
      source_url: page.url,
      source_ref: `${page.kind}:${date}`,
      date,
      place_hint: place,
      district_hint: district,
      ...extractCounts(body),
      group_hint: group,
      excerpt: body.slice(0, 280),
    });
  }
  return out;
}

async function fetchAll() {
  const pages: Page[] = JSON.parse(fs.readFileSync(PAGES, "utf8"));
  fs.mkdirSync(RAW, { recursive: true });
  for (const p of pages) {
    const file = path.join(RAW, `${p.kind}-${p.year}${p.month ? "-" + String(p.month).padStart(2, "0") : ""}.html`);
    if (fs.existsSync(file)) continue;
    const res = await fetch(p.url, { headers: { "user-agent": "jk-conflict-atlas research scraper (contact via repository)" } });
    if (!res.ok) {
      console.error(`HTTP ${res.status} ${p.url}`);
      continue;
    }
    fs.writeFileSync(file, await res.text());
    fs.writeFileSync(file + ".meta.json", JSON.stringify({ url: p.url, retrieved: new Date().toISOString() }, null, 1));
    console.log("saved", path.relative(ROOT, file));
    await new Promise((r) => setTimeout(r, 3000)); // be polite
  }
}

function parseAll() {
  const pages: Page[] = JSON.parse(fs.readFileSync(PAGES, "utf8"));
  const all: Candidate[] = [];
  for (const p of pages) {
    const file = path.join(RAW, `${p.kind}-${p.year}${p.month ? "-" + String(p.month).padStart(2, "0") : ""}.html`);
    if (!fs.existsSync(file)) continue;
    all.push(...parseTimelineHtml(fs.readFileSync(file, "utf8"), p));
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "satp.json"), JSON.stringify(all, null, 1));
  console.log(`${all.length} SATP candidates from ${pages.length} pages`);
}

const cmd = process.argv[2];
if (cmd === "fetch") await fetchAll();
else if (cmd === "parse") parseAll();
else if (import.meta.url === `file://${process.argv[1]}`) console.log("usage: tsx scripts/sources/satp.ts fetch|parse");
