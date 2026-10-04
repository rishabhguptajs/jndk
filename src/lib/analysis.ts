import type { Event, Range } from "./schema";
import { TACTIC_FAMILIES } from "./categories";

export const FIRST_YEAR = 1947;
export const LAST_YEAR = 2026;
export const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

export const yearOf = (e: Pick<Event, "date">) => Number(e.date.slice(0, 4));
export const monthOf = (e: Pick<Event, "date">) => (e.date.length >= 7 ? Number(e.date.slice(5, 7)) : 1);
/** Months since Jan 1947. Used for timeline filtering at month resolution. */
export const monthIndex = (e: Pick<Event, "date">) => (yearOf(e) - FIRST_YEAR) * 12 + (monthOf(e) - 1);

export function fmtRange(r: Range | null | undefined, unknown = "Not known") {
  if (!r || r.min === null) return unknown;
  return r.min === r.max ? r.min.toLocaleString("en-IN") : `${r.min.toLocaleString("en-IN")} to ${r.max!.toLocaleString("en-IN")}`;
}

/** Number used to size markers and weight the heatmap: the upper bound of victims. */
export function tollWeight(e: Event) {
  const t = e.killed.total.max ?? 0;
  return t;
}

export function fmtDate(e: Pick<Event, "date" | "date_precision" | "end_date">) {
  const fmt = (d: string, p: string) => {
    const [y, m, day] = d.split("-").map(Number);
    const month = m ? new Date(Date.UTC(2000, m - 1, 1)).toLocaleString("en-GB", { month: "long", timeZone: "UTC" }) : "";
    if (p === "day" && day) return `${day} ${month} ${y}`;
    if (m) return `${month} ${y}`;
    return String(y);
  };
  const start = fmt(e.date, e.date_precision);
  if (!e.end_date) return start;
  const endP = e.end_date.length === 10 ? "day" : e.end_date.length === 7 ? "month" : "year";
  return `${start} to ${fmt(e.end_date, endP)}`;
}

export type YearAgg = { year: number; events: number; civilians: number; security_forces: number; terrorists: number; total: number; injured: number };

/** Yearly totals of what is recorded in this atlas, using the lower bound of each range. */
export function yearly(events: Event[]): YearAgg[] {
  const m = new Map<number, YearAgg>(YEARS.map((y) => [y, { year: y, events: 0, civilians: 0, security_forces: 0, terrorists: 0, total: 0, injured: 0 }]));
  for (const e of events) {
    const a = m.get(yearOf(e));
    if (!a) continue;
    a.events++;
    a.civilians += e.killed.civilians.min ?? 0;
    a.security_forces += e.killed.security_forces.min ?? 0;
    a.terrorists += e.killed.terrorists.min ?? 0;
    a.total += e.killed.total.min ?? 0;
    a.injured += e.injured.min ?? 0;
  }
  return [...m.values()];
}

export function tacticByYear(events: Event[]) {
  return YEARS.map((year) => {
    const row: Record<string, number> = { year };
    for (const f of TACTIC_FAMILIES) row[f.key] = 0;
    for (const e of events) {
      if (yearOf(e) !== year || !e.tactic) continue;
      const fam = TACTIC_FAMILIES.find((f) => (f.tactics as readonly string[]).includes(e.tactic!));
      if (fam) row[fam.key]++;
    }
    return row;
  });
}

export function countBy<T>(items: T[], key: (t: T) => string | string[] | null | undefined) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    for (const kk of Array.isArray(k) ? k : k ? [k] : []) m.set(kk, (m.get(kk) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Toll-weighted centre of violence per year (J&K and Ladakh only; events outside J&K
 * and generic region points are excluded). Weight is the victim toll lower bound, minimum 1.
 */
export function hotspots(events: Event[]) {
  const out: { year: number; lng: number; lat: number; weight: number; n: number }[] = [];
  for (const year of YEARS) {
    const es = events.filter(
      (e) => yearOf(e) === year && e.region !== "Outside J&K" && e.geo_precision !== "region" && !["policy", "war"].includes(e.category),
    );
    if (!es.length) continue;
    let w = 0, x = 0, y = 0;
    for (const e of es) {
      const k = Math.max(1, (e.killed.civilians.min ?? 0) + (e.killed.security_forces.min ?? 0) || (e.killed.total.min ?? 0) || 1);
      w += k;
      x += e.lng * k;
      y += e.lat * k;
    }
    out.push({ year, lng: x / w, lat: y / w, weight: w, n: es.length });
  }
  return out;
}

export type DistrictPeriod = { id: string; from: string; to: string | null; count: number | null; file: string | null; note: string };
export function periodFor(periods: DistrictPeriod[], year: number) {
  const d = `${year}-07-01`;
  return periods.find((p) => p.from <= d && (p.to === null || d <= p.to)) ?? periods[0];
}
