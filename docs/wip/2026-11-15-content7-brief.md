# Content 7 — Viking 2, IM-1, Chang'e 2, Mars 2, MRO, Mariner 2, Shenzhou 5

**Landed 2026-11-15.** The operator approved every staged candidate ("ship all staged candidates"), the side branch was merged onto `tech-debt/0.9.9` and the images went through `scripts/replace-gallery-slots.ts` (map `scripts/link-fixes/2026-11-15-content7-images.json`: 33 mission and 14 fleet images). Mars 2 already had a four-image gallery with an approved hero (slot 04, 2026-11-09) from its Mars-site entry, and slot 02 of it is the same 1972 stamp: those stay, and the one new picture is slot 05 (the stamp and the Mars 3 model were not added a second time). The artist-concept heroes of MRO and Mariner 2 carry `artistic_impressions` waivers. The text below is the state before the merge.

Written 2026-11-15 on `tech-debt/0.9.9`. Ranks 2, 4, 5, 6, 8, 9, 10 of the operator-approved top-10 (`2026-11-14-slice-H-brief.md` section 6). Web search was exhausted (400/400). Operator ruling 2026-11-15: plain figures (dates, vehicle, altitudes, masses, durations) may come from Wikipedia when no primary page loaded; every such figure has a row in the search backlog (S19 to S23); narrative claims, causes and "firsts" need a primary page or stay out.

The seven missions and three fleet records are authored and held on the side branch `content7-pending` (one commit on top of `5385df9173c`), because `validate-hero-coverage` and the fleet gallery gate fail until each has an approved hero. On the trunk: this brief, the image candidate files, the backlog rows, and the `first_flight` corrections of `mars-2` and `im-1-odysseus` (commit `abf74c5a202`).

## What is on `content7-pending`

| Part | Files |
|---|---|
| Missions | `static/data/missions/mars/{viking2,mars2,mro}.json`, `venus/mariner2.json`, `moon/{change2,im-1}.json`, `earth/shenzhou-5.json`; seven rows in `missions/index.json` (`outcome: "failure"` on `mars2`, as Chandrayaan-2: lander lost, orbiter worked; `crewed` true on `shenzhou-5`) |
| Fleet (new) | `viking-2` (lander), `atlas-agena-b` (launcher), `mariner-2` (orbiter) with index rows; reverse `linked_missions` of viking-2, viking2-lander, proton-k, mars-2, mars2-orbiter, atlas-v, mro, atlas-agena-b, mariner-2, change-2, falcon-9, im-1-odysseus, lc-39a, long-march-2f, shenzhou, jiuquan-slc-43 |
| Text | en-US and 13 hand-written overlays per mission and per fleet record (130 files); the `change` roster row in 14 files |
| Programs | the `viking`, `mariner`, `shenzhou` and `tiangong` roster rows that named Viking 2, Mariner 2 and Shenzhou 5 are mission rows now (keys moved to `mission:<id>` in 13 overlays); `change` gets a Chang'e 2 row |
| Generated | helio waypoints (viking2, mars2, mro, mariner2), trajectory thumbnails and card crops with ladder rows, en-source hashes, corpus-count block, original-work counts, three reviewed term keeps |
| Code | `fly-craft.ts` rows (shenzhou-5, change2, mro, mariner2), `lander-cruise-models.ts` rows (viking2, mars2, im-1), `nation-palette.ts` (Intuitive Machines), test counts (139 missions, Mars 23, Moon 37, Earth 45, inner 9) |

## Decisions that need the operator's eye

1. **Stand-in craft in /fly.** No Nova-C or MRO model exists. IM-1 rides the Beresheet cruise craft (`lander-cruise-models.ts`), MRO the Mars Express shape, Mariner 2 the Mariner 4 shape, Viking 2 the Viking 1 craft, Mars 2 the Mars 3 craft, Chang'e 2 the Chang'e 1 craft. Each row has a comment. The fleet runbook says to reuse builders unless genuinely novel; Nova-C and MRO may deserve their own.
2. **Moon missions have schematic trajectories.** Chang'e 2 and IM-1 are `tier_1_analytic`, no waypoints: the parking orbit, TLI and arrival values were not read, and none were invented. Thumbnails show launch and lunar arrival only. The four Mars and Venus missions use the Lambert generator (dates only); measured radii at the end of each path match the target planet (Viking 2 1.50 AU, Mars 2 1.57, MRO 1.66, Mariner 2 0.73) and the thumbnails were viewed.
3. **Shenzhou 5 has no trajectory** (placeholder thumbnail, as Shenzhou 1): no Earth-orbit descriptor for Shenzhou exists in the registry.
4. **`delta_v` of all seven** is a class estimate (copied from the twin mission, or marked "(estimate)"); `tcm_count` is 0 because no TCM dates were read.
5. **Mars 2 outcome.** `outcome: "failure"` follows the shipped Chandrayaan-2 record; the cause of the crash is left out (Wikipedia: possibly too steep an entry; not primary).
6. **IM-1** is not marked failed. The text says it landed, operated and came to rest tipped over (about 30 degrees), and lost power on 2024-02-29. The cause of the tip-over is left out.
7. **Two source disagreements** are decided in the text and recorded in S23: Viking 2 orbiter end 24 July 1978 (NASA mission page, used) against 25 July (NSSDCA); Mariner 2 closest approach 34,773 km (NSSDCA, used) against 34,854 km (NASA mission page).
8. **Existing text not repeated and not fixed:** `mars-2` fleet entry's "first human-made object on Mars" wording; `im-1-odysseus` entry's laser-rangefinder account (S21, S22).

## Science review

The science-reviewer ran on the en-US text of all seven missions and three fleet records before translation (verdict fix-then-ship: 3 errors, 12 unverified, 9 wording). Applied: Agena built by Lockheed (not Bell Aerospace) and the manufacturer field; the Chang'e 1 comparison removed, the 100 km orbit dated 2010-10-09; the Shenzhou landing date stated in China Standard Time; "362 orbits", "without sending any data" and the Atlas-Agena 36 m height removed; Chang'e 2 resolution reworded to "images with a resolution of up to 1.3 m"; Toutatis distance "reported"; MRO "possible ancient shorelines"; Mariner 2 "first look at Venus" wording, "no discernible magnetic field", and the unqualified "first" in the fleet tagline replaced by NASA's own phrase; Viking 2 distance "between the two landing sites"; "estimate" on the Viking 2 and Mars 2 delta-v; Agena D "first flew in 1963 and succeeded it"; Viking 2 makers split lander and orbiter; "about August 1972" for the Mars 2 orbiter; IM-1 "lost power" wording and the editorial "not a lost lander" cut. Not applied: the Mariner 2 "216 °C to 237 °C" figures stay with the "NASA reports" attribution (NASA page); the reviewer's W3 note.

## Image candidates (nothing promoted)

Staged in `static/images/_staging/{missions,fleet-galleries}/<id>/` (git-ignored); source, licence and credit per image in `docs/wip/content7-image-candidates/<id>.json` (`<id>.fleet.json` for fleet). Contact sheets viewed in the session scratchpad (`content7/<id>-sheet.jpg`).

| Id | Hero candidate | Licence note |
|---|---|---|
| viking2 / viking-2 | 01 Viking 2 lander on Utopia Planitia (colour); fleet hero: technicians inspecting Viking Lander 2 | NASA, public domain |
| mars2 | 01 Soviet stamp art (operator to accept a stamp as hero) | PD-RU-exempt per Commons; 02 is an MRO frame of the lost lander, 03 a Mars 3 model (CC BY-SA, twin) |
| mro | 01 artist concept, front view | NASA, public domain |
| mariner2 / mariner-2 | 01 artist concept in space; 02 Smithsonian engineering model (CC0) | NASA / Smithsonian |
| atlas-agena-b (fleet) | 01 Ranger 3 liftoff on an Atlas-Agena B | NASA, public domain; 04 is from Commons (NASA original not reachable) |
| im-1 | 01 Falcon 9 lifting off from 39A with Nova-C | NASA/Kim Shiflett, public domain; no image of Odysseus on the Moon is staged (not found with a clear licence); 04 is a weak fit |
| change2 | 01 Chang'e 2 mockup in a museum (CC BY-SA 4.0, Shujianyang); 02 Toutatis (CC BY 4.0, a journal figure) | no CNSA image with a stated licence found |
| shenzhou-5 | 01 the return capsule in the National Museum of China (CC BY-SA 4.0) | 05 to 07 are China News Service video frames, CC BY 3.0 per Commons, source licence not re-verified |

## To land the missions

1. The operator approves a hero (and gallery) per mission and per fleet record; run `scripts/replace-gallery-slots.ts` with a map in `scripts/link-fixes/`, then set the `fleet-galleries.json` counts.
2. Merge `content7-pending`; run `node scripts/build-i18n-bundles.mjs`, `npm run validate-data`, the two thumb tests (`entity-thumb`, `programs-roster`) and `npx vitest run scripts/i18n-tools`.
3. Regenerate `route-lastmod` after the merge commit (`npm run route-lastmod`): `route-lastmod`, `sitemap` and `build-route-lastmod` tests fail until then.
4. The side branch moves the `linked_missions` key of the files whose key sat after `flights` (shenzhou); harmless key-order churn.
