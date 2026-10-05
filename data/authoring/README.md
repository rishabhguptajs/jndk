# Authoring data

Events, groups and terror infrastructure are written by hand in YAML here and compiled into
`/data/*.json` by `npm run validate` (`scripts/compile-data.ts`). The build fails on any error.

## Sources (`sources/*.yaml`)

```yaml
source-id:                 # lowercase slug, unique across all files
  url: https://...         # null only for books and print reports
  publisher: The Tribune   # independence is counted by distinct publisher
  title: "Headline as published"
  date: 2024-06-10         # publication date, or null when not known
  pages: "112-115"         # books and long reports
  kind: news               # news | official | database | book | report | court | reference
```

Archive links are added automatically (Wayback lookup URL, unverified) and replaced by a
confirmed snapshot once `scripts/sources/archive-sources.ts` has run.

## Events (`events/*.yaml`)

| Field | Meaning |
|---|---|
| `id` | `YYYY-MM-DD-short-slug` |
| `date`, `end` | ISO date of the event, optional last day |
| `dp` | date precision, inferred from `date` if omitted |
| `at` | gazetteer key (`town:Name`, `district:Name`, `manual:key`). Coordinates come only from `data/gazetteer.json` |
| `geo` | lower the precision below the gazetteer point (for example `tehsil` when only the area is known) |
| `district` | `[district at the time, current district]`, `null` when not known |
| `cat`, `tactic`, `target` | see `src/lib/schema.ts` |
| `perp` | group ids from `groups.yaml` |
| `attr` | claimed, officially_attributed, suspected, state_actor, not_applicable, unknown |
| `killed` | `{ civ, sf, terr, total }`; a number, a range `"3-5"`, or null for unknown |
| `figures` | per-source figures when sources disagree |
| `victims` | only names published in news or official records, each with `src` |
| `conf` | confirmed (2+ independent sources agree), reported (rests on one source), disputed (sources disagree) |
| `hp` | high profile; with 5+ killed this requires 2+ independent sources |
| `summary` | 2 to 5 sentences in our own words. No em dashes |

## Rules enforced by the compiler

- Major events (5+ killed or high profile) need two independent publishers.
- `confirmed` needs two independent publishers.
- Totals must be consistent with the civilian, security force and terrorist parts.
- Every perpetrator must exist in `groups.yaml`.
- No event may claim more location precision than its gazetteer point.
- Same date + same place + same toll is flagged as a duplicate.
