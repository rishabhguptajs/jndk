import type { Metadata } from "next";
import Link from "next/link";
import { getEvents } from "@/lib/serverData";
import type { Source } from "@/lib/schema";

export const metadata: Metadata = { title: "Sources | J&K Conflict Atlas" };

export default function SourcesPage() {
  const events = getEvents();
  const map = new Map<string, { s: Source; events: { id: string; title: string }[] }>();
  for (const e of events)
    for (const s of e.sources) {
      if (!map.has(s.id)) map.set(s.id, { s, events: [] });
      map.get(s.id)!.events.push({ id: e.id, title: e.title });
    }
  const byPublisher = new Map<string, { s: Source; events: { id: string; title: string }[] }[]>();
  for (const v of map.values()) {
    const k = v.s.publisher;
    if (!byPublisher.has(k)) byPublisher.set(k, []);
    byPublisher.get(k)!.push(v);
  }
  const pubs = [...byPublisher.entries()].sort((a, b) => b[1].length - a[1].length);
  return (
    <div className="page">
      <h1>Sources</h1>
      <p className="muted">
        All {map.size} sources cited by events, grouped by publisher. Archive links marked as a lookup have not yet been checked against the Wayback Machine.
      </p>
      <p>
        {pubs.map(([p, list]) => (
          <a key={p} href={`#${encodeURIComponent(p)}`} style={{ marginRight: 12, whiteSpace: "nowrap" }}>
            {p} ({list.length})
          </a>
        ))}
      </p>
      {pubs.map(([p, list]) => (
        <section key={p} id={encodeURIComponent(p)}>
          <h2>{p}</h2>
          <ul className="source-list">
            {list
              .sort((a, b) => (b.s.date ?? "").localeCompare(a.s.date ?? ""))
              .map(({ s, events }) => (
                <li key={s.id}>
                  {s.url ? <a href={s.url}>{s.title}</a> : <cite>{s.title}</cite>}
                  {s.date ? ` (${s.date})` : ""}
                  {s.archive_url && (
                    <>
                      {" · "}
                      <a href={s.archive_url}>{s.archive_checked ? "archived" : "archive lookup"}</a>
                    </>
                  )}
                  <br />
                  <span className="faint">
                    Cited by:{" "}
                    {events.map((e, i) => (
                      <span key={e.id}>
                        {i ? "; " : ""}
                        <Link href={`/event/${e.id}/`}>{e.title}</Link>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
