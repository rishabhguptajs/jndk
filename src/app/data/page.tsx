import type { Metadata } from "next";

export const metadata: Metadata = { title: "Data downloads | J&K Conflict Atlas" };

const FILES = [
  ["/data/download/events.csv", "Events (CSV)", "One row per event, with tolls as min and max, sources and summary."],
  ["/data/download/events.geojson", "Events (GeoJSON)", "Points with all event fields as properties."],
  ["/data/events.json", "Events (JSON)", "The full validated records, including figures by source and named victims."],
  ["/data/groups.json", "Groups (JSON)", "Group registry with fronts, HQs and ban dates."],
  ["/data/download/groups.csv", "Groups (CSV)", "Flat version of the group registry."],
  ["/data/group_zones.json", "Group zones (JSON)", "Districts per group and year, derived from attributed events."],
  ["/data/infrastructure.json", "Terror infrastructure (JSON)", "Publicly reported camps and HQs, area level only."],
  ["/data/routes.json", "Infiltration routes (JSON)", "Schematic routes with sources."],
  ["/data/download/sources.csv", "Sources (CSV)", "Every cited source and the events that cite it."],
  ["/data/coverage.json", "Coverage by year (JSON)", "Events, share with 2+ sources and share geocoded per year."],
  ["/data/districts_index.json", "District periods (JSON)", "Which district boundaries apply to which years."],
  ["/geo/india-soi.geojson", "India boundary (GeoJSON)", "Survey of India boundary via DataMeet, simplified."],
] as const;

export default function DataPage() {
  return (
    <div className="page">
      <h1>Data downloads</h1>
      <p className="muted">
        The data behind the atlas. Reuse terms for the compiled dataset are to be set by the project owner. Event summaries are original writing for this project; follow the cited sources
        for the underlying reporting. The India boundary is from DataMeet (CC-BY-SA 2.5 / ODbL) and district boundaries from DataMeet&apos;s Census
        shapefiles (CC-BY 2.5 India).
      </p>
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>What it holds</th>
          </tr>
        </thead>
        <tbody>
          {FILES.map(([href, label, desc]) => (
            <tr key={href}>
              <td>
                <a href={href} download>
                  {label}
                </a>
              </td>
              <td>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Historical district boundaries</h2>
      <ul>
        <li><a href="/data/districts/jk_1979_2006.geojson" download>1979 to 2006 (14 districts)</a></li>
        <li><a href="/data/districts/jk_2007_2019.geojson" download>2007 to October 2019 (22 districts)</a></li>
        <li><a href="/data/districts/jk_ladakh_2019_present.geojson" download>From 31 October 2019 (UTs of J&amp;K and Ladakh)</a></li>
      </ul>
    </div>
  );
}
