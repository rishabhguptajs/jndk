"use client";
import type { Event, Group } from "@/lib/schema";
import { CATEGORY_META, CONFIDENCE_LABEL, GROUPS, GROUP_ORDER, TACTIC_LABEL, TARGET_LABEL } from "@/lib/categories";
import { activeFilterCount, EMPTY_FILTERS, type Filters } from "@/lib/filters";
import { countBy } from "@/lib/analysis";

function toggle<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: string; l: string; n?: number }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <details className="filter-group">
      <summary className="filter-label" style={{ cursor: "pointer" }}>
        {label} {value.length ? `(${value.length})` : ""}
      </summary>
      <div className="chips" style={{ marginTop: 6 }}>
        {options.map((o) => (
          <button key={o.v} className="chip" aria-pressed={value.includes(o.v)} onClick={() => onChange(toggle(value, o.v))}>
            {o.l}
            {o.n !== undefined ? <span className="faint"> {o.n}</span> : null}
          </button>
        ))}
      </div>
    </details>
  );
}

export function FilterPanel({
  events,
  groups,
  filters,
  setFilters,
  shown,
}: {
  events: Event[];
  groups: Group[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  shown: number;
}) {
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const opts = (pairs: [string, number][], label: (k: string) => string) => pairs.map(([v, n]) => ({ v, l: label(v), n }));
  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? id;

  return (
    <div>
      <label className="filter-label" htmlFor="search">
        Search events, places, groups, victims
      </label>
      <input
        id="search"
        type="search"
        value={filters.query}
        placeholder="e.g. Wandhama, Reasi, TRF, Pandit"
        onChange={(e) => set({ query: e.target.value })}
      />
      <p className="count-line" aria-live="polite">
        {shown} of {events.length} events shown
        {activeFilterCount(filters) > 0 && (
          <>
            {" · "}
            <button className="chip" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </button>
          </>
        )}
      </p>

      <fieldset className="filter-group">
        <legend>Type</legend>
        <div className="chips">
          {GROUP_ORDER.map((g) => (
            <button key={g} className="chip" aria-pressed={filters.groups.includes(g)} onClick={() => set({ groups: toggle(filters.groups, g) })}>
              <span className="swatch" style={{ background: GROUPS[g].color, width: 8, height: 8, marginRight: 4 }} aria-hidden />
              {GROUPS[g].label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Years</legend>
        <div className="row">
          <input
            type="number"
            aria-label="From year"
            min={1947}
            max={2026}
            value={filters.fromYear}
            onChange={(e) => set({ fromYear: Math.min(Number(e.target.value) || 1947, filters.toYear) })}
          />
          <span className="faint">to</span>
          <input
            type="number"
            aria-label="To year"
            min={1947}
            max={2026}
            value={filters.toYear}
            onChange={(e) => set({ toYear: Math.max(Number(e.target.value) || 2026, filters.fromYear) })}
          />
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Minimum killed</legend>
        <div className="chips">
          {[0, 1, 5, 10, 25, 100].map((n) => (
            <button key={n} className="chip" aria-pressed={filters.minKilled === n} onClick={() => set({ minKilled: n })}>
              {n === 0 ? "Any" : `${n}+`}
            </button>
          ))}
        </div>
      </fieldset>

      <MultiSelect
        label="Category"
        options={opts(countBy(events, (e) => e.category), (k) => CATEGORY_META[k as keyof typeof CATEGORY_META]?.label ?? k)}
        value={filters.categories}
        onChange={(v) => set({ categories: v })}
      />
      <MultiSelect label="Tactic" options={opts(countBy(events, (e) => e.tactic), (k) => TACTIC_LABEL[k] ?? k)} value={filters.tactics} onChange={(v) => set({ tactics: v })} />
      <MultiSelect
        label="Target"
        options={opts(countBy(events, (e) => e.target_type), (k) => TARGET_LABEL[k] ?? k)}
        value={filters.targets}
        onChange={(v) => set({ targets: v })}
      />
      <MultiSelect
        label="Perpetrator"
        options={opts(countBy(events, (e) => e.perpetrator_group), groupName)}
        value={filters.perpetrators}
        onChange={(v) => set({ perpetrators: v })}
      />
      <MultiSelect label="Region" options={opts(countBy(events, (e) => e.region), (k) => k)} value={filters.regions} onChange={(v) => set({ regions: v })} />
      <MultiSelect
        label="District (current)"
        options={opts(countBy(events, (e) => e.district_current), (k) => k)}
        value={filters.districts}
        onChange={(v) => set({ districts: v })}
      />
      <MultiSelect
        label="Confidence"
        options={opts(countBy(events, (e) => e.confidence), (k) => CONFIDENCE_LABEL[k as keyof typeof CONFIDENCE_LABEL] ?? k)}
        value={filters.confidence}
        onChange={(v) => set({ confidence: v })}
      />
    </div>
  );
}
