import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

const isoDate = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "date must be YYYY, YYYY-MM or YYYY-MM-DD");
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "ids are lowercase slugs");

/** A count that may be unknown (null) or reported as a range. */
export const Range = z
  .object({
    min: z.number().int().nonnegative().nullable(),
    max: z.number().int().nonnegative().nullable(),
  })
  .strict()
  .refine((r) => (r.min === null) === (r.max === null), "min and max must both be null or both be set")
  .refine((r) => r.min === null || r.max === null || r.min <= r.max, "min must be <= max");
export type Range = z.infer<typeof Range>;

export const Source = z
  .object({
    id: slug,
    url: z.string().url().nullable(), // null only for print sources (books, reports without a URL)
    archive_url: z.string().url().nullable(),
    /** true once the archive_url has been confirmed to resolve to a snapshot */
    archive_checked: z.boolean(),
    publisher: z.string().min(1),
    title: z.string().min(1),
    date: isoDate.nullable(),
    /** page numbers for books and long reports */
    pages: z.string().nullable().optional(),
    kind: z.enum(["news", "official", "database", "book", "report", "court", "reference"]),
  })
  .strict()
  .refine((s) => s.url !== null || s.kind === "book" || s.kind === "report", "web sources need a url")
  .refine((s) => s.url === null || s.archive_url !== null, "every web source needs an archive_url");
export type Source = z.infer<typeof Source>;

/* ------------------------------------------------------------------ */
/* Event                                                               */
/* ------------------------------------------------------------------ */

export const CATEGORIES = [
  "war",
  "massacre",
  "targeted_killing",
  "pilgrim_attack",
  "fidayeen",
  "ied",
  "grenade",
  "ambush",
  "encounter",
  "cross_border_shelling",
  "infiltration",
  "exodus",
  "india_strike",
  "policy",
  // extensions to the brief, documented on the methodology page
  "riot",
  "abduction",
] as const;
export const Category = z.enum(CATEGORIES);
export type Category = z.infer<typeof Category>;

export const REGIONS = ["Kashmir Valley", "Jammu", "Ladakh", "PoJK", "Outside J&K"] as const;
export const Region = z.enum(REGIONS);

export const GEO_PRECISION = ["exact", "village", "tehsil", "district", "region"] as const;
export const GeoPrecision = z.enum(GEO_PRECISION);

export const TARGET_TYPES = [
  "civilians",
  "pilgrims",
  "security_forces",
  "police",
  "political",
  "migrant_workers",
  "minority_community",
  "government_employees",
  "terrorists",
  "military",
  "infrastructure",
  "none",
] as const;
export const TargetType = z.enum(TARGET_TYPES);

export const TACTICS = [
  "armed_assault",
  "mass_shooting",
  "targeted_shooting",
  "suicide_fidayeen",
  "ied",
  "vbied",
  "grenade",
  "ambush",
  "arson",
  "abduction",
  "artillery_shelling",
  "drone",
  "conventional_war",
  "air_strike",
  "ground_raid",
  "missile_strike",
  "cordon_and_search",
  "policy_measure",
  "displacement",
  "hijacking",
  "kidnapping",
  "other",
] as const;
export const Tactic = z.enum(TACTICS);

export const Victim = z
  .object({
    name: z.string().min(1),
    age: z.number().int().positive().nullable(),
    role: z.string().nullable(),
    source_id: slug,
  })
  .strict();

/** Figures as stated by one source. Used to show disagreements. */
export const SourceFigures = z
  .object({
    source_id: slug,
    killed_total: z.number().int().nonnegative().nullable().optional(),
    killed_civilians: z.number().int().nonnegative().nullable().optional(),
    killed_security_forces: z.number().int().nonnegative().nullable().optional(),
    killed_terrorists: z.number().int().nonnegative().nullable().optional(),
    injured: z.number().int().nonnegative().nullable().optional(),
    note: z.string().optional(),
  })
  .strict();

export const Event = z
  .object({
    id: slug,
    date: isoDate,
    /** last day for multi-day events (wars, exodus, operations) */
    end_date: isoDate.nullable().optional(),
    date_precision: z.enum(["day", "month", "year"]),
    time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    title: z.string().min(3),
    place_name: z.string().min(1),
    district_at_time: z.string().nullable(),
    district_current: z.string().nullable(),
    region: Region,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    geo_precision: GeoPrecision,
    category: Category,
    tactic: Tactic.nullable(),
    target_type: z.array(TargetType).min(1),
    victim_community: z.string().nullable(),
    perpetrator_group: z.array(z.string()).describe("group ids from groups.json, or free text when not in the registry"),
    attribution: z.enum(["claimed", "officially_attributed", "suspected", "state_actor", "not_applicable", "unknown"]),
    killed: z
      .object({ civilians: Range, security_forces: Range, terrorists: Range, total: Range })
      .strict(),
    injured: Range,
    abducted: z.number().int().nonnegative().nullable(),
    /** persons displaced, for exodus events */
    displaced: Range.nullable().optional(),
    figures_by_source: z.array(SourceFigures).default([]),
    victims: z.array(Victim).default([]),
    summary: z.string().min(40),
    sources: z.array(Source).min(1),
    confidence: z.enum(["confirmed", "reported", "disputed"]),
    high_profile: z.boolean().default(false),
    cross_border: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    notes: z.string().nullable(),
  })
  .strict()
  .superRefine((e, ctx) => {
    const ids = new Set(e.sources.map((s) => s.id));
    if (ids.size !== e.sources.length) ctx.addIssue({ code: "custom", message: "duplicate source id" });
    for (const v of e.victims)
      if (!ids.has(v.source_id)) ctx.addIssue({ code: "custom", message: `victim ${v.name} cites unknown source ${v.source_id}` });
    for (const f of e.figures_by_source)
      if (!ids.has(f.source_id)) ctx.addIssue({ code: "custom", message: `figures cite unknown source ${f.source_id}` });

    // Independence is counted by distinct publisher. Reference works (encyclopedias,
    // aggregators) never count toward independence.
    const publishers = new Set(e.sources.filter((s) => s.kind !== "reference").map((s) => s.publisher.toLowerCase()));
    const major = (e.killed.total.max ?? 0) >= 5 || e.high_profile;
    if (major && publishers.size < 2)
      ctx.addIssue({ code: "custom", message: "major events (5+ killed or high profile) need 2+ independent sources" });
    if (e.confidence === "confirmed" && publishers.size < 2)
      ctx.addIssue({ code: "custom", message: "confirmed needs 2+ independent sources" });
    // "reported" is allowed with several sources when the toll rests on only one of them.

    // Totals must be consistent with the parts where all parts are known.
    const k = e.killed;
    const parts = [k.civilians, k.security_forces, k.terrorists];
    if (parts.every((p) => p.min !== null) && k.total.min !== null) {
      const sumMin = parts.reduce((a, p) => a + (p.min ?? 0), 0);
      const sumMax = parts.reduce((a, p) => a + (p.max ?? 0), 0);
      if (k.total.max! < sumMin || k.total.min > sumMax)
        ctx.addIssue({ code: "custom", message: `killed.total ${k.total.min}-${k.total.max} inconsistent with parts ${sumMin}-${sumMax}` });
    }
    if (e.date_precision === "day" && !/^\d{4}-\d{2}-\d{2}$/.test(e.date))
      ctx.addIssue({ code: "custom", message: "day precision needs YYYY-MM-DD" });
    if (/[—]/.test(e.summary + e.title + (e.notes ?? "")))
      ctx.addIssue({ code: "custom", message: "no em dashes in copy" });
    const sentences = e.summary.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    if (sentences < 2 || sentences > 5) ctx.addIssue({ code: "custom", message: `summary must be 2 to 5 sentences (has ${sentences})` });
  });
export type Event = z.infer<typeof Event>;

/* ------------------------------------------------------------------ */
/* Groups and terror infrastructure                                    */
/* ------------------------------------------------------------------ */

const BanEntry = z
  .object({ date: isoDate.nullable(), instrument: z.string(), source_id: slug })
  .strict()
  .nullable();

export const Group = z
  .object({
    id: slug,
    name: z.string(),
    kind: z.enum(["terror_group", "front", "state_military", "state_agency", "irregular"]),
    aliases: z.array(z.string()),
    founded: isoDate.nullable(),
    founders: z.array(z.string()),
    parent: slug.nullable(),
    relationship_to_parent: z.enum(["front", "splinter", "merged_into", "wing", "successor"]).nullable(),
    hq: z.object({ name: z.string(), lat: z.number(), lng: z.number(), precision: z.enum(["town", "district", "region"]) }).strict().nullable(),
    sponsor: z.string().nullable(),
    bans: z.object({ india_uapa: BanEntry, un_1267: BanEntry, us_fto: BanEntry }).strict(),
    active_years: z.object({ from: z.number().int().nullable(), to: z.number().int().nullable() }).strict(),
    status: z.enum(["active", "defunct", "dormant", "unknown"]),
    summary: z.string().min(20),
    sources: z.array(Source).min(1),
  })
  .strict()
  .superRefine((g, ctx) => {
    const ids = new Set(g.sources.map((s) => s.id));
    for (const b of Object.values(g.bans)) if (b && !ids.has(b.source_id)) ctx.addIssue({ code: "custom", message: `ban cites unknown source ${b.source_id}` });
  });
export type Group = z.infer<typeof Group>;

export const GroupZone = z
  .object({
    group_id: slug,
    year: z.number().int().min(1947).max(2026),
    districts: z.array(z.string()).min(1),
    source_ids: z.array(slug).min(1),
    sources: z.array(Source).min(1),
    note: z.string().nullable(),
  })
  .strict();
export type GroupZone = z.infer<typeof GroupZone>;

export const Infrastructure = z
  .object({
    id: slug,
    type: z.enum(["camp", "launch_pad", "hq"]),
    name: z.string(),
    group_ids: z.array(slug),
    approx_location: z.string(),
    lat: z.number(),
    lng: z.number(),
    /** area-level precision only, by design */
    precision: z.enum(["town", "district", "region"]),
    first_reported: isoDate.nullable(),
    last_reported: isoDate.nullable(),
    status: z.string(),
    struck_in: z.array(z.string()),
    sources: z.array(Source).min(1),
  })
  .strict();
export type Infrastructure = z.infer<typeof Infrastructure>;

export const InfiltrationRoute = z
  .object({
    id: slug,
    sector: z.string(),
    description: z.string(),
    /** schematic path, deliberately coarse */
    path: z.array(z.tuple([z.number(), z.number()])).min(2),
    years_active: z.object({ from: z.number().int(), to: z.number().int().nullable() }).strict(),
    sources: z.array(Source).min(1),
  })
  .strict();
export type InfiltrationRoute = z.infer<typeof InfiltrationRoute>;

export const EventsFile = z.array(Event);
export const GroupsFile = z.array(Group);
export const GroupZonesFile = z.array(GroupZone);
export const InfrastructureFile = z.array(Infrastructure);
export const RoutesFile = z.array(InfiltrationRoute);
