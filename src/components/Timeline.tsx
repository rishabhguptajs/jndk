"use client";
import { useEffect, useMemo, useRef } from "react";
import type { Event } from "@/lib/schema";
import { FIRST_YEAR, LAST_YEAR, YEARS, yearOf } from "@/lib/analysis";
import { GROUPS, GROUP_ORDER, groupOf } from "@/lib/categories";

export type TimeState = {
  /** months since Jan 1947 */
  t: number;
  playing: boolean;
  speed: number;
  resolution: "year" | "month";
  /** cumulative: show everything up to t. window: show only the current year or month */
  mode: "cumulative" | "window";
};

export const T_MAX = (LAST_YEAR - FIRST_YEAR) * 12 + 9; // October 2026
export const tYear = (t: number) => FIRST_YEAR + Math.floor(t / 12);
export const tMonth = (t: number) => (t % 12) + 1;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function Timeline({
  events,
  allEvents,
  time,
  setTime,
}: {
  events: Event[];
  allEvents: Event[];
  time: TimeState;
  setTime: (fn: (t: TimeState) => TimeState) => void;
}) {
  const raf = useRef<number | null>(null);

  // Playback: a year takes 1.2 s at 1x in year resolution, a month 0.25 s in month resolution.
  useEffect(() => {
    if (!time.playing) return;
    let last = performance.now();
    let acc = 0;
    const stepMs = (time.resolution === "year" ? 1200 : 250) / time.speed;
    const tick = (now: number) => {
      acc += now - last;
      last = now;
      if (acc >= stepMs) {
        acc = 0;
        setTime((s) => {
          const step = s.resolution === "year" ? 12 : 1;
          const next = s.t + step;
          if (next > T_MAX + (s.resolution === "year" ? 11 : 0)) return { ...s, t: T_MAX, playing: false };
          if (next > T_MAX) return { ...s, t: T_MAX };
          return { ...s, t: next };
        });
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [time.playing, time.speed, time.resolution, setTime]);

  const bars = useMemo(() => {
    return YEARS.map((y) => {
      const es = events.filter((e) => yearOf(e) === y);
      const by = Object.fromEntries(GROUP_ORDER.map((g) => [g, es.filter((e) => groupOf(e.category) === g).length]));
      return { year: y, n: es.length, by, any: allEvents.some((e) => yearOf(e) === y) };
    });
  }, [events, allEvents]);
  const max = Math.max(1, ...bars.map((b) => b.n));
  const flags = useMemo(
    () => allEvents.filter((e) => e.category === "india_strike" || (e.category === "policy" && e.high_profile)),
    [allEvents],
  );

  const W = 1000, H = 64, pad = 2;
  const bw = W / YEARS.length;
  const x = (year: number) => (year - FIRST_YEAR) * bw;
  const year = tYear(time.t);
  const label = time.resolution === "month" ? `${MONTHS[tMonth(time.t) - 1]} ${year}` : String(year);

  return (
    <div className="timeline">
      <div className="timeline-head">
        <button
          className="btn"
          onClick={() => setTime((s) => ({ ...s, playing: !s.playing, t: !s.playing && s.t >= T_MAX ? (s.resolution === "year" ? 11 : 0) : s.t }))}
          aria-label={time.playing ? "Pause playback" : "Play timeline from the current point"}
        >
          {time.playing ? "Pause" : "Play"}
        </button>
        <span className="timeline-year" aria-live="polite">
          {label}
        </span>
        <label className="row" style={{ gap: 4, fontSize: "0.8rem" }}>
          <span className="faint">Speed</span>
          <select
            value={time.speed}
            onChange={(e) => setTime((s) => ({ ...s, speed: Number(e.target.value) }))}
            style={{ width: "auto" }}
          >
            {[0.5, 1, 2, 4].map((v) => (
              <option key={v} value={v}>
                {v}x
              </option>
            ))}
          </select>
        </label>
        <div className="chips" role="group" aria-label="Resolution">
          {(["year", "month"] as const).map((r) => (
            <button key={r} className="chip" aria-pressed={time.resolution === r} onClick={() => setTime((s) => ({ ...s, resolution: r }))}>
              {r === "year" ? "Years" : "Months"}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="What to show">
          <button className="chip" aria-pressed={time.mode === "cumulative"} onClick={() => setTime((s) => ({ ...s, mode: "cumulative" }))}>
            Up to this date
          </button>
          <button className="chip" aria-pressed={time.mode === "window"} onClick={() => setTime((s) => ({ ...s, mode: "window" }))}>
            This {time.resolution} only
          </button>
        </div>
        <button className="chip" onClick={() => setTime((s) => ({ ...s, t: T_MAX, playing: false }))}>
          Show all
        </button>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 8}`} preserveAspectRatio="none" style={{ height: 64 }} role="img" aria-label="Number of recorded events per year, 1947 to 2026, coloured by type. Coverage gaps are shaded.">
        {bars.map((b) =>
          !b.any ? <rect key={`g${b.year}`} x={x(b.year)} y={0} width={bw} height={H} fill="#14171b" /> : null,
        )}
        {bars.map((b) => {
          let y0 = H;
          return (
            <g key={b.year}>
              <title>{`${b.year}: ${b.n} event${b.n === 1 ? "" : "s"} matching filters`}</title>
              {GROUP_ORDER.map((g) => {
                const h = (b.by[g] / max) * (H - 8);
                if (!h) return null;
                y0 -= h;
                return <rect key={g} x={x(b.year) + pad / 2} y={y0} width={bw - pad} height={Math.max(1, h - 1)} fill={GROUPS[g].color} rx={1} />;
              })}
            </g>
          );
        })}
        {flags.map((f) => (
          <g key={f.id}>
            <title>{f.title}</title>
            <line x1={x(yearOf(f)) + bw / 2} x2={x(yearOf(f)) + bw / 2} y1={H} y2={H + 8} stroke="#3987e5" strokeWidth={2} />
          </g>
        ))}
        <line x1={x(year) + ((tMonth(time.t) - 0.5) / 12) * bw} x2={x(year) + ((tMonth(time.t) - 0.5) / 12) * bw} y1={0} y2={H + 8} stroke="#e8c06a" strokeWidth={1.5} />
      </svg>
      <div className="timeline-axis" aria-hidden>
        {[1947, 1965, 1971, 1990, 1999, 2019, 2026].map((y) => (
          <span key={y} style={{ left: `${((y - FIRST_YEAR + 0.5) / YEARS.length) * 100}%` }}>
            {y}
          </span>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={T_MAX}
        step={1}
        value={time.t}
        onChange={(e) => {
          const v = Number(e.target.value);
          setTime((s) => ({ ...s, t: s.resolution === "year" ? Math.min(T_MAX, Math.floor(v / 12) * 12 + 11) : v, playing: false }));
        }}
        aria-label="Timeline position"
        aria-valuetext={label}
      />
      <p className="faint" style={{ fontSize: "0.72rem", margin: "2px 0 0" }}>
        Shaded years have no recorded events in this atlas yet (coverage gaps, not quiet years). Blue ticks mark India&apos;s strikes and policy milestones.
      </p>
    </div>
  );
}
