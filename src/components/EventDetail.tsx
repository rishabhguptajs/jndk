import type { Event, Group } from "@/lib/schema";
import { CATEGORY_META, CONFIDENCE_LABEL, GROUPS, TACTIC_LABEL, TARGET_LABEL, groupOf } from "@/lib/categories";
import { fmtDate, fmtRange } from "@/lib/analysis";

export const REPORT_ERROR_URL = "https://github.com/rishabhguptajs/jndk/issues/new";

const ATTRIBUTION_LABEL: Record<Event["attribution"], string> = {
  claimed: "Claimed by the group",
  officially_attributed: "Officially attributed",
  suspected: "Suspected",
  state_actor: "State actor",
  not_applicable: "Not applicable",
  unknown: "Not established",
};

const PRECISION_LABEL: Record<string, string> = {
  exact: "exact location",
  village: "village or town level",
  tehsil: "tehsil or area level",
  district: "district level",
  region: "region level only",
};

export function EventDetail({ e, groups, headingLevel = 2 }: { e: Event; groups: Group[]; headingLevel?: 1 | 2 }) {
  const H = headingLevel === 1 ? "h1" : "h2";
  const g = GROUPS[groupOf(e.category)];
  const groupName = (id: string) => groups.find((x) => x.id === id)?.name ?? id;
  const srcIndex = new Map(e.sources.map((s, i) => [s.id, i + 1]));
  const tolls = [
    { l: "Killed (all)", v: e.killed.total },
    { l: "Civilians", v: e.killed.civilians },
    { l: "Security forces", v: e.killed.security_forces },
    { l: "Terrorists", v: e.killed.terrorists },
    { l: "Injured", v: e.injured },
  ];
  const mailBody = encodeURIComponent(`Event: ${e.id}\nWhat is wrong:\nSource for the correction:\n`);
  return (
    <article aria-labelledby={`ev-${e.id}`}>
      <div className="event-meta">
        <span className="tag" style={{ borderColor: g.color, color: "#e6e8eb" }}>
          <span className="swatch" style={{ background: g.color, width: 8, height: 8, marginRight: 4 }} aria-hidden />
          {CATEGORY_META[e.category].label}
        </span>
        <span className="tag">{CONFIDENCE_LABEL[e.confidence]}</span>
      </div>
      <H id={`ev-${e.id}`}>{e.title}</H>
      <div className="event-meta">
        {fmtDate(e)}
        {e.time ? `, ${e.time}` : ""} · {e.place_name}
      </div>

      <div className="toll-grid">
        {tolls.map((t) => (
          <div className="toll" key={t.l}>
            <div className="n">{fmtRange(t.v, "Not known")}</div>
            <div className="l">{t.l}</div>
          </div>
        ))}
        {e.displaced && e.displaced.min !== null && (
          <div className="toll">
            <div className="n">{fmtRange(e.displaced)}</div>
            <div className="l">Displaced (persons)</div>
          </div>
        )}
        {e.abducted ? (
          <div className="toll">
            <div className="n">{e.abducted}</div>
            <div className="l">Abducted</div>
          </div>
        ) : null}
      </div>

      <p>{e.summary}</p>
      {e.notes && <p className="callout">{e.notes}</p>}

      {e.figures_by_source.length > 0 && (
        <>
          <h3>Figures by source</h3>
          <ul className="source-list">
            {e.figures_by_source.map((f, i) => (
              <li key={i}>
                [{srcIndex.get(f.source_id)}]{" "}
                {[
                  f.killed_total != null ? `${f.killed_total} killed` : null,
                  f.killed_civilians != null ? `${f.killed_civilians} civilians` : null,
                  f.killed_security_forces != null ? `${f.killed_security_forces} security forces` : null,
                  f.killed_terrorists != null ? `${f.killed_terrorists} terrorists` : null,
                  f.injured != null ? `${f.injured} injured` : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
                {f.note ? `${f.killed_total != null || f.injured != null ? ". " : ""}${f.note}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}

      <dl className="dl">
        <dt>District then</dt>
        <dd>{e.district_at_time ?? "Not recorded"}</dd>
        <dt>District now</dt>
        <dd>{e.district_current ?? "Not recorded"}</dd>
        <dt>Region</dt>
        <dd>{e.region}</dd>
        <dt>Map location</dt>
        <dd>{PRECISION_LABEL[e.geo_precision]}</dd>
        <dt>Tactic</dt>
        <dd>{e.tactic ? TACTIC_LABEL[e.tactic] : "Not recorded"}</dd>
        <dt>Targets</dt>
        <dd>{e.target_type.map((t) => TARGET_LABEL[t]).join(", ")}</dd>
        {e.victim_community && (
          <>
            <dt>Victims (as reported)</dt>
            <dd>{e.victim_community}</dd>
          </>
        )}
        <dt>Perpetrators</dt>
        <dd>{e.perpetrator_group.length ? e.perpetrator_group.map(groupName).join(", ") : "Not established"}</dd>
        <dt>Attribution</dt>
        <dd>{ATTRIBUTION_LABEL[e.attribution]}</dd>
      </dl>

      {e.victims.length > 0 && (
        <>
          <h3>Named victims</h3>
          <p className="faint" style={{ fontSize: "0.78rem" }}>
            Only names published in news or official records, each linked to its source.
          </p>
          <ul className="source-list">
            {e.victims.map((v) => (
              <li key={v.name}>
                {v.name}
                {v.age ? `, ${v.age}` : ""}
                {v.role ? `, ${v.role}` : ""} [{srcIndex.get(v.source_id)}]
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Sources</h3>
      <ol className="source-list">
        {e.sources.map((s) => (
          <li key={s.id}>
            {s.publisher}, {s.url ? <a href={s.url} rel="noopener noreferrer" target="_blank">{s.title}</a> : <cite>{s.title}</cite>}
            {s.date ? ` (${s.date})` : ""}
            {s.pages ? `, pp. ${s.pages}` : ""}
            {s.archive_url && (
              <>
                {" · "}
                <a href={s.archive_url} rel="noopener noreferrer" target="_blank">
                  {s.archive_checked ? "Archived copy" : "Archive lookup (not yet verified)"}
                </a>
              </>
            )}
          </li>
        ))}
      </ol>

      <p style={{ fontSize: "0.82rem" }}>
        <a href={`/event/${e.id}/`}>Permalink</a> ·{" "}
        <a href={`${REPORT_ERROR_URL}?title=${encodeURIComponent(`Correction: ${e.id}`)}&body=${mailBody}`} rel="noopener noreferrer" target="_blank">
          Report an error
        </a>
      </p>
    </article>
  );
}
