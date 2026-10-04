import type { Metadata } from "next";
import Link from "next/link";
import { getEvents, getGroups } from "@/lib/serverData";
import { yearly, tacticByYear, countBy } from "@/lib/analysis";
import { DEATH_SERIES, TACTIC_FAMILIES } from "@/lib/categories";
import { StackedYears, StackedArea, RankedBars } from "@/components/charts";

export const metadata: Metadata = { title: "Statistics | J&K Conflict Atlas" };

const UNSPLIT = { key: "unsplit", label: "Not broken down by source", color: "#7d8590" } as const;

export default function StatsPage() {
  const events = getEvents();
  const groups = getGroups();
  const ys = yearly(events);
  const rows = ys.map((y) => ({
    x: y.year,
    security_forces: y.security_forces,
    civilians: y.civilians,
    terrorists: y.terrorists,
    unsplit: Math.max(0, y.total - y.civilians - y.security_forces - y.terrorists),
  }));
  const series = [...DEATH_SERIES, UNSPLIT];
  const early = rows.filter((r) => r.x <= 1949);
  const later = rows.filter((r) => r.x >= 1950);
  const injured = ys.map((y) => ({ x: y.year, injured: y.injured }));
  // Five-year periods make the shift in tactics readable despite sparse years.
  const yearlyT = tacticByYear(events);
  const tactics: Record<string, number>[] = [];
  for (let start = 1945; start <= 2025; start += 5) {
    const row: Record<string, number> = { x: start };
    for (const f of TACTIC_FAMILIES) row[f.key] = yearlyT.filter((r) => r.year >= start && r.year < start + 5).reduce((a, r) => a + r[f.key], 0);
    tactics.push(row);
  }
  const name = (id: string) => groups.find((g) => g.id === id)?.name ?? id;
  const terrorGroups = new Set(groups.filter((g) => g.kind === "terror_group" || g.kind === "front").map((g) => g.id));
  const byDistrict = countBy(events.filter((e) => e.region !== "Outside J&K"), (e) => e.district_current).slice(0, 15);
  const deathsByDistrict = new Map<string, number>();
  for (const e of events) {
    if (!e.district_current || e.region === "Outside J&K") continue;
    deathsByDistrict.set(e.district_current, (deathsByDistrict.get(e.district_current) ?? 0) + (e.killed.civilians.min ?? 0) + (e.killed.security_forces.min ?? 0));
  }
  const byGroup = countBy(events, (e) => e.perpetrator_group.filter((g) => terrorGroups.has(g)));
  const totalMin = events.reduce((a, e) => a + (e.killed.total.min ?? 0), 0);
  const totalMax = events.reduce((a, e) => a + (e.killed.total.max ?? 0), 0);
  const nSources = new Set(events.flatMap((e) => e.sources.map((s) => s.id))).size;

  return (
    <div className="page wide">
      <h1>Statistics</h1>
      <p className="callout">
        Every figure on this page is a sum of the incidents recorded in this atlas, using the lower bound of each reported range. The atlas does
        not yet hold every incident: SATP and official year-by-year tables could not be imported from the build environment, so these totals
        undercount, most of all for 1990 to 2005. See <Link href="/methodology/">Methodology</Link> for coverage by year.
      </p>
      <div className="card-grid" style={{ margin: "16px 0 28px" }}>
        <div className="card">
          <div className="faint">Events recorded</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "2rem" }}>{events.length}</div>
        </div>
        <div className="card">
          <div className="faint">Deaths in recorded events</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "2rem" }}>
            {totalMin.toLocaleString("en-IN")} to {totalMax.toLocaleString("en-IN")}
          </div>
          <div className="faint" style={{ fontSize: "0.75rem" }}>Range reflects sources that disagree. Includes 1947 massacre estimates.</div>
        </div>
        <div className="card">
          <div className="faint">Distinct sources cited</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "2rem" }}>{nSources}</div>
        </div>
      </div>

      <StackedYears rows={early} series={series} title="Deaths in recorded events, 1947 to 1949" yLabel="Deaths" height={200} />
      <StackedYears rows={later} series={series} title="Deaths in recorded events, 1950 to 2026" yLabel="Deaths" />
      <StackedYears
        rows={injured}
        series={[{ key: "injured", label: "Injured", color: "#d95926" }]}
        title="Injuries in recorded events by year"
        yLabel="Injured"
        height={200}
      />
      <StackedArea rows={tactics} series={TACTIC_FAMILIES} title="Tactic shift: recorded incidents per five-year period by tactic (period start year on the axis)" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        <RankedBars title="Recorded events by current district (top 15)" items={byDistrict.map(([label, value]) => ({ label, value }))} unit="events" />
        <RankedBars
          title="Civilian and security force deaths by current district"
          color="#d95926"
          items={[...deathsByDistrict.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([label, value]) => ({ label, value }))}
          unit="deaths"
        />
        <RankedBars title="Recorded events by perpetrator group" color="#c98500" items={byGroup.map(([id, value]) => ({ label: name(id), value }))} unit="events" />
      </div>
    </div>
  );
}
