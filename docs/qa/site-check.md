# Site check (Phase 6)

Run 2026-10-04 against the static build (159 HTML pages).

## Internal links
All internal links and runtime data files resolve.

## External links
- 790 distinct external URLs across 36 hosts. Malformed: 0.
- Live check of the first 40: 7 reachable, 0 returned an error, 33 could not be reached from the build environment (egress policy).
- A full live check, and the Wayback snapshot check, need a network without the egress restrictions: run `tsx scripts/sources/archive-sources.ts`.

Hosts:

- web.archive.org: 310
- github.com: 150
- www.tribuneindia.com: 94
- theprint.in: 61
- www.dailyexcelsior.com: 33
- kashmirlife.net: 26
- www.outlookindia.com: 25
- www.greaterkashmir.com: 23
- organiser.org: 11
- www.pib.gov.in: 7
- www.jammukashmirnow.com: 6
- indiandefencereview.com: 5
- ianslive.in: 4
- www.dailypioneer.com: 4
- outlookindia.com: 3
- main.un.org: 3
- eparlib.sansad.in: 2
- thewire.in: 2
- greaterkashmir.com: 2
- cms.thewire.in: 2
- 2017-2021.state.gov: 2
- www.businessworld.in: 1
- kashmirreader.com: 1
- www.pmindia.gov.in: 1
- peacekeeping.un.org: 1
- kashmirdespatch.com: 1
- fithindi.thequint.com: 1
- en.wikipedia.org: 1
- eparlib.nic.in: 1
- hinduismtoday.com: 1
- openthemagazine.com: 1
- pib.gov.in: 1
- journalsofindia.com: 1
- m.thewire.in: 1
- www.mha.gov.in: 1
- www.state.gov: 1

## Accessibility (axe-core, WCAG 2 A and AA)

- /: no violations
- /chapters/: no violations
- /stats/: no violations
- /groups/: no violations
- /methodology/: no violations
- /sources/: no violations
- /data/: no violations
- /event/2025-04-22-pahalgam-baisaran/: no violations

## Performance (local static server, headless Chromium with software WebGL)

| Page | Transferred (KB) | DOMContentLoaded (ms) | Load (ms) |
|---|---|---|---|
| / | 2303 | 40 | 231 |
| /chapters/ | 1769 | 40 | 183 |
| /stats/ | 795 | 37 | 133 |
| /groups/ | 730 | 47 | 176 |
| /methodology/ | 677 | 45 | 131 |
| /sources/ | 1082 | 135 | 190 |
| /data/ | 657 | 28 | 103 |
| /event/2025-04-22-pahalgam-baisaran/ | 663 | 32 | 115 |

- Atlas map ready (style, data and visible tiles loaded): 2071 ms.
- Total JavaScript in the build: 1769 KB. events.json: 413 KB. India boundary: 198 KB. Terrain tiles: 23371 KB (fetched by range request, only the tiles in view).
