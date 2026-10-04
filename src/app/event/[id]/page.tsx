import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvents, getGroups } from "@/lib/serverData";
import { EventDetail } from "@/components/EventDetail";

export function generateStaticParams() {
  return getEvents().map((e) => ({ id: e.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const e = getEvents().find((x) => x.id === id);
  return { title: e ? `${e.title} | J&K Conflict Atlas` : "Event | J&K Conflict Atlas", description: e?.summary };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const events = getEvents();
  const i = events.findIndex((x) => x.id === id);
  if (i < 0) notFound();
  const e = events[i];
  const prev = events[i - 1];
  const next = events[i + 1];
  return (
    <div className="page">
      <p>
        <Link href={`/?event=${e.id}`}>View on the map</Link>
      </p>
      <EventDetail e={e} groups={getGroups()} headingLevel={1} />
      <nav aria-label="Neighbouring events" className="row" style={{ justifyContent: "space-between", marginTop: 32, fontSize: "0.85rem" }}>
        {prev ? <Link href={`/event/${prev.id}/`}>Earlier: {prev.title}</Link> : <span />}
        {next ? <Link href={`/event/${next.id}/`}>Later: {next.title}</Link> : <span />}
      </nav>
    </div>
  );
}
