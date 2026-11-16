# Slice H brief — Content: Kaguya / SELENE and Chandrayaan-2, and the next candidates (MI5, PG7, FL3 ids)

Read-only brief, written at HEAD `7181924aed9` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, read-only scripts (scratchpad `q5.mjs`, `q6.mjs`, `q7.mjs`, `q9.mjs`, `q13.mjs`, run with node, not in the repo; their output is quoted), and web fetches (Wikipedia, the ISAS Kaguya page, the JAXA policy page, Wikimedia Commons file pages). No code, data or image was changed. The working tree holds other agents' uncommitted edits: not touched. Web search was not available for most of the session (the session's search budget was spent before this brief resumed), so facts come from page fetches; §3 says which source backs each number and §9 lists what is not verified.

## 0. Answer first

1. **Both missions are authored from scratch as missions; the base hardware is half there.** Neither `kaguya` nor `chandrayaan2` exists as a mission, a moon-site or an orbiter fleet entry (`git grep -il 'kaguya\|selene' -- static src` finds only imagery code, the credits grouping and `name-origins.js`). Existing and reusable: launchers `h-iia` (`static/data/fleet/launcher/h-iia.json`) and `lvm3`, launch sites `tanegashima-yoshinobu` and `sriharikota-slp`, lander `vikram-cy2` (status FAILED, 19 gallery files), flagship launch profiles `h-iia.json` and `lvm3.json`. To be authored first, no stubs: **an orbiter fleet entry for Kaguya** and **one for the Chandrayaan-2 orbiter**. Okina and Ouna are a fork (H-3).
2. **Two program rows wait to become links.** `static/data/programs/jaxa-robotic.json:14` ("Kaguya / SELENE", name-only) and `static/data/programs/chandrayaan.json:25-29` ("Chandrayaan-2", name-only). `src/lib/programs-roster.test.ts:82-102` fails if a name-only row equals an existing mission's name, so each row must become a `linked_id` row in the same change, and the matching keys in the programs overlays of 14 locales (`roster` object, `"Kaguya / SELENE"` at `i18n-src/ja/programs/jaxa-robotic.json:96`) move to `mission:<id>`.
3. **The forks that need the operator:** the Chandrayaan-2 outcome (a lander lost, an orbiter still working; H-1), the id `kaguya` against `selene` (H-2), whether the Moon sites list gets the two sites (H-5), and image approval (H-7). Everything else follows the runbooks.
4. **What blocks:** nothing blocks the data. Two things limit it: (a) agency pages for ISRO and the JAXA Kaguya project page returned 404/empty to the fetcher, so the numbers rest on Wikipedia and the ISAS page and are marked as such (§3); (b) no image is chosen until the operator approves staged candidates (`/dev/staging`, per-image approval).
5. **Candidates:** 20 listed in §6, ranked. Top 10: Artemis I, Viking 2, STS-1, IM-1 Odysseus, Chang'e 2, Mars 2, STS-107 and STS-51-L (a pair), MRO, Mariner 2, Shenzhou 5. **Done 2026-11-15 (content 4): Artemis I, STS-1, STS-107, STS-51-L. Done 2026-11-15 (content 7): Viking 2, IM-1 Odysseus, Chang'e 2, Mars 2, MRO, Mariner 2, Shenzhou 5 — the top 10 is complete.**
6. **Cost (§8):** about 70 new files for the two missions (two mission records, two orbiter fleet entries, two or three moon sites, 14-locale overlays for each, images, two thumbnails), edits to two program files and 28 programs-overlay keys. No message keys in `messages/`. Gates: `npm run validate-data`, the i18n vitest suite in `scripts/i18n-tools`, `render-mission-thumbnails`, `programs-roster.test.ts`, once `npm run preflight` before a push.

## 1. Point list (operator text, `docs/wip/2026-11-11-ux-feedback-plan.md`)

| ID | Text | State at HEAD |
|---|---|---|
| MI5 (line 247) | "Add missions: 2007 Kaguya / SELENE, 2019 Chandrayaan-2; review all programs for other good candidates." | Neither exists (§2). |
| PG7 (line 235) | "Space Shuttle has only 3 missions and Ariane 2 — looks odd ... review all programs with 1–3 missions that don't match the story." | `space-shuttle` has 3 (`galileo`, `ulysses`, `magellan`), `ariane` has 5 now (E2 added the Ariane-launched probes), see §5. |
| FL3 ids (line 255, 382) | Crew Dragon missions tab; H supplies ids. | Not this brief's scope beyond the candidate list. |
| Slice row (line 405-408) | "add Kaguya/SELENE and Chandrayaan-2; propose the next candidates ... for the operator to pick." | The two are approved; the list is for the operator to pick. Not implemented here. |

Linked work waiting on H: C5b / O5 (`docs/wip/2026-11-13-slice-C4-C5-brief.md:190-193`, "Kaguya and Chandrayaan-2 are the H additions (LLO/HLO)"; the orbit-regime resident `chandrayaan-2` exists without a mission id at `i18n-src/en-US/orbit-regimes/MOON.json:13`).

## 2. What exists today (file:line)

- **Analogs.** `static/data/missions/moon/chandrayaan1.json` (orbiter, no `fleet_refs`, see §6 item 17), `chandrayaan3.json` (lander, `fleet_refs` lvm3, vikram-cy3, pragyan, sriharikota-slp), `slim.json` (JAXA, `fleet_refs` h-iia, slim), `smart-1.json` (orbiter with flight block), `beresheet.json` (a crash: index `outcome: "failure"`, a moon-site with status `CRASHED`, `descent-profiles/beresheet.json`).
- **Index.** `static/data/missions/index.json` has 126 missions (MOON 32). Entries carry `id, agency, dest, status, year, sector, color, crewed` (+ `outcome`): `{"id":"beresheet",...,"outcome":"failure"}`. Five carry `outcome` today: apollo13, schiaparelli, beresheet, apollo-1, soyuz-1 (`q11.mjs`). Statuses in use: FLOWN 101, ACTIVE 18, PLANNED 5, CANCELLED 2; ACTIVE includes `lro` and `change4`.
- **Programs.** `chandrayaan` (2 mission rows: chandrayaan1, chandrayaan3; Chandrayaan-2 name-only with the note "the orbiter succeeded and still works, but the Vikram lander crashed on final descent"); `jaxa-robotic` (2 mission rows: akatsuki, slim; Kaguya name-only with the note "the largest lunar mission since Apollo ... first high-definition video of Earth rising over the lunar limb"). The English program text already tells both stories (`i18n-src/en-US/programs/chandrayaan.json:16` "a partial heartbreak ... crashed"; `jaxa-robotic.json:16` "Kaguya (2007) returned the largest lunar mission's worth of mapping data since Apollo").
- **Fleet.** `vikram-cy2` exists (category lander, FAILED, first_flight 2019-09-07), its `credit` field begins "Skeleton entry for /fleet (PRD-012 v0.2 / Phase A scaffold)", no specs, `linked_missions: []`; 19 files in `static/images/fleet-galleries/vikram-cy2/`; `pragyan` is the Chandrayaan-3 rover (first_flight 2023-08-23). `h-iia`, `lvm3`, `slim`, `pragyan`, `vikram-cy3` also carry the Skeleton credit (123 of 294 fleet entries do: `q9.mjs`). `tanegashima-yoshinobu` and `sriharikota-slp` are real entries. The fleet runbook (`docs/guides/fleet-addition-runbook.md`): new entries are never stubs; a missing launcher or craft is authored first.
- **Kaguya as imagery source.** 34 provenance entries with `instrument: 'Kaguya TC'` in `static/data/image-provenance.json`, none with a `spacecraft_id` (`q13.mjs`). Built by `buildKaguyaTcProvenanceEntry` (`scripts/hotspots/provenance.ts:174-210`): `source_type direct-agency`, `agency JAXA`, `license_short JAXA-OPEN`, `spacecraft_name 'Kaguya (SELENE)'`, `author 'JAXA / SELENE (Kaguya) Terrain Camera · USGS Astrogeology ARD'`. `provenance.ts:169-172`: "No spacecraft_id is set: there is no kaguya/selene orbiter site to deep-link the credit chip to yet ... Add a Kaguya orbiter site later to light the chip up." The credits page groups them as `jaxa-kaguya-tc` (`src/lib/credits-grouping.ts:274-276`). The regional patches serve the 12 detail-only landers (`AGENTS.md:472`; `scripts/hotspots/fetch-moon-kaguya-regional.ts:20-44`, collection ids `kaguya_terrain_camera_*`). **So:** the Kaguya mission entry should link to the credits section for the Kaguya TC patches, and giving the 34 entries `spacecraft_id: 'kaguya'` lights the chip the code comment asks for (needs the new moon-site orbiter; touches provenance, see H-5).
- **Launch manifest.** `static/data/launches-historic/2000-2009.json:15975-15993` has the Kaguya launch as `2007-09-14-h-iia-2022-selene`, mission_name "SELENE", `orrery_launcher_ref: null`, `orrery_mission_ref: null`, `orrery_launch_site_ref: tanegashima-yoshinobu`. `2010-2019.json:27121-27150`: `2019-07-22-lvm3-chandrayaan-2`, `orrery_launcher_ref: lvm3`, `orrery_mission_ref: null`, `orrery_launch_site_ref: sriharikota-slp`. `scripts/fetch-launches.ts:119-131` matches a mission by year plus the id (letters and digits only, 4 or more characters) as a substring of name plus mission_name: `chandrayaan2` matches "LVM3 | Chandrayaan-2"; `kaguya` does not match "H-IIA 2022 | SELENE" (this is the reason for H-2).
- **Name rules.** `src/lib/name-origins.js:210` has `ja: Kaguya: 'かぐや'` and `:213` `Tanegashima: '種子島'`; `:227-231` `hi: Chandrayaan, Vikram, Pragyan`, so "Chandrayaan-2" becomes `चंद्रयान-2` in `hi` by `nativeName` (serial kept as written, `:368`). The hi overlay already reads `विक्रम (चंद्रयान-2)` and `चंद्रयान-3` (`i18n-src/hi/missions/moon/chandrayaan3.json`, `i18n-src/hi/fleet/lander/vikram-cy2.json`); the ja, ru, zh-CN, ko and ar overlays keep `Chandrayaan-3`, `Vikram (Chandrayaan-2)` in Latin (origin rule). `scripts/i18n-tools/native-terms.json`: `agency/ISRO` has hi `इसरो`; there is no `JAXA` key; `place/Tanegashima` and `feature/Shioli Crater` exist in 13 locales; `facility/Satish Dhawan Space Centre` exists. The strings `Kaguya`, `かぐや`, `Okina`, `Ouna`, `Gill` are not in the file.

## 3. Facts table

Sources: **W-SEL** = en.wikipedia.org/wiki/SELENE (fetched); **ISAS** = isas.jaxa.jp/en/missions/spacecraft/past/kaguya.html (fetched); **W-CY2** = en.wikipedia.org/wiki/Chandrayaan-2 (fetched twice); **W-VIK** = en.wikipedia.org/wiki/Vikram_lander (fetched); **ESA** = Commons file page for ESA200870 (fetched). Agency pages for ISRO (`isro.gov.in/Chandrayaan2.html`: gallery shell only), the JAXA Kaguya project page and NASA's NSSDCA catalogue (error page) did not give data. Dates are UTC unless marked.

### 3.1 Kaguya / SELENE

| Fact | Value | Source | State |
|---|---|---|---|
| Names | SELENE = "Selenological and Engineering Explorer"; nickname Kaguya from the lunar princess of *The Tale of the Bamboo Cutter*; subsatellites Okina and Ouna from the same tale | W-SEL | Wikipedia only |
| Launch | 2007-09-14 01:31:01 UTC, H-IIA 2022 (F13), Tanegashima | W-SEL; ISAS (date, H-IIA); manifest `2000-2009.json:15977` net 01:31:01Z | agrees in three places |
| Mass | Total 3,020 kg: main orbiter 2,914 kg, Okina 53 kg, Ouna 53 kg | W-SEL | ISAS says "3t" main orbiter and 50 kg each: rounded, not a conflict |
| Lunar orbit insertion | 2007-10-03, 101 x 11,741 km polar orbit | W-SEL | Wikipedia only; ESA/JAXA date UNVERIFIED |
| Okina (Rstar, relay) | released 2007-10-09 into 100 x 2,400 km; impacted the far side near Mineur D on 2009-02-12 10:46 UTC (19:46 JST) | W-SEL | Wikipedia only. ISAS lists Rstar orbit as 100 x 800 km: conflict between pages (recorded in §9) |
| Ouna (Vstar, VRAD) | released 2007-10-12 into 100 x 800 km | W-SEL | end date UNVERIFIED |
| Main science orbit | circular 100 km, 2007-10-19 | W-SEL | Wikipedia only |
| Lowered orbit | 2009-02-01 to 50 km (± 20 km) | W-SEL | Wikipedia only |
| End of mission | controlled impact 2009-06-10 18:25 UTC (20:25 CEST), 65.5 S, 80.4 E, near Gill crater | W-SEL (65°30'S 80°24'E, 18:25 UTC); ESA (20:25 CEST at 80.4 E, 65.5 S) | two sources agree; ISAS gives the date as 11 June (JST) |
| Instruments | 13 (W-SEL: "13 instruments plus HDTV cameras"); ISAS lists 15 (counts the VRAD, relay four-way Doppler and HDTV as items) | W-SEL; ISAS | **conflict**: the count that goes in text must be chosen (H-6); until chosen the overlay says "a suite of science instruments" with no number, or names the 13 |
| Cost, Earth-orbit-raising dates, TCM count | not found | | UNVERIFIED |

### 3.2 Chandrayaan-2

| Fact | Value | Source | State |
|---|---|---|---|
| Launch | 2019-07-22 09:13:12 UTC (14:43:12 IST), GSLV Mk III M1 (LVM3-M1), Satish Dhawan Space Centre | W-CY2; manifest `2010-2019.json:27123` net 09:13Z | two sources agree |
| Masses (wet) | combined 3,850 kg; orbiter 2,379 kg; Vikram 1,471 kg (626 kg dry); Pragyan 27 kg | W-CY2 | Wikipedia only. The Chandrayaan-3 record says 3,900 kg and 1,726 kg for CY3: no conflict |
| Orbiter instruments | 8: CLASS, XSM, DFSAR, IIRS, ChACE-2, TMC-2, RAMBHA-DFRS, OHRC | W-CY2 | Wikipedia only |
| Earth orbit raising | first orbit 45,475 x 169 km; apogee burns 24 Jul, 25 Jul, 29 Jul, 2 Aug, 6 Aug; final Earth orbit 142,975 x 276 km | W-CY2 | the two fetches differ (first says five apogee burns, second "five apogee-raising burns and one perigee-raising"); 5 or 6 burns UNVERIFIED |
| Trans-lunar injection | 2019-08-13 20:51 UTC | W-CY2 | second fetch gives the time; first gives the date |
| Lunar orbit insertion | 2019-08-20 03:32 UTC, 18,072 x 114 km | W-CY2 | Wikipedia only |
| Circular orbit | about 127 x 119 km after four lowering burns, reached 1 September | W-CY2 | Wikipedia only |
| Vikram separation | 2019-09-02 07:45 UTC | W-CY2 | Wikipedia only |
| Landing attempt | powered descent 2019-09-06 20:08 UTC; signal lost at about 2.1 km altitude; 58 m/s vertical speed at 330 m | W-CY2 | Wikipedia only; ISRO statements UNVERIFIED |
| Cause | Failure Analysis Committee: software; higher-than-nominal thrust of the five braking engines, a 10 deg/s attitude-change limit, small landing area | W-CY2, W-VIK | official report not public (W-VIK) |
| Wreckage | found in NASA LRO imagery with help of Shanmuga Subramanian (Chennai); 70.8810 S, 22.7840 E (70°52'52"S 22°47'02"E), about 600 m from the target near Manzinus C and Simpelius N; LRO flights 17 Sep and 14 Oct 2019 did not find it; the find was announced in November/December 2019 | W-CY2, W-VIK | Wikipedia only; NASA release URL UNVERIFIED (two NASA URLs returned 404) |
| Orbiter status | operating; planned 1 year, now "about 7.5 years" | W-CY2 | Wikipedia only; ISRO statement UNVERIFIED |
| Pragyan | 27 kg, 50 W, never left Vikram | W-CY2 | |

### 3.3 Existing repo values to stay consistent with

- Chandrayaan-3 text says "India became the fourth nation to soft-land on the Moon" and the overlay for `chandrayaan3` says it followed "the loss of Chandrayaan-2's Vikram lander in 2019" (`i18n-src/en-US/missions/moon/chandrayaan3.json:7`); its flight event text says CY3 targeted "a south-polar landing site where Chandrayaan-2's Vikram had crashed" (`chandrayaan3.json` events, launch event). The CY2 record must not contradict "crashed" and the 6 Sep 2019 date.
- SLIM's record gives its launch as 2023-09-06 from Tanegashima on H-IIA 202 with `fleet_refs` h-iia only; the Kaguya record should add `tanegashima-yoshinobu` as `launch-site` (the pad is Yoshinobu LP-1 per the manifest `pad_name: "Y"`).

## 4. The two missions, touchpoint by touchpoint (`docs/guides/mission-addition-runbook.md`)

Legend: state is one of EXISTS, TO AUTHOR, FORK, BLOCKED.

### 4.1 Kaguya / SELENE (proposed id `kaguya`, dest MOON, agency JAXA, color `#003087` as SLIM)

| # | Touchpoint | State and plan |
|---|---|---|
| 1 | Base record `static/data/missions/moon/kaguya.json` | TO AUTHOR from `smart-1.json` / `chandrayaan1.json`: `year 2007`, `status FLOWN`, `departure_date 2007-09-14`, `arrival_date 2007-10-03`, `transit_days 19`, `vehicle "H-IIA 2022"`, `payload "3,020 kg launch mass; main orbiter 2,914 kg; two 53 kg subsatellites"`, `delta_v` from the sources (not found: UNVERIFIED, so the field needs a sourced figure or the schema-required string with an honest approximation, see §9), `data_quality`, `credit "© JAXA ..."`. |
| 2 | Index entry | TO AUTHOR: `{"id":"kaguya","agency":"JAXA","dest":"MOON","status":"FLOWN","year":2007,"sector":"gov","color":"#003087","crewed":false}`. No `outcome` (controlled end of a completed mission). |
| 3 | en-US overlay `i18n-src/en-US/missions/moon/kaguya.json` | TO AUTHOR: `name "Kaguya (SELENE)"`, `type "ORBITER · SUBSATELLITES · FLOWN"`, `first`, `description`, `events` (launch, LOI, Okina, Ouna, 100 km orbit, 50 km orbit, Okina impact, controlled impact). Shape copied from `slim.json` overlay. |
| 4 | Links (agency-first) | TO AUTHOR, at least: JAXA (`global.jaxa.jp` Kaguya page: the fetched URL `global.jaxa.jp/projects/sat/kaguya/` returned 404, so the exact URL needs a repo link-check), ISAS (`https://www.isas.jaxa.jp/en/missions/spacecraft/past/kaguya.html`, fetched and answering), Wikipedia (`https://en.wikipedia.org/wiki/SELENE`), `ja.wikipedia.org` (native-language, `t: core`, as SLIM does). `npm run check-learn-links -- --update` (ADR-051). |
| 5 | `fleet_refs` | `h-iia` (launcher, EXISTS), `tanegashima-yoshinobu` (launch-site, EXISTS), `kaguya` (spacecraft, **TO AUTHOR FIRST**). Okina and Ouna: FORK H-3. Then `npx tsx scripts/migrate-fleet-linked-missions.ts`. |
| 6 | Program | `jaxa-robotic`: replace the name-only row (`programs/jaxa-robotic.json:14`) by `{"linked_id":"kaguya","ref":"mission","year":2007,"note":...}` (keep the note) and add the orbiter as a `fleet` row; rename the roster key in 14 programs overlays (`"Kaguya / SELENE"` to `mission:kaguya`; the en-US and ja keys are visible at `i18n-src/ja/programs/jaxa-robotic.json:96-99`); `hero` stays `fleet/slim/01`. There is a JAXA program (`jaxa-robotic`), so no new program file. `see_also` text "Moon — SLIM's landing site" stays. |
| 7 | Moon site | FORK H-5: an orbiter marker `moon-sites.json` entry modelled on `chandrayaan1` (`marker orbiter`, `kind orbiter`, `altitude_km 100`, `inclination_deg 90`, `eccentricity 0`, `status ENDED`, `mission_id`, `fleet_refs`) plus `i18n-src/*/moon-sites/kaguya.json` in 14 locales (4 fields: name, mission_type, site_name, fact, capability). The controlled impact at 65.5 S 80.4 E is a second option: a surface marker with a `CRASHED`-style status like Beresheet. Recommendation in H-5. |
| 8 | Flight block and waypoints | TO AUTHOR: `flight.launch` (`vehicle_stage "H-IIA 2nd stage"`, `mass_at_tli_kg` = 3,020 unless a sourced TLI mass exists: UNVERIFIED), `cruise.tcm_count` equal to the number of `tcm` events (0 unless dated TCMs are found; the repo precedent in `chandrayaan1.json` is "none listed" when undated), `arrival` (LOI 2007-10-03, orbit 100 km polar), `events` (launch MET 0, LOI MET about 19.0, Okina release about 25, Ouna release about 28, 100 km orbit about 35, 50 km orbit about 506, Okina impact about 517, impact about 635.7; the MET values are my arithmetic from the dated sources, not sourced numbers), `cislunar_profile` with `lunar_arrival {type orbit, altitude_km 100, inclination_deg 90, periselene_km 100}` and `return {type none}`. Then `npx tsx scripts/cislunar/generate-hybrid-waypoints.ts static/data/missions/moon/kaguya.json`. The mission is 635 days from launch to impact; `transit_days` stays the 19-day transfer, as `smart-1` records its long spiral by event METs. `flight_data_quality: sparse`, `source_tier: tier_1_5_hybrid`. A descent profile does not apply (no landing). Fly camera audit entry: not needed unless the default framing is poor. |
| 9 | Trajectory thumbnail | TO RENDER: `npx tsx scripts/render-mission-thumbnails.ts`, then `node scripts/build-original-work.mjs` (runbook; skill `orrery-mission-thumbnails`). |
| 10 | Hero and gallery | BLOCKED on approval, see §7. |
| 11 | 14-locale overlays | TO AUTHOR by hand, glossary first, see §5. |

### 4.2 Chandrayaan-2 (proposed id `chandrayaan2`, dest MOON, agency ISRO, color `#FF9933`)

| # | Touchpoint | State and plan |
|---|---|---|
| 1 | Base record `static/data/missions/moon/chandrayaan2.json` | TO AUTHOR from `chandrayaan3.json`: `year 2019`, `departure_date 2019-07-22`, `vehicle "LVM3 M1 (formerly GSLV Mk III)"`, `payload "3,850 kg launch mass; 2,379 kg orbiter; 1,471 kg Vikram lander; 27 kg Pragyan rover"`, `arrival_date` and `transit_days`: FORK H-1b (orbit insertion 2019-08-20 = 29 days, or the landing attempt 2019-09-06 = 46 days; Chandrayaan-3 uses the landing date, 40 days; Beresheet uses its landing date, 48 days). `status` FORK H-1a. |
| 2 | Index entry | TO AUTHOR; `outcome` per H-1a. |
| 3 | en-US overlay | TO AUTHOR: `type "ORBITER · LANDER LOST · ..."`, `first "India's first mission to attempt a soft landing"` (the claim needs the operator's reading; see §9), events from §3.2. |
| 4 | Links | TO AUTHOR: ISRO (`https://www.isro.gov.in/Chandrayaan2.html` exists as a link target in `vikram-cy2.json`; the page answered as a gallery shell with no mission data), Wikipedia, a Hindi Wikipedia row as `chandrayaan3.json` has, the failure analysis release already linked from `vikram-cy2.json` (`https://www.isro.gov.in/Press%20Release5.html`, not fetched: UNVERIFIED). |
| 5 | `fleet_refs` | `lvm3` (launcher, EXISTS), `sriharikota-slp` (launch-site, EXISTS), `vikram-cy2` (spacecraft or payload, EXISTS but Skeleton-credit: enrich), `chandrayaan2` orbiter (spacecraft, **TO AUTHOR FIRST**). `pragyan`: the existing entry is the Chandrayaan-3 rover (`first_flight 2023-08-23`, "First lunar south-pole rover; Chandrayaan-3"); the CY2 rover shares the name and never rolled out. Do not link `pragyan` to `chandrayaan2` (it would put two flights on one rover entry); name the rover in the text only. Run the migrate script. Roles allowed by the schema: launcher, spacecraft, payload, station, launch-site (`mission.schema.json` `fleet_refs`). |
| 6 | Program | `chandrayaan`: replace the name-only row (`programs/chandrayaan.json:25-29`) by a linked mission row (keep year 2019 and the note), add the orbiter fleet row; rename the roster key in 14 programs overlays. Existing program text already tells the story. |
| 7 | Surface site | FORK H-5: the Vikram impact point (70.881 S, 22.784 E per W-CY2/W-VIK) as a `moon-sites.json` surface entry with `status CRASHED`, as Beresheet (`moon-sites.json:1179`, 32.5956 N 19.3496 E, `region_kind landing_ellipse`) - needs `landing_date 2019-09-06`, `region_bounds`, and hotspot imagery under `static/images/hotspots/moon/chandrayaan2/` (Beresheet has `context*`, `tier2-lroc*`, `tier2-regional*`). The 14-locale `moon-sites` overlays too. Also the orbiter as an orbiter-kind marker (like `chandrayaan1`) is optional. |
| 8 | Flight block and waypoints | TO AUTHOR from §3.2: events launch 0, Earth-orbit-raising burns (5 dated), TLI about 22.5, LOI about 28.8, separation about 42.9, descent start about 47.4 (my arithmetic), `edl_system powered`, `touchdown_velocity_ms` not meaningful for a crash (Beresheet records its impact speed, 152.68; for CY2 only the 58 m/s at 330 m is sourced, so `touchdown_velocity_ms` is UNVERIFIED), `cislunar_profile.lunar_arrival {type orbit_and_land}` as `chandrayaan3.json` has, `orbit_raising` and `lunar_orbits` arrays from §3.2 (the CY3 file uses both). `cruise.tcm_count` equals the `tcm` events. Then run `generate-hybrid-waypoints.ts`. A `descent-profiles/chandrayaan2.json` (flagship tier, `LUNAR_POWERED`, as beresheet and chandrayaan3 have): optional, H-8. |
| 9 | Thumbnail | As 4.1. |
| 10 | Hero and gallery | BLOCKED on approval. Candidates in §7. |
| 11 | 14-locale overlays | §5. |

## 5. Translations and the glossary

Rule (`src/lib/name-origins.js:1-5`, memory "Names: origin-language rule", "Names: glossary first"): the origin locale writes the native form, every other locale keeps the English form. All names go into the glossary before any text is written, then a drift check after.

| Name | Origin locale | Native form | Already in the repo? |
|---|---|---|---|
| Kaguya | ja | かぐや | YES `name-origins.js:210` |
| SELENE | ja | written Latin next to かぐや (as the existing ja row writes "かぐや / SELENE", `i18n-src/ja/programs/jaxa-robotic.json:98`) | YES (row) |
| Okina, Ouna (if H-3 keeps them) | ja | おきな, おうな (from my knowledge of the tale's characters, NOT fetched) | NO. UNVERIFIED: must be checked on ja.wikipedia before entry |
| Chandrayaan-2 | hi | चंद्रयान-2 (derived by `nativeName`) | YES (`Chandrayaan` base, `:227`) |
| Vikram, Pragyan | hi | विक्रम, प्रज्ञान | YES (`:230-231`) |
| ISRO | hi | इसरो | YES (`native-terms.json` `agency/ISRO`) |
| JAXA | ja | JAXA is written in Latin in Japanese text; the full name 宇宙航空研究開発機構 | NO `JAXA` key. UNVERIFIED which form the ja overlays use; check `i18n-src/ja/missions/moon/slim.json` |
| Tanegashima | ru, ja, zh-CN, ko, hi, ar, sr-Cyrl, de, fr, es, it, nl, pt-BR | all present | YES (`place/Tanegashima`) |
| Sriharikota, Satish Dhawan Space Centre | 13 locales | all present | YES |
| Gill (crater), Mineur D, Manzinus C, Simpelius N | 13 locales | not found in `native-terms.json` (`q12.mjs`) | NO. Needed only if the text names them; the glossary rule says "unsure, search native pages" |
| Tiranga Point (the name given to the Vikram crash site in W-CY2) | hi | तिरंगा (not fetched) | NO. UNVERIFIED name status (informal vs IAU); recommend leaving it out of the text |
| Shackleton | 13 | present | YES |

Terms with no glossary entry (`i18n-src/en-US/glossary/terms.json` has none of "Earthrise", "sub-satellite", "relay", "impactor", "lunar orbit insertion", "hard landing", "crash": `q12.mjs`): the wording "Earthrise" and "relay satellite" would be new technical terms. The skill `term-consistency` governs adding them; recommendation: write "Earth rising over the Moon's limb" in prose (no glossary term) and "relay satellite" as ordinary language, and add nothing.

**Numbers that must read identically in all 14 locales** (memory "Numbers in all locales"): Kaguya: 2007-09-14, 2,914 kg, 53 kg, 100 km, 50 km, 2009-06-10, 65.5 S 80.4 E, 2007-10-03, the instrument count (H-6); Chandrayaan-2: 2019-07-22, 3,850 kg, 2,379 kg, 1,471 kg, 27 kg, 2019-08-20, 2019-09-02, 2019-09-06, 2.1 km, 70.881 S 22.784 E, 8 instruments. Check: validate that each number appears in every locale's overlay, show the per-locale check.

Method: by hand in-session, per the memory "Translation rounds inline" (no paid run: memory "No paid translation runs"; `translate-i18n-gaps.mjs` calls a paid API and the runbook line "Claude API, ADR-033" must not be used here). Files: 2 missions x 13 other locales + en-US = 28 overlays; 2 orbiter fleet entries x 14 = 28; 2-3 moon sites x 14 = 28-42; programs overlays 2 rows x 14 = 28 keys in 28 files (in-place edits); `vikram-cy2` overlay if enriched.

## 6. Candidates for the operator to pick (ranked; not to be implemented now)

Scan (`q5.mjs`, `q6.mjs`, `q7.mjs`): 126 missions; programs with 0-3 mission rows; fleet craft (orbiter, lander, rover, observatory, crewed, cargo) with no mission `fleet_refs` and no same-id mission: 66; Mars sites with no mission: 14 (mars2, mars6, viking1-lander, viking2-lander, beagle2, zhurong, exomars-rosalind-franklin, mars3-orbiter, viking1-orbiter, mars-odyssey, mro, tgo, tianwen1-orbiter, hope: several are sites of missions that exist under another id, so the list is a lead, not a count); Moon sites with no mission: `change7` (PLANNED) and `change2`. Programs by mission rows: 0 (buran, commercial-stations, esa-human, gaganyaan, great-observatories, iss, jwst, kuiper, mir, ros, starlink), 1 (esa-science, galileo, mangalyaan, new-horizons, salyut, shenzhou, sputnik, tiangong, viking), 2 (cassini, chandrayaan, hayabusa, jaxa-robotic, pioneer, spacex, starship, voskhod, voyager), 3 (mariner, skylab, soyuz, space-shuttle). A one-mission program is not a defect when the program is one mission (Mangalyaan, New Horizons, Galileo, Viking before this list).

Size: S = data only, fleet exists; M = new mission + hero/gallery + 14 locales, fleet exists; L = new fleet records too.

| Rank | Candidate (proposed id) | Why | Needs | Size |
|---|---|---|---|---|
| 1 | Artemis I (`artemis1`, 2022, MOON) | Named-only in `artemis` (4 missions: 2, 3, 4, 5); the flown test flight is the most visited gap; NASA images are public domain | fleet exists (`sls-block-1`, `orion`, `lc-39b`); descent/entry profile optional; flight block | M |
| 2 | Viking 2 (`viking2`, 1975, MARS) | `viking` has 1 mission row, Viking 2 is named-only (`programs/viking.json`); `viking2-lander` and `viking1-orbiter` have no mission ref; `mars-sites.json` holds `viking2-lander` | fleet exists; images NASA PD | S-M |
| 3 | STS-1 (`sts-1`, 1981, EARTH) | PG7 text: Shuttle has 3 mission rows, all deployments; STS-1 is named-only; `columbia`, `space-shuttle-stack`, `lc-39a` exist | fleet exists; NASA PD images; launch profile `space-shuttle-stack` exists | M |
| 4 | IM-1 Odysseus (`im-1`, 2024, MOON) | fleet `im-1-odysseus` exists with no mission; first US Moon landing since Apollo; tipped over like SLIM | fleet exists; moon-site; images (Intuitive Machines license: check, a commercial agency like SpaceIL) | M |
| 5 | Chang'e 2 (`change2`, 2010, MOON) | `moon-sites.json` has site `change2` and fleet `change-2` exists but no mission (the only Moon site besides `change7` with none); `change` program has 5 missions listed without it | fleet + site exist; images CNSA (restricted: honest gap, see IMAGE-PIPELINE CNSA row) | M |
| 6 | Mars 2 (`mars2`, 1971, MARS) | first human object on Mars (crashed); `mars-2` lander + `mars2-orbiter` fleet exist, `mars-sites` has `mars2`; pairs with the existing `mars3` | fleet exists; Roscosmos images (PD-Russia pre-1973) | M |
| 7 | STS-107 and STS-51-L (`sts-107`, `sts-51l`) as a pair, `outcome: failure` | named-only in the Shuttle program; `columbia`, `challenger` fleet exist; sensitive text needs care | fleet exists; descriptions reviewed by the science reviewer | M each |
| 8 | Mars Reconnaissance Orbiter (`mro`, 2005, MARS) | fleet `mro` exists, no mission; the site's HiRISE imagery (credits, hotspots) all comes from it | fleet exists; flight block | M |
| 9 | Mariner 2 (`mariner2`, 1962, VENUS) | named-only in `mariner` (3 missions); first successful planetary flyby; also asked for in C5 (`docs/wip/2026-11-13-slice-C4-C5-brief.md:259`) | **new fleet record** `mariner-2`; NASA PD images | L |
| 10 | Shenzhou 5 (`shenzhou-5`, 2003, EARTH) | `shenzhou` and `tiangong` have 1 mission each (shenzhou-1); first Chinese crewed flight, named-only in both | fleet `shenzhou`, `long-march-2f`, `jiuquan-slc-43` exist (CMSA images: check) | M |
| 11 | Hakuto-R M1 (`hakuto-r-m1`, 2023, MOON) | fleet `hakuto-r` exists, FAILED; JAXA-adjacent crash with `outcome: failure` | fleet exists; ispace imagery license unverified | M |
| 12 | Venera 7 (`venera-7`, 1970, VENUS) | fleet exists, no mission; first landing on another planet; `venera-13` exists as mission | fleet exists; PD-Russia | M |
| 13 | Surveyor 3 (`surveyor-3`, 1967, MOON) | fleet exists; Apollo 12 visited it; `apollo` program names Surveyor name-only | fleet exists; NASA PD | M |
| 14 | Sputnik 2 (`sputnik2`, 1957, EARTH) | `sputnik` program has 1 mission; Laika, named-only | **new fleet** (spacecraft); `r-7-vostok` launcher exists | L |
| 15 | Beagle 2 (`beagle2`, 2003, MARS) | fleet + `mars-sites` entry exist, status LOST; part of the Mars Express story | fleet exists; images UKSA/ESA | M |
| 16 | Hitomi / ASTRO-H (`hitomi`, 2016) | JAXA's other gap beside Kaguya; fleet exists, FAILED | scope question: are observatories missions in this catalogue? dest value unknown (H-9) | M |
| 17 | Chandrayaan-1 `fleet_refs` repair | `missions/moon/chandrayaan1.json` has no `fleet_refs`; fleet `chandrayaan1` has `linked_missions: []` (`q9.mjs`); launcher `pslv-xl` and `sriharikota-slp` exist | data only, migrate script | S |
| 18 | Mars Odyssey (`mars-odyssey`, 2001) and ExoMars TGO (`tgo`, 2016) | fleet exists, residents of the Mars ruler without a mission page | fleet exists | M each |
| 19 | Luna 2 / Luna 3 (1959) | `soviet-lunar` names Zond 5 but not these; Luna 2 first impact, Luna 3 first far-side images; not in the missions index | **new fleet records**; PD-Russia | L each |
| 20 | Lunar Orbiter 1-5 | five fleet entries with no mission; `apollo` program names "Lunar Orbiter" name-only | fleet exists; one mission record per flight or one for the series (decision) | L as a set |

Ruled out as not defects: Mangalyaan, New Horizons, Galileo (single-mission programs by design); Cassini (2 rows plus milestones, UXD-033); stations programs with 0 mission rows (ISS, Mir, Tiangong, ROS, Commercial stations) are about stations, which are fleet entries, not flights.

## 7. Images (agency-first, to `_staging` only)

Rule: `scripts/IMAGE-PIPELINE.md` (agency archives first, Commons last; native-language sourcing for JAXA means `ja.wikipedia.org` first, AGENTS.md line 443); per-image approval at `/dev/staging`; nothing ships and no WebP/masters/provenance step runs before approval. `validate-hero-coverage` fails without `static/images/missions/<id>/01.webp`, so a mission cannot merge without an approved hero.

Candidates found (none downloaded; no file was written):

| Mission | Candidate | Source and licence found | Fit |
|---|---|---|---|
| Kaguya | Launch photo "H-IIA F13 launching KAGUYA.jpg" (1,280 x 960) | Commons; author Naritama (NARITA Masahiro); GFDL 1.2+, CC BY-SA 3.0, CC BY 2.1 JP (fetched). Share-alike applies; Orrery is non-commercial and records ShareAlike in provenance (memory "Orrery is non-commercial") | hero candidate; `CC-BY-SA-3.0` is a license short already in provenance (`q13.mjs` license list) |
| Kaguya | "Kaguya impact site ESA200870.jpg" (SMART-1 view of the 2009 impact site, 80.4 E 65.5 S) | Commons/ESA; CC BY-SA 3.0 IGO (fetched) | gallery; whether `CC-BY-SA-3.0-IGO` is in `scripts/license-allowlist.ts` is UNVERIFIED |
| Kaguya | JAXA/NHK HDTV Earthrise frames | JAXA policy (`global.jaxa.jp/policy.html`, fetched): non-commercial reuse (press, research, education, personal) with attribution ("Provided by JAXA" or "JAXA"), **no modification except the source line**, commercial use prohibited. The repo's allowlist entry `JAXA-OPEN` (`scripts/license-allowlist.ts:254-260`) rests on this policy. The Earthrise file itself and its URL were not found: UNVERIFIED | the image the program text promises; needs a JAXA page URL |
| Kaguya | Kaguya TC regional patches already in the repo | 34 `Kaguya TC` provenance entries, JAXA-OPEN | already credited; see §2 |
| Chandrayaan-2 | "GSLV Mk III M1, Chandrayaan-2 - Vikram lander mounted on top of orbiter.jpg" (4,912 x 7,360) and "... Orbiter at SDSC SHAR.jpg" | Commons; author ISRO; source `isro.gov.in/chandrayaan2-gallery`; GODL-India (fetched for the first file); `GODL-India` is in `scripts/license-allowlist.ts:135` | hero candidates |
| Chandrayaan-2 | LRO image of the Vikram crash site (NASA, 2019) | URLs tried (`nasa.gov/image-article/...`, `science.nasa.gov/...`) returned 404; the LROC site (`lroc.im-ldi.com`) is copyrighted with educational use allowed when cited "NASA/GSFC/Arizona State University" (`LROC-EDU` in `license-allowlist.ts:243-252`) - this applies to images on the LROC website, not to PDS products. Exact image and URL UNVERIFIED | gallery; essential to the crash story |
| Chandrayaan-2 | the 19 files in `static/images/fleet-galleries/vikram-cy2/` and the Pragyan CY2 frames in `fleet-image-sources.json` (lines 6216-6220, Commons ISRO files) | already provenanced | a mission gallery slot may reuse a fleet image only with an entry in `static/data/cross-mission-share-ok.json` (file `_about` states it whitelists shared image URLs) |

## 8. Cost

- **Files, Kaguya:** mission base 1, index 1 line, overlays 14; fleet orbiter base 1, index 1 entry, overlays 14; moon site (if H-5 yes) 1 + 14 overlays; thumbnail 1; images (hero + 3-5 gallery, each with WebP ladder, 1x1, masters in LFS, provenance row, counts); program file 1 + 14 overlay keys.
- **Files, Chandrayaan-2:** the same, plus enrichment of `vikram-cy2` (credit, specs, overlay in 14 locales) and, with H-5, a crash-site moon-site with hotspot images.
- **New fleet records:** 2 required (Kaguya orbiter, Chandrayaan-2 orbiter); 0-2 more (Okina, Ouna).
- **Message keys (`messages/`):** 0. The text lives in overlays.
- **Tests:** `src/lib/programs-roster.test.ts` (must stay green after the two rows change), the i18n suite (`scripts/i18n-tools`), plus the validate-data schema and symmetry checks. No new unit test needed; a data-only change.
- **Gates:** `npm run validate-data` (checklist; hero coverage, overlay completeness, fleet symmetry, links); `npx tsx scripts/migrate-fleet-linked-missions.ts`; `npx tsx scripts/cislunar/generate-hybrid-waypoints.ts` x2; `npx tsx scripts/render-mission-thumbnails.ts` then `node scripts/build-original-work.mjs`; `npm run check-learn-links -- --update`; `npm run i18n:compile`; `npm run preflight` once before a push (not per change, memory "No gates per change"); `npm run preflight:coverage` is not needed (no new lib code).
- **Paid runs:** none. No API call in the plan. Translation by hand, in session.
- **Docs to update by name:** `docs/uxs/CHANGE-INVENTORY.md` row H (line 100), the mission count wherever documented, `docs/guides/mission-addition-runbook.md` ("Five missions carry it today" if H-1 sets a sixth `outcome`), `docs/wip/2026-11-13-slice-C4-C5-brief.md` O5 (unblocks C5b), `docs/adr/TA.md` counts if it states a mission total.
- **Rollback:** every change is a data file in git; revert the commit. Images in LFS follow the same commit.

## 9. Decisions for the operator (recommendation first)

1. **H-1 Chandrayaan-2 outcome and dates.** (a) `status ACTIVE` (the orbiter works, as `lro` and `change4` do) **and** `outcome: "failure"` (the lander, the mission's headline objective, was lost; Apollo 13, a partial loss, carries it); the overlay `type` line says "ORBITER WORKING · LANDER LOST". Recommended. Fork: `FLOWN` + `outcome failure`, which matches Beresheet and the runbook's "status stays what it is" text; or no `outcome` (a FAILED pill on an operating orbiter misleads). I have not checked how `/missions` draws ACTIVE together with `outcome` (`src/routes/missions/+page.svelte:79,204`), which the choice depends on. (b) `arrival_date 2019-09-06`, `transit_days 46` (the landing attempt, as Chandrayaan-3 and Beresheet date their landings) recommended; the other reading is LOI 2019-08-20, 29 days.
2. **H-2 Kaguya id.** `kaguya` (the name on the program row, in imagery credits, in `name-origins.js`) recommended; `selene` would match the launch manifest name "SELENE" automatically (`scripts/fetch-launches.ts:119-131`). With `kaguya` the manifest link `orrery_mission_ref` stays null unless the curation allows an override (UNVERIFIED, §10).
3. **H-3 Okina and Ouna.** Name them in the Kaguya text and events, and in the orbiter's description; no separate fleet entries (two 53 kg relay/VLBI satellites with no mission of their own, each would need specs, images and 14 locales). Recommended. Fork: two more orbiter entries (L).
4. **H-4 Also repair `chandrayaan1` `fleet_refs`** (pslv-xl, chandrayaan1 spacecraft, sriharikota-slp) in the same pass (data-only, S; found while reading the analog; the user rule is to finish what is fixable). Recommended.
5. **H-5 Moon sites.** Add a Kaguya orbiter marker (lights the credit chip for the 34 Kaguya TC patches by setting `spacecraft_id` on those entries, a provenance edit) and a Vikram crash-site marker with status CRASHED like Beresheet (needs hotspot images, size M by itself). Recommended: orbiter marker for Kaguya now; the Vikram crash site marker now only if the LROC image is approved, otherwise listed in the deferred list. Do not add the Kaguya impact site as a surface marker.
6. **H-6 Kaguya instrument count.** Name instruments without a number in the overlay (13 vs 15 conflict between Wikipedia and the ISAS page, §3.1) and cite the ISAS page as the source; recommended. Fork: say "15 instruments" (ISAS, the agency page).
7. **H-7 Images.** Stage the candidates of §7 at `/dev/staging` and approve per image; hero for Kaguya from the Commons launch photo or a JAXA Earthrise frame once a JAXA URL is found; hero for Chandrayaan-2 from the ISRO GODL files. Recommended. Note for the operator: the JAXA policy text says "no modification", and the allowlist entry `JAXA-OPEN` has been applied to cropped and re-encoded files since v0.7.0; the repo's precedent stands but the policy sentence is a contradiction worth a one-line ruling.
8. **H-8 Descent profile for the Vikram crash** (`descent-profiles/chandrayaan2.json`, as Beresheet has): skip now; provenance needs engine and mass estimates that are partly unsourced (`chandrayaan3.json` descent file marks them "from memory ... estimated"). Recommended: skip, state in the deferred list.
9. **H-9 Which candidates, in what order.** Take the top 10 of §6 as the next content slice in this order, as one slice each of 3-4 missions, with the fleet-only ones (ranks 1, 2, 3, 4, 5, 6, 8) first because they need no new fleet record. Two scope questions come first: are observatories (Hubble, Hitomi, JWST) missions in this catalogue (the `dest` enum is not checked, §10), and is each Lunar Orbiter a mission or is the series one record.
10. **H-10 Sensitive missions.** STS-107 and STS-51-L carry crew deaths; each text goes through the `science-reviewer` agent before it merges, as the runbook's peer-review gate requires. Recommended.

## 10. NOT VERIFIED

- NV1 Agency sources. ISRO's Chandrayaan-2 page, the JAXA Kaguya project page, NASA NSSDCA records, and two NASA articles on the Vikram find returned 404 or an error page. Every Chandrayaan-2 number rests on one Wikipedia article (two fetches, summarized by the fetch tool); every Kaguya number rests on one Wikipedia article plus the ISAS page and the ESA file page. Nothing was checked against ISRO, JAXA, NASA or a paper.
- NV2 Conflicts left open: Kaguya instrument count (13 vs 15); Okina's orbit (100 x 2,400 km in Wikipedia vs 100 x 800 km on ISAS); Kaguya end date (10 June UTC vs 11 June JST on ISAS); Chandrayaan-2 burn count (5 vs 5 + 1).
- NV3 Not found at all: Kaguya Earth-orbit-raising dates and any TCMs; Kaguya delta-v and mission cost; Ouna's end date; the date NASA announced the Vikram debris; the Earthrise image URL and licence; any Kaguya or Chandrayaan-2 mass at TLI.
- NV4 The effect of `outcome` with `status ACTIVE` on `/missions` was not read or run (only the filter lines `src/routes/missions/+page.svelte:79,204` were seen).
- NV5 Whether `scripts/license-allowlist.ts` accepts `CC-BY-SA-3.0-IGO` (the ESA file) was not checked; whether the launch manifest curation can set `orrery_mission_ref` by hand was not checked.
- NV6 `validate-data` was not run on any draft; no draft exists. The state column of §4 comes from reading the runbook and the analog files, not from a validator result.
- NV7 The MET values in §4 are arithmetic from the dated sources by me (UTC hours included for launch and LOI); the 635.7-day, 517.4-day and 506-day figures were computed by hand and not run through a script.
- NV8 `okina`/`ouna` Japanese forms (おきな, おうな) and `Tiranga Point` come from my memory, not from a fetched page. Chinese, Korean, Arabic, Russian forms of Kaguya were not looked up; the origin rule keeps them Latin, but whether any locale already has an established local form in its overlays was not searched.
- NV9 Candidate sizes (§6) are my estimates from the file counts above; no candidate was opened beyond the fleet and site presence checks. Rank 4 (IM-1) and rank 11 (Hakuto-R) imagery licences, rank 10 CMSA images and rank 5 CNSA images are not checked; the IMAGE-PIPELINE table marks CNSA as manual-only.
- NV10 The `dest` enum and whether an observatory can be a mission (H-9) was not read in `mission.schema.json`. The seen `dest` values in the index are EARTH, MARS, MOON, JUPITER, SATURN, NEPTUNE, MERCURY, PLUTO, CERES, VENUS, COMET, SUN, ASTEROID, BENNU, PSYCHE, DIMORPHOS, DIDYMOS, EURYBATES, ITOKAWA (`q6.mjs`); none is an observatory or L2 value. The `dest` enum itself was not read.
- NV11 Whether `vikram-cy2` may be linked from the new mission as `spacecraft` or only as `payload` (schema roles are launcher, spacecraft, payload, station, launch-site) follows the Chandrayaan-3 pattern (`vikram-cy3` as `spacecraft`, `pragyan` as `payload`); not run through the validator.
- NV12 No browser, no screenshot and no test run was made for this brief; `programs-roster.test.ts` behaviour is from reading lines 82-102.
- NV13 Web search was not available for most of this session; all fetched pages were read through a summarising fetch tool, so exact quotes from them were not seen verbatim.
