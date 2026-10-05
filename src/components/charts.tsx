"use client";
import { useMemo, useRef, useState } from "react";
import * as d3 from "d3";

type Series = { key: string; label: string; color: string };

function Legend({ series }: { series: readonly Series[] }) {
  return (
    <div className="chart-legend">
      {series.map((s) => (
        <span key={s.key}>
          <span className="swatch" style={{ background: s.color, borderRadius: 2, marginRight: 4 }} aria-hidden />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function TableView({ rows, series, xLabel }: { rows: Record<string, number>[]; series: readonly Series[]; xLabel: string }) {
  return (
    <div className="table-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
      <table>
        <thead>
          <tr>
            <th>{xLabel}</th>
            {series.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((r) => series.some((s) => r[s.key] > 0))
            .map((r, i) => (
              <tr key={i}>
                <td>{r.x}</td>
                {series.map((s) => (
                  <td key={s.key}>{r[s.key].toLocaleString("en-IN")}</td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

const W = 900;
const M = { t: 10, r: 12, b: 26, l: 44 };

/** Stacked columns per year with a hover tooltip. One y axis. */
export function StackedYears({
  rows,
  series,
  title,
  yLabel,
  height = 260,
  scale = "linear",
}: {
  rows: Record<string, number>[];
  series: readonly Series[];
  title: string;
  yLabel: string;
  height?: number;
  scale?: "linear" | "sqrt";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const H = height;
  const { x, y, stacked } = useMemo(() => {
    const x = d3.scaleBand<number>().domain(rows.map((r) => r.x)).range([M.l, W - M.r]).paddingInner(0.15);
    const stacked = d3.stack<Record<string, number>>().keys(series.map((s) => s.key))(rows);
    const max = d3.max(stacked.at(-1) ?? [], (d) => d[1]) ?? 1;
    const y = (scale === "sqrt" ? d3.scaleSqrt() : d3.scaleLinear()).domain([0, Math.max(1, max)]).nice().range([H - M.b, M.t]);
    return { x, y, stacked };
  }, [rows, series, H, scale]);
  const ticks = y.ticks(4);
  const hr = hover !== null ? rows[hover] : null;
  return (
    <figure className="chart" style={{ margin: "0 0 28px" }}>
      <figcaption style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}>{title}</strong>
        <button className="chip" onClick={() => setTable(!table)} aria-pressed={table}>
          {table ? "Show chart" : "Show table"}
        </button>
      </figcaption>
      {series.length > 1 && <Legend series={series} />}
      {table ? (
        <TableView rows={rows} series={series} xLabel="Year" />
      ) : (
        <div style={{ position: "relative" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: "auto", minWidth: 560 }}
            role="img"
            aria-label={`${title}. ${yLabel} by year. Use Show table for the values.`}
            onMouseLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="#23272d" />
                <text x={M.l - 6} y={y(t) + 3} textAnchor="end">
                  {d3.format("~s")(t)}
                </text>
              </g>
            ))}
            {stacked.map((layer, li) => (
              <g key={layer.key}>
                {layer.map((d, i) => {
                  const h = y(d[0]) - y(d[1]);
                  if (h <= 0) return null;
                  return (
                    <rect
                      key={i}
                      x={x(rows[i].x)}
                      y={y(d[1]) + (li > 0 ? 1 : 0)}
                      width={x.bandwidth()}
                      height={Math.max(0.5, h - (li > 0 ? 1 : 0))}
                      fill={series[li].color}
                      rx={li === stacked.length - 1 ? 1.5 : 0}
                      opacity={hover === null || hover === i ? 1 : 0.45}
                    />
                  );
                })}
              </g>
            ))}
            {rows.map((r, i) => (
              <rect
                key={`hit${i}`}
                x={(x(r.x) ?? 0) - 1}
                y={M.t}
                width={x.step()}
                height={H - M.t - M.b}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
              />
            ))}
            {[1947, 1965, 1971, 1990, 1999, 2010, 2019, 2026].map((yr) =>
              x(yr) !== undefined ? (
                <text key={yr} x={(x(yr) ?? 0) + x.bandwidth() / 2} y={H - 8} textAnchor="middle">
                  {yr}
                </text>
              ) : null,
            )}
            <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#353b43" />
          </svg>
          {hr && (
            <div
              role="status"
              style={{
                position: "absolute",
                top: 8,
                left: `min(calc(${(((x(hr.x) ?? 0) + x.bandwidth()) / W) * 100}% + 8px), calc(100% - 190px))`,
                background: "#14171b",
                border: "1px solid #353b43",
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: "0.78rem",
                pointerEvents: "none",
                width: 180,
              }}
            >
              <strong>{hr.x}</strong>
              {series.map((s) => (
                <div key={s.key} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>
                    <span className="swatch" style={{ background: s.color, borderRadius: 2, marginRight: 4 }} aria-hidden />
                    {s.label}
                  </span>
                  <span>{hr[s.key].toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

/** Stacked area of counts per year (tactic shift). */
export function StackedArea({ rows, series, title }: { rows: Record<string, number>[]; series: readonly Series[]; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const H = 260;
  const { x, y, stacked } = useMemo(() => {
    const x = d3.scaleLinear().domain([rows[0].x, rows.at(-1)!.x]).range([M.l, W - M.r]);
    const stacked = d3.stack<Record<string, number>>().keys(series.map((s) => s.key))(rows);
    const max = d3.max(stacked.at(-1) ?? [], (d) => d[1]) ?? 1;
    const y = d3.scaleLinear().domain([0, Math.max(1, max)]).nice().range([H - M.b, M.t]);
    return { x, y, stacked };
  }, [rows, series]);
  const area = d3
    .area<d3.SeriesPoint<Record<string, number>>>()
    .x((d) => x(d.data.x))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(d3.curveMonotoneX);
  const hr = hover !== null ? rows[hover] : null;
  return (
    <figure className="chart" style={{ margin: "0 0 28px" }}>
      <figcaption style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}>{title}</strong>
        <button className="chip" onClick={() => setTable(!table)} aria-pressed={table}>
          {table ? "Show chart" : "Show table"}
        </button>
      </figcaption>
      <Legend series={series} />
      {table ? (
        <TableView rows={rows} series={series} xLabel="Year" />
      ) : (
        <div style={{ position: "relative" }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: "auto", minWidth: 560 }}
            role="img"
            aria-label={`${title}. Use Show table for the values.`}
            onMouseMove={(ev) => {
              const r = (ev.currentTarget as SVGSVGElement).getBoundingClientRect();
              const px = ((ev.clientX - r.left) / r.width) * W;
              const yr = Math.round(x.invert(px));
              const i = rows.findIndex((row) => row.x === yr);
              setHover(i >= 0 ? i : null);
            }}
            onMouseLeave={() => setHover(null)}
          >
            {y.ticks(4).map((t) => (
              <g key={t}>
                <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="#23272d" />
                <text x={M.l - 6} y={y(t) + 3} textAnchor="end">
                  {t}
                </text>
              </g>
            ))}
            {stacked.map((layer, i) => (
              <path key={layer.key} d={area(layer) ?? ""} fill={series[i].color} opacity={0.9} stroke="#07080a" strokeWidth={1} />
            ))}
            {hr && <line x1={x(hr.x)} x2={x(hr.x)} y1={M.t} y2={H - M.b} stroke="#e6e8eb" strokeWidth={1} />}
            {rows.filter((r) => r.x % 10 === 0 || r.x === rows[0].x).map((r) => r.x).map((yr) => (
              <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle">
                {yr}
              </text>
            ))}
            <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#353b43" />
          </svg>
          {hr && (
            <div
              role="status"
              style={{
                position: "absolute",
                top: 8,
                left: `min(calc(${(x(hr.x) / W) * 100}% + 8px), calc(100% - 230px))`,
                background: "#14171b",
                border: "1px solid #353b43",
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: "0.78rem",
                pointerEvents: "none",
                width: 220,
              }}
            >
              <strong>{hr.x}</strong>
              {series.map((s) => (
                <div key={s.key} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>
                    <span className="swatch" style={{ background: s.color, borderRadius: 2, marginRight: 4 }} aria-hidden />
                    {s.label}
                  </span>
                  <span>{hr[s.key]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

/** Ranked horizontal bars, single series (no legend; the title names it). */
export function RankedBars({ items, title, color = "#3987e5", unit }: { items: { label: string; value: number }[]; title: string; color?: string; unit: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <figure className="chart" style={{ margin: "0 0 28px" }}>
      <figcaption>
        <strong style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}>{title}</strong>
      </figcaption>
      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
        {items.map((i) => (
          <li key={i.label} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 38%) 1fr auto", gap: 8, alignItems: "center", fontSize: "0.82rem", margin: "3px 0" }} title={`${i.label}: ${i.value} ${unit}`}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.label}</span>
            <span style={{ background: "#14171b", borderRadius: 4, height: 10 }}>
              <span style={{ display: "block", width: `${(i.value / max) * 100}%`, height: "100%", background: color, borderRadius: "0 4px 4px 0" }} />
            </span>
            <span className="muted" style={{ minWidth: 40, textAlign: "right" }}>
              {i.value.toLocaleString("en-IN")}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
