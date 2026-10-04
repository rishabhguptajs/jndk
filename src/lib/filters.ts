import type { Event } from "./schema";
import { groupOf, type GroupKey } from "./categories";
import { yearOf } from "./analysis";

export type Filters = {
  groups: GroupKey[]; // empty = all
  categories: string[];
  tactics: string[];
  targets: string[];
  perpetrators: string[];
  districts: string[];
  regions: string[];
  confidence: string[];
  minKilled: number;
  fromYear: number;
  toYear: number;
  query: string;
};

export const EMPTY_FILTERS: Filters = {
  groups: [],
  categories: [],
  tactics: [],
  targets: [],
  perpetrators: [],
  districts: [],
  regions: [],
  confidence: [],
  minKilled: 0,
  fromYear: 1947,
  toYear: 2026,
  query: "",
};

const any = (sel: string[], vals: (string | null | undefined)[]) => sel.length === 0 || vals.some((v) => v && sel.includes(v));

export function searchText(e: Event, groupNames: Record<string, string>) {
  return [
    e.title,
    e.place_name,
    e.district_at_time,
    e.district_current,
    e.region,
    e.victim_community,
    ...e.perpetrator_group.map((g) => groupNames[g] ?? g),
    ...e.victims.map((v) => v.name),
    e.summary,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function applyFilters(events: Event[], f: Filters, groupNames: Record<string, string> = {}) {
  const q = f.query.trim().toLowerCase();
  return events.filter(
    (e) =>
      (f.groups.length === 0 || f.groups.includes(groupOf(e.category))) &&
      any(f.categories, [e.category]) &&
      any(f.tactics, [e.tactic]) &&
      any(f.targets, e.target_type) &&
      any(f.perpetrators, e.perpetrator_group) &&
      any(f.districts, [e.district_current, e.district_at_time]) &&
      any(f.regions, [e.region]) &&
      any(f.confidence, [e.confidence]) &&
      (f.minKilled === 0 || (e.killed.total.max ?? 0) >= f.minKilled) &&
      yearOf(e) >= f.fromYear &&
      yearOf(e) <= f.toYear &&
      (q === "" || q.split(/\s+/).every((t) => searchText(e, groupNames).includes(t))),
  );
}

export const activeFilterCount = (f: Filters) =>
  f.groups.length + f.categories.length + f.tactics.length + f.targets.length + f.perpetrators.length + f.districts.length +
  f.regions.length + f.confidence.length + (f.minKilled > 0 ? 1 : 0) + (f.fromYear > 1947 || f.toYear < 2026 ? 1 : 0) + (f.query ? 1 : 0);
