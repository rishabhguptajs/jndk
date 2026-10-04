import type { Metadata } from "next";
import Link from "next/link";
import { getCoverage, getEvents } from "@/lib/serverData";
import { REPORT_ERROR_URL } from "@/components/EventDetail";

export const metadata: Metadata = { title: "Methodology | J&K Conflict Atlas" };

export default function Methodology() {
  const cov = getCoverage();
  const events = getEvents();
  const gaps = cov.filter((c) => c.gap).map((c) => c.year);
  const srcs = events.flatMap((e) => e.sources);
  const verified = srcs.filter((s) => s.archive_checked).length;
  return (
    <div className="page">
      <h1>Methodology</h1>
      <p className="muted">
        How this atlas is built, what it includes, where it is thin, and how to read its numbers. The atlas records events from India&apos;s
        perspective: Pakistan&apos;s wars and aggression, terrorist attacks and massacres, and India&apos;s response.
      </p>

      <h2>Scope</h2>
      <ul>
        <li>Pakistan&apos;s 1947 to 1948 invasion and later wars (1965, 1971, Kargil 1999), Siachen, cross-border shelling, and the May 2025 conflict.</li>
        <li>Terrorist attacks on civilians, pilgrims and security forces, massacres and targeted killings of Hindus, Sikhs, migrant workers and others.</li>
        <li>India&apos;s response: strikes across the LoC and border, major counter-terror operations and the killing of top commanders, and policy milestones.</li>
        <li>
          Not included: violence by security forces against civilians, such as the January 1990 Gawkadal firing, and communal violence in the
          Jammu region in 1947. Where such an incident is directly tied to an event in the atlas, it is noted in that event&apos;s notes. This is a
          choice of scope stated openly, not a claim that those events did not happen.
        </li>
        <li>Two categories were added to the original brief so that events are not forced into the wrong type: riot (the 1986 Anantnag riots) and abduction or hijacking.</li>
      </ul>

      <h2>Sources and rules</h2>
      <ul>
        <li>Every event cites at least one source. Events with five or more killed, or marked high profile, must cite at least two independent publishers. The build fails otherwise.</li>
        <li>Independence is counted by publisher. Two articles from the same newspaper count once. Reference works never count.</li>
        <li>
          Confidence: <strong>confirmed</strong> means two or more independent sources agree on the core facts; <strong>reported</strong> means the
          event or its toll rests on one source; <strong>disputed</strong> means sources disagree on the toll, date or attribution.
        </li>
        <li>Summaries are written in our own words in two to five sentences. Article text is not copied.</li>
        <li>Victim names appear only where published in news or official records, each linked to its source.</li>
        <li>
          Publication dates of news sources are given to the month where the exact day could not be confirmed. Dates of the events themselves are given at
          day, month or year precision as the sources allow.
        </li>
      </ul>

      <h2>How ranges work</h2>
      <p>
        Counts are stored as a lower and upper bound. When sources agree, both are the same. When they differ, the range shows the lowest and highest
        published figure, and each source&apos;s own figure is listed under &quot;Figures by source&quot; on the event card. No single figure is chosen.
        Unknown counts stay blank; they are never filled with an estimate. Totals on the statistics page add up the lower bounds.
      </p>

      <h2>Locations</h2>
      <ul>
        <li>Coordinates come only from a gazetteer built from Census district boundaries (DataMeet) and GeoNames towns. Each event records its precision: exact, village or town, tehsil, district or region.</li>
        <li>No event claims more precision than its gazetteer point. Where a village is not in the gazetteer, the event is placed at the nearest town or the district and marked as such. Faded markers on the map are district or region level.</li>
        <li>Each event records its district at the time and its district today.</li>
      </ul>

      <h2>The map of India</h2>
      <ul>
        <li>The country outline is the Survey of India boundary (DataMeet <code>india-soi.geojson</code>). The whole of Jammu and Kashmir and Ladakh, including Pakistan-occupied Jammu and Kashmir, Gilgit-Baltistan, Aksai Chin and the Shaksgam Valley, is drawn as Indian territory.</li>
        <li>The basemap is self-hosted terrain (AWS Open Data elevation tiles packed as PMTiles) with Natural Earth physical layers stripped of every attribute. No third-party tiles that draw borders are used. An automated test renders the map in a browser and fails the build if PoJK, Gilgit-Baltistan, Aksai Chin or Shaksgam are not drawn as India.</li>
        <li>The Line of Control and the LAC are optional, off by default, approximate, and labelled as military lines, not borders.</li>
        <li>
          After 31 October 2019, Pakistan-occupied Mirpur, Muzaffarabad and Poonch are shown in the Union Territory of Jammu and Kashmir and
          Gilgit-Baltistan in the Union Territory of Ladakh, following the Survey of India maps of 2 November 2019.
        </li>
      </ul>

      <h2>Historical districts</h2>
      <ul>
        <li>1979 to 2006: 14 districts (Census 2001 boundaries).</li>
        <li>2007 to October 2019: 22 districts (Census 2011 boundaries), after the eight new districts of 2006 became functional.</li>
        <li>From 31 October 2019: the same 22 districts, split into the UT of Jammu and Kashmir (20) and the UT of Ladakh (2). The five new Ladakh districts announced in August 2024 are not drawn because no official boundaries have been published.</li>
        <li>1947 to 1978: no digitised boundaries were found, so the district map view is off for these years.</li>
      </ul>

      <h2>Coverage and known gaps</h2>
      <p>
        The aim is every recorded incident. This version does not reach that. The build environment could not reach the South Asia Terrorism Portal,
        the Global Terrorism Database, archive.org, Wikipedia or ministry websites directly, so events were researched one by one through search
        and cross-checked against two publishers. The scrapers for SATP and the GTD are in the repository and ready to run where those sites are
        reachable. Until then the atlas holds {events.length} events and undercounts heavily, above all for the 1990s and early 2000s.
      </p>
      <p>
        Archive links: {verified} of {srcs.length} source citations have a verified Wayback snapshot. The rest link to a Wayback lookup that has not
        been checked, and are labelled that way.
      </p>
      <p>Years with no events recorded yet: {gaps.join(", ")}.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Events</th>
              <th>2+ sources</th>
              <th>Town or better</th>
              <th>Killed (min to max)</th>
            </tr>
          </thead>
          <tbody>
            {cov
              .filter((c) => !c.gap)
              .map((c) => (
                <tr key={c.year}>
                  <td>{c.year}</td>
                  <td>{c.events}</td>
                  <td>{c.two_plus_sources_pct}%</td>
                  <td>{c.village_geocoded_pct}%</td>
                  <td>{c.killed_min === c.killed_max ? c.killed_min : `${c.killed_min} to ${c.killed_max}`}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <h2>Corrections</h2>
      <p>
        Every event card has a <a href={REPORT_ERROR_URL}>Report an error</a> link. Please include a source for the correction. See also the{" "}
        <Link href="/sources/">sources index</Link> and the <Link href="/data/">data downloads</Link>.
      </p>
    </div>
  );
}
