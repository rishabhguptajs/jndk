import type { Metadata } from "next";
import Link from "next/link";
import { getEvents, getGroups, getInfrastructure, getRoutes } from "@/lib/serverData";
import type { Group } from "@/lib/schema";

export const metadata: Metadata = { title: "Groups and terror infrastructure | J&K Conflict Atlas" };

const KIND_LABEL: Record<Group["kind"], string> = {
  terror_group: "Terrorist group",
  front: "Front",
  state_military: "State military",
  state_agency: "State agency",
  irregular: "Irregular force",
};

function Ban({ b, label }: { b: Group["bans"]["india_uapa"]; label: string }) {
  if (!b) return null;
  return (
    <li>
      {label}: {b.instrument}
      {b.date ? `, ${b.date}` : ""}
    </li>
  );
}

/** Lineage graph: parents on the left, fronts and wings to the right. Plain SVG, no layout library. */
function Lineage({ groups }: { groups: Group[] }) {
  const roots = groups.filter((g) => !g.parent && groups.some((c) => c.parent === g.id));
  const rowH = 34;
  let row = 0;
  const nodes: { g: Group; x: number; y: number }[] = [];
  const links: { from: { x: number; y: number }; to: { x: number; y: number }; label: string }[] = [];
  for (const r of roots) {
    const kids = groups.filter((c) => c.parent === r.id);
    const ry = (row + (kids.length - 1) / 2) * rowH + 24;
    nodes.push({ g: r, x: 20, y: ry });
    for (const k of kids) {
      const ky = row * rowH + 24;
      nodes.push({ g: k, x: 360, y: ky });
      links.push({ from: { x: 250, y: ry }, to: { x: 360, y: ky }, label: k.relationship_to_parent ?? "" });
      row++;
    }
    row += 0.6;
  }
  const H = row * rowH + 20;
  return (
    <figure className="chart">
      <svg viewBox={`0 0 640 ${H}`} style={{ width: "100%", maxWidth: 720, height: "auto" }} role="img" aria-label="Group lineage: parent organisations and their fronts and wings">
        {links.map((l, i) => (
          <g key={i}>
            <path d={`M${l.from.x},${l.from.y} C${l.from.x + 60},${l.from.y} ${l.to.x - 60},${l.to.y} ${l.to.x},${l.to.y}`} fill="none" stroke="#59616b" />
            <text x={(l.from.x + l.to.x) / 2} y={(l.from.y + l.to.y) / 2 - 4} textAnchor="middle" fontSize={10}>
              {l.label}
            </text>
          </g>
        ))}
        {nodes.map((n) => (
          <g key={n.g.id}>
            <rect x={n.x} y={n.y - 12} width={230} height={24} rx={4} fill="#14171b" stroke={n.g.kind === "front" ? "#c98500" : "#59616b"} />
            <text x={n.x + 8} y={n.y + 4} fontSize={11} style={{ fill: "#e6e8eb" }}>
              {n.g.name.length > 36 ? n.g.name.slice(0, 35) + "…" : n.g.name}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="faint" style={{ fontSize: "0.78rem" }}>
        Amber outline: fronts used to claim attacks while the parent group stays in the background.
      </figcaption>
    </figure>
  );
}

export default function GroupsPage() {
  const groups = getGroups();
  const events = getEvents();
  const infra = getInfrastructure();
  const routes = getRoutes();
  const count = (id: string) => events.filter((e) => e.perpetrator_group.includes(id)).length;
  return (
    <div className="page wide">
      <h1>Groups and terror infrastructure</h1>
      <p className="muted">
        Organisations named as perpetrators in the atlas, with their bans under Indian law, the UN 1267 sanctions list and the US Foreign Terrorist
        Organization list, as stated in the cited official sources. Camps and headquarters are shown only at the area level reported publicly.
      </p>
      <h2>Lineage: parents, fronts and wings</h2>
      <Lineage groups={groups} />
      <h2>Registry</h2>
      <div className="card-grid">
        {groups.map((g) => (
          <div className="card" key={g.id} id={g.id}>
            <h3 style={{ margin: "0 0 4px" }}>{g.name}</h3>
            <div className="faint" style={{ fontSize: "0.78rem" }}>
              {KIND_LABEL[g.kind]}
              {g.parent ? ` of ${groups.find((p) => p.id === g.parent)?.name}` : ""}
              {g.founded ? ` · founded ${g.founded}` : ""} · {g.status}
            </div>
            <p style={{ fontSize: "0.85rem" }}>{g.summary}</p>
            {g.aliases.length > 0 && <p className="faint" style={{ fontSize: "0.78rem" }}>Also known as: {g.aliases.join(", ")}</p>}
            {g.founders.length > 0 && <p className="faint" style={{ fontSize: "0.78rem" }}>Founders: {g.founders.join(", ")}</p>}
            {g.hq && <p className="faint" style={{ fontSize: "0.78rem" }}>Headquarters (reported): {g.hq.name}</p>}
            <ul style={{ fontSize: "0.8rem", paddingLeft: 18 }}>
              <Ban b={g.bans.india_uapa} label="India" />
              <Ban b={g.bans.un_1267} label="UN" />
              <Ban b={g.bans.us_fto} label="US" />
            </ul>
            <p style={{ fontSize: "0.8rem" }}>
              <Link href={`/?group=${g.id}`}>{count(g.id)} events attributed in the atlas</Link>
            </p>
            <details style={{ fontSize: "0.78rem" }}>
              <summary>Sources</summary>
              <ol className="source-list">
                {g.sources.map((s) => (
                  <li key={s.id}>
                    {s.publisher}, {s.url ? <a href={s.url}>{s.title}</a> : s.title}
                  </li>
                ))}
              </ol>
            </details>
          </div>
        ))}
      </div>

      <h2>Camps, launch pads and headquarters (reported)</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Group</th>
              <th>Area</th>
              <th>Status</th>
              <th>Sources</th>
            </tr>
          </thead>
          <tbody>
            {infra.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>{i.group_ids.map((id) => groups.find((g) => g.id === id)?.name ?? id).join(", ")}</td>
                <td>{i.approx_location}</td>
                <td>{i.status}</td>
                <td>
                  {i.sources.map((s, k) => (
                    <a key={s.id} href={s.url ?? undefined} style={{ marginRight: 6 }}>
                      [{k + 1}]
                    </a>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Infiltration routes (schematic)</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sector</th>
              <th>As reported</th>
              <th>Status</th>
              <th>Sources</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.id}>
                <td>{r.sector}</td>
                <td>{r.description}</td>
                <td>{r.status.replace("_", " ")}</td>
                <td>
                  {r.sources.map((s, k) => (
                    <a key={s.id} href={s.url ?? undefined} style={{ marginRight: 6 }}>
                      [{k + 1}]
                    </a>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
