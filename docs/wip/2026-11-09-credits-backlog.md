# Credits backlog, re-derived from the data (2026-11-09, branch tech-debt/0.9.8)

Method: read-only scratch scripts over `static/data/image-provenance.json` (4413 rows) and `static/images/`.
No web lookups were made. The scripts sit in the session scratchpad, not in the repo.

## 1. Placeholder credits now

Gate: `scripts/validate-gallery-credits.ts:29` (`PLACEHOLDER_CEILING = 239`, set by `3235c601329`);
the rule is `isPlaceholder`, lines 35-37; the count loop is lines 48-74; the failure is at line 91.
Definition: a title matching `search result | uncurated panel image | curated panel image`, or the
modification `curated-no-upstream-record`; counted once per gallery slot (a folder under
`static/images/<surface>/<id>/` with 2+ numbered slots; the row is found through webp/jpg/jpeg/png).

Run today: `npx tsx scripts/validate-gallery-credits.ts` printed "2359 images, 0 known without a credit,
239 placeholder credits (ceiling 239)". My own count of the same rule gave 239 too, so the ceiling
is exactly tight (no headroom, nothing to ratchet down yet).

By why (the three classes the rule matches):

| class | slots | what the row has |
|---|---|---|
| A. NASA Images search-page row | 96 | `source_url` = an images.nasa.gov search query, `image_url` null, `nasa_id` null; author "NASA" (85), SpaceX (5), ULA (5), JAXA (1) |
| B. "Uncurated panel image" row | 88 | `source_url` = `https://commons.wikimedia.org/` (the site root), no title of a file; author is an agency/team string, e.g. NASA 56, Roscosmos 17, NASA/KSC 4, JAXA 5 |
| C. Named Commons file, flag only | 55 | real `File:` title, real `source_url`, real author (Daderot, Kevin M. Gill, ...); only the modification `curated-no-upstream-record` (+ `walker-fallback`) makes it count |
| total | 239 | |

By kind (surface):

| kind | A | B | C | total |
|---|---|---|---|---|
| gallery slot: fleet-galleries | 63 | 87 | 10 | 160 |
| gallery slot: missions | 1 | 0 | 45 | 46 |
| gallery slot: planets | 11 | 0 | 0 | 11 |
| gallery slot: earth-objects | 7 | 0 | 0 | 7 |
| gallery slot: small-bodies | 6 | 0 | 0 | 6 |
| gallery slot: iss-modules | 5 | 0 | 0 | 5 |
| gallery slot: satellites | 0 | 1 | 0 | 1 |
| hotspot/site (mars-sites) | 3 | 0 | 0 | 3 |
| card / panel | see below | | | |

Not in the gate's 239 (single-slot or non-gallery folders): 69 more placeholder stems (308 by unique stem, extension and `.1x1` collapsed, minus 239; 343 raw rows). By surface: missions/thumbnails 51, hotspots 6, sun 4, mars-sites 2, planets 1, iss-modules 1, satellites 1, missions 3. The ratchet cannot see them.
"Card" and "panel" are not separate kinds in the data: `missions/thumbnails` is a folder of 51 B
rows by stem (the mission card thumbnails), but they are not in the 239 (one folder, no 2+ slot rule
applies to them in the loop above, so they are in the 308 only). The panel images are the gallery slots.

"No file identified" vs "known but author missing":
- No source file identified: A (96) + B (88) = 184 slots in the gate (about 77 percent).
- Source file known, flag stale: C = 55 slots. Their authors are present. Of those, 14 say only "NASA"
  and 11 more "NASA Johnson Space Center"; one is "Unknown author".
- Source known but author missing: 0 of the 239 (every placeholder row has a non-empty author; in A and B
  the author is only the agency's name).
- The doc's "20 with no identified file" cannot be reproduced: today it is 184 by this rule. I cannot
  tell which narrower definition gave 20 (for example, only slots where a finder run returned no match).

## 2. Agency-only authors

Definition used: for each unique image stem, the author string, with a leading "Credit:", years and the
separators `/ , ; · & + - and` removed, consists only of agency or centre names from this list: NASA, ESA,
JAXA, ISAS, ISRO, Roscosmos, CNSA, CMSA, JPL, JPL-Caltech, Caltech, SpaceX, ULA / United Launch Alliance,
Multi-agency, USGS, KSC, JSC, GSFC, MSFC, ASU, CSA, Arianespace, Blue Origin, Rocket Lab, APL, the long
forms of NASA and ESA, or the author is empty. Placeholder rows are excluded (they are section 1).

| measure | stems |
|---|---|
| unique image stems in provenance | 3345 |
| agency-only by the definition above, all rows | 1579 |
| of which placeholder rows (counted in section 1) | 263 |
| agency-only, not placeholder | 1316 |
| of those: author is exactly the `agency` field | 1146 |
| empty or null author overall | 18 |

The stems by source: wikimedia-commons 906, nasa-images-api 405, direct-agency 5. By surface:
fleet-galleries 613, missions 441, iss-modules 107, earth-objects 46, mars-sites 22, small-bodies 16,
tiangong-modules 15, satellites 14, planets 13, rockets 7, others under 5 each. Top authors: NASA 926 (all rows),
Roscosmos 186, ESA 67, CMSA 55, CNSA 46, SpaceX 45, ISRO 33, NASA/JSC 26, NASA/JPL-Caltech 25.

Caveats. This is an upper bound, not "needs a person": the doc's 100 is not reproducible, and the 1316 is
a candidate pool. Most of it is correct as it stands (a NASA image whose source page says "NASA" or a
Roscosmos press photo has no named person). I did not open any source page, so how many of the 1316 name a
person or an instrument team is unknown. The source key tells how each could be looked up:
`nasa_id` present 409 (NASA Images item JSON), Commons page (`pageid`) 145, URL only 762 (906 minus
those with a pageid are Commons pages looked up by title; the rest are agency pages).

## 3. Tooling per bucket, and what a closing pass needs

| bucket | items | existing tool | free or paid | web lookups needed |
|---|---|---|---|---|
| A. NASA search-page rows | 96 (plus rungs) | `credit-placeholders-find.mjs --surface <a,b> --out <map>` (NASA Images + Commons search, 64-bit dHash, resumable); then `apply-provenance-nasa.mjs <map>` | free (public NASA Images and Commons APIs, no key; no LLM) | about 96 searches grouped by entity (one search per entity folder, not per image); every match with d > 4 looked at side by side |
| B. "Uncurated panel image" rows | 88 | same finder; matches to Commons go through `backfill-provenance-commons.ts`; to an agency's own site through `apply-provenance-agency.mjs`; if no match, `image-find-source.mjs --q "<subject>"` (and `image-match.mjs` for one candidate) | free | about 88, in about 60 entity groups (fleet launch sites are many images per folder). Images with no match at d <= 6 stay placeholders, or go to `drop-gallery-slots.mjs` / `replace-gallery-slots.ts` |
| C. Named file, flag only | 55 | none needed: remove the flag from the row (a one-line field edit in provenance); `gallery-credit-shape-check.mjs` (read-only) first confirms the gallery image has the shape of the Commons file the credit names | free | 0 lookups for the 55 (title, URL, author already there); check the shape with the existing tool before dropping the flag |
| Gate-invisible placeholders (single-slot folders, thumbnails) | about 69 stems (308 - 239) | same finder with `--surface hotspots,satellites,sun,missions` (it reads by surface, not by the gate's 2+ rule; I did not run it to confirm it covers `thumbnails`) | free | up to about 69 |
| Agency-only authors | up to 1316 | no tool today that re-reads the source page for a person; `apply-provenance-nasa.mjs` and `backfill-provenance-commons.ts` write what the item JSON says | free for the NASA API (409) and Commons API (906 pages), no paid call | up to 1315 API reads in bulk, scripted, no per-image browsing; the judgement ("is this a person or an instrument team worth crediting") needs a read of a diff, not a web search. A new read-only script would be needed to list candidates; that is a new tool, ask before building |

Reuse notes: replacement and drop tools (`replace-gallery-slots.ts`, `drop-gallery-slots.mjs`,
`move-image-to-gallery.ts`) already run the pHash dedupe (`compute-phash.ts`, gate
`validate-image-phash-dupes.ts`, d <= 6). `scripts/lib/orphan-images.ts` is for orphan files; it does not
touch credits. After each pass: `npx tsx scripts/validate-gallery-credits.ts` and lower the ceiling to the printed count.

Order that pays most per lookup: C (55, no lookups, ceiling 239 -> 184), then A by entity (96), then B (88).
None of this is paid. A paid step appears only if a picture must be replaced with a generated one, which
nothing here proposes.

## NOT verified in this pass
- No source page was opened; "agency-only" is a string test, not a check against the page.
- The "20 with no identified file" and "100 agency-only" figures of the 2026-11-08 review: not reproduced, definitions unknown.
- Whether `credit-placeholders-find.mjs --surface` reaches single-slot folders and `missions/thumbnails`: not run.
- That the 55 class-C rows' authors are correct: only that they are present.
- Whether C rows' pictures match the Commons file named (`gallery-credit-shape-check.mjs` not run).

## Results of the closing pass (2026-11-09)

Gate line (`npx tsx scripts/validate-gallery-credits.ts`): 239 -> 184 (bucket C) -> 171 (A/B). Ceiling now 171.

- **C (55 + 2 outside the gate):** `gallery-credit-shape-check.mjs` (missions, 454 images, 448 fit; the 6 misfits - change4/08, change4/09, mangalyaan/06, mariner4/05, pioneer-11/01, spirit/07 - are not class C rows) plus `image-match.mjs` on the 10 fleet rows (8 match at d <= 6, apollo-csm-block-ii/04 and phobos-2/04 at d 10-12 but identical size and RMSE 1.2 %). Flag removed from all 57; none mismatched.
- **A/B finder run over all surfaces** (`credit-placeholders-find.mjs`, 249 images, resumable): 9 matches, 240 none. Looked at side by side: 2 Commons matches true (slc-41/05, soyuz-2/04) and applied; jupiter/04, jupiter/05, uranus/02, satellites/oberon/01 rejected (different picture or a labelled variant). `image-find-source.mjs --cat` on 14 launch-site groups: 11 more true, applied (4 NASA, 7 Commons); sriharikota-slp/02 rejected (candidate is a different launch picture).
- **A (search-page rows):** no NASA match applied; the 4 NASA ids applied came from the launch-site groups.
- **Gate-invisible placeholders:** the finder does read single-slot folders (hotspots, sun, satellites, missions). `missions/thumbnails` (51 rows, "Uncurated panel image", credit NASA / PD-NASA) are not photographs: `fetch-assets.ts` draws them (240x120 trajectory diagrams). dHash "matches" there are near-black false hits. They need a "generated by Orrery" credit, which the schema has no source_type for: operator decision, not applied.
- Rover CTX provenance rows (5) say traverse midpoint; generator and `reupsert-tier2-provenance.ts` fixed.

## Second closing pass (2026-11-09, group by group)

Gate line: 171 -> 147 -> 115 -> 96 -> 71. Ceiling now 71. Four commits (ac2258b4bf3, 720361cd74b, 741cb2eda3a, 9a61c5b3ce4); `npm run validate-data` EXIT=0 at each.
Method: `image-find-source.mjs` per group with `--cat` (Commons category) and several `--q` (NASA Images, 3 pages), then every MATCH looked at side by side (candidate fetched at 900 px, both read) before `backfill-provenance-commons.ts` / `apply-provenance-nasa.mjs`. 100 slots sourced in this pass.

Sourced per group (slots): launch sites - jiuquan-slc-43 2, wenchang-lc-101 4, kourou-ela-3 2, kourou-ela-4 1, starbase-orbital-a 3, vandenberg-slc-4e 3, baikonur-31-6 2, plesetsk-43 1, sriharikota 0; vehicles - saturn-v 3, sls-block-1 5, atlas-v 5, orion 1, cargo-dragon-v1 3, titan-ii-glv 3, sokol-kv-2 2, apollo-lm 2, hubble 2, mro 3, spirit 3, mercury-capsule 2, spitzer 2, hope 3, perseverance 1, hayabusa 1, landsat 1; one slot each: exomars-tgo, beagle2, euclid, lrv-apollo, luna24, mars6, molniya, pioneer-10, progress-7k-tg, salyut-3, salyut-5, salyut-6, tiangong-2, venera-7, dart, falcon-heavy, insight, opportunity, phoenix, skylab, soyuz-2, voyager-2; other surfaces - jupiter 3, mars 2, saturn 1, ceres 2, halley 1, 67p 1, makemake 1, earth-objects/hubble 1, iss-modules (beam, columbus, quest, unity, progress_ms) 5, mars-sites/viking2-lander 1, satellites/io 1.

Rejected by eye (same subject, different picture, labelled variant or crop): lc-39a/04, lc-39b/01, akatsuki/02-04 (three Venus images, none the shipped one), orion/04, sls-block-1 (first-pass candidates, then the real KSC-20210917 set matched), jupiter/05, uranus/02 (two candidates, other colour balance), dart/02 (first candidate), plesetsk-43/05, salyut-4/03, eris/02 (candidate carries a legend), sriharikota-slp/02 (aspect mismatch), makemake/03 (first candidate had no arrow; the cropped-legend file matched).

Re-checks of the two earlier d 10-12 matches: apollo-csm-block-ii/04 (Apollo CSM lunar orbit.jpg) and phobos-2/04 (Phobos Marte.jpg) are the same pictures - side by side identical content, rescaled RMSE 1.3 % and 1.0 %, the dHash gap comes from colour and resampling. Both confirmed, rows stay.

### Unsourced: 71 slots left (operator decides drop or replace; nothing dropped or replaced)

No match in the category search or in three NASA Images / Commons query rounds:
akatsuki 01-05; earth-objects/iss 02-05; lc-39a 02-04; lc-39b 01-03; orion 01, 02, 04; apollo-csm-block-i 01, 04; baikonur-1-5 04, 05; kourou-ela-4 04, 05; space-shuttle-orbiter 02, 03; voskhod-11a57 03, 04; planets/uranus 02, 03; earth-objects/chandra 04; earth-objects/tiangong 04; apollo-lm 05; baikonur-31-6 03; cargo-dragon-2 04; crew-dragon-iva 02; hayabusa 01; hayabusa-2 01; jiuquan-slc-43 03; kepler 01; kourou-ela-3 02; landsat 03; lro 05; lunar-orbiter-1 05; lunar-orbiter-4 02; mars-express 01; mars-odyssey 01; maven 02; o3b-mpower 05; parker-solar-probe 01; perseverance 05; plesetsk-41-1 02; plesetsk-43 05; psyche-spacecraft 02; salyut-4 03; saturn-v 03; shenzhou-iva 02; slim 01; sojourner 02; spitzer 03; sriharikota-slp 02; starbase-orbital-a 05; vostok-5 01; voyager-1 01; mars-sites/exomars-rosalind-franklin 03; mars-sites/mars-odyssey 03; missions/spirit 08; planets/jupiter 05; planets/neptune 02; planets/saturn 03; small-bodies/eris 02.
(Paths are `static/images/<surface>/<group>/<NN>`; fleet-galleries unless the surface is named.) Not touched: missions/thumbnails (51, being regenerated) and the gate-invisible single-slot placeholders.
