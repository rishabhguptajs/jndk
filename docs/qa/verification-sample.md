# Re-verification sample (Phase 6)

Date: 2026-10-04. Sample: 50 events drawn with a fixed seed (20261004) from `data/events.json`
(`scripts/qa/sample-events.mjs`, run against the pre-correction data at commit ce336c3). Each was re-checked with fresh web searches, without
restricting to the publishers already cited, looking for date, place, toll and attribution.

Direct page fetches were blocked in the build environment, so checks rely on search-engine
summaries of the result pages. That is weaker than reading each article, and is noted as a limit.

## Outcome

| Result | Count |
|---|---|
| Confirmed as recorded | 30 |
| Corrected (date, toll, place, victim, attribution or sources) | 19 |
| Could not be independently re-confirmed | 1 |

## Corrections made

| Event | Finding | Change |
|---|---|---|
| 1989-08-21 Yusuf Halwai | Second publisher (Kashmir Despatch) confirms date and place | Added source; confidence raised to confirmed |
| 1989-09-14 Tika Lal Taploo | Some sources give 13 September 1989 | Note added; 14 September kept (date most sources and the commemoration use) |
| Sheshnag 2001 | Exact date 20 July 2001; 15 injured | Date set to day precision, injuries added, Tribune 22 July 2001 added; id renamed |
| Nunwan 2002 | Injured given as 27 and 28 | Injured stored as a range |
| Kot Charwal 2001 | Date given as 9 February (night of 9 to 10); LeT named | Date and id changed, LeT recorded as suspected, Tribune 11 February 2001 added; confirmed |
| Raghunath temple, 24 Nov 2002 | Next-day reports give 12 and 13 dead with different splits | Total stored as 13 to 14, split removed, marked disputed |
| Tanda, Akhnoor 2003 | Confirmed: a brigadier and seven others killed | Tribune 23 July 2003 added |
| Sunjwan 2003 | Date 28 June 2003; 7 wounded; two attackers | Day precision, injuries and attacker deaths added; id renamed |
| Mohura, Uri 2014 | Reference accounts say six attackers also died | Note added (not yet in a cited news or official source) |
| Amarnath bus 2017 | First reports 7 dead, later 8 | Note and The Wire report added |
| Kokernag 2023 | Some accounts list four security personnel killed, not five | Stored as 4 to 5, marked disputed, The Wire added |
| Dilkhush Kumar 2022 | Name, age 17, brick kiln at Magraypora, injured co-worker | Victim, place and two sources added; confirmed |
| Bhata Durian 2021 | Some reports name the Nar Khas forest | Note added |
| IC 814 1999 | Passenger Rupin Katyal killed | Named victim added with Tribune 26 December 1999 |
| 1990 Pandit exodus | Scholarly estimates of 90,000 to 150,000 for January to March 1990 sit below the stored lower bound | Range widened to 90,000 to 400,000; KPSS and scholarly figures added under figures by source |
| Uri 2016 | Toll rose to 19 | Tribune "toll rises to 19" added; upper figure now sourced |
| Eidgah school 2021 | The Resistance Front claimed the killing | Attribution changed from officially attributed to claimed |
| Kulgam 2026 | Victim named as Deepak, from Chhattisgarh | Named victim and IANS report added |
| Poonch siege 1947 to 1948 | Relief dated 20 or 21 November 1948 | Note added |

## Not re-confirmed

- **1998-07-28 Thakrai and Sarwan massacre** (16 killed). Fresh searches found no independent account.
  It stays marked "reported". It should be checked against the SATP massacres datasheet
  (`satp.org/satporgtp/countries/india/states/jandk/data_sheets/massacres.htm`) once that site is reachable.

## Confirmed without change (30)

1947: displacement figures, Baramulla, Shalateng, Mirpur (18,000 to 20,000 also found
elsewhere), Rajouri recapture, Skardu, Zoji La. Alibeg (one further account gives higher deaths on the
march to the camp; range kept). 1984 Meghdoot. 1989 Ganjoo, Rubaiya Sayeed. 1990 Mirwaiz Farooq.
1995 Al-Faran (Ostro killed 13 August 1995). 2000 Nunwan, Kupwara and Doda killings. 2001 Parliament.
2016 Pampore, Nagrota. 2019 Pulwama, JKLF ban, Article 370. 2020 Ajay Pandita.
2021 Surankote, Wanpoh. 2022 Sunil Kumar Bhat, Puran Krishan Bhat. 2024 Reasi, Doda Desa.
2025 Operation Sindoor.

## How the sample was drawn

```js
// node, from the repository root
const ev = require("./data/events.json"); // as of the start of Phase 6 (149 events)
let s = 20261004; const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
const pool = [...ev]; const out = [];
while (out.length < 50 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
```

Event ids renamed during QA (dates corrected): `2001-07-sheshnag-amarnath` to `2001-07-20-sheshnag-amarnath`,
`2003-06-sunjwan-army-camp` to `2003-06-28-sunjwan-army-camp`, `2001-02-10-kot-charwal` to `2001-02-09-kot-charwal`.
