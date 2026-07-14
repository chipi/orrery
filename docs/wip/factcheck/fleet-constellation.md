# Fleet constellation fact-check (2026-07-14)

Reviewed 17 constellation entries. Each entry covers both the i18n-src overlay
(`i18n-src/en-US/fleet/constellation/<slug>.json`) and the base data file
(`static/data/fleet/constellation/<slug>.json`).

Severity: 🔴 wrong fact · 🟠 claim > evidence · 🟡 needs source/softening · 🔵 nit

---

## Per-entry verdict summary

| Slug | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| beidou | minor fixes | 0 | 0 | 1 | 1 |
| galileo-gnss | fix needed | 1 | 1 | 0 | 0 |
| glonass | fix needed | 1 | 0 | 1 | 0 |
| goes-noaa | fix needed | 1 | 0 | 0 | 1 |
| gps-gnss | fix needed | 1 | 0 | 0 | 1 |
| inmarsat | minor fixes | 0 | 0 | 1 | 0 |
| iridium-next | fix needed | 1 | 0 | 1 | 0 |
| kuiper | CRITICAL | 2 | 1 | 0 | 0 |
| landsat | clean | 0 | 0 | 0 | 1 |
| molniya | minor fixes | 0 | 0 | 1 | 0 |
| o3b-mpower | minor fixes | 0 | 0 | 1 | 0 |
| oneweb | minor fixes | 0 | 0 | 1 | 0 |
| planet-labs | minor fixes | 0 | 0 | 1 | 0 |
| sbirs-heo | clean | 0 | 0 | 0 | 1 |
| sentinel-copernicus | clean | 0 | 0 | 0 | 0 |
| starlink | CRITICAL | 1 | 0 | 0 | 0 |
| tundra-sirius | CRITICAL | 2 | 1 | 0 | 0 |

**Totals: 🔴 10 · 🟠 3 · 🟡 8 · 🔵 5**

---

## Detail

---

### beidou

🟡 **i18n overlay · description · MEO altitude figure slightly imprecise**
- Quote: "MEO (24 satellites at 21,500 km, 55°)"
- BeiDou-3 MEO altitude is cited as 21,528 km by China Satellite Navigation Office
  (confirmed March 2026 upgrade announcement). 21,500 is a rounded approximation;
  acceptable for general audience, but could be "~21,500 km".
- Source: https://gisresources.com/china-announces-in-orbit-upgrade-for-beidou-satellite-navigation-system-in-2026/
- Confidence: high

🔵 **base · best_known_for · count phrasing vs overlay description**
- base says "30+ satellites mixing MEO (21,500 km), IGSO (35,786 km inclined), GEO"
- overlay description correctly states 24 MEO + 3 IGSO + 3 GEO = 30 exactly.
  "30+" is slightly misleading (there are precisely 30 BDS-3 operational sats).
  The "+" hedges for future, but it should at least be "30 (24 MEO + 3 IGSO + 3 GEO)".
- Source: https://en.wikipedia.org/wiki/List_of_BeiDou_satellites
- Confidence: high

---

### galileo-gnss

🔴 **i18n overlay · description + tagline · satellite count "28" is stale**
- Quote (tagline): "28 sats, sub-metre positioning"
- Quote (description): "28 satellites at 23,222 km MEO"
- As of May 2026, 34 Galileo satellites have been launched (4 IOV + 30 FOC).
  Currently 27 operational + 1 commissioning = effectively 28 usable, but the
  nominal constellation target is 30 (Walker 24/3/1 + 6 spares). The count of
  "28" was accurate circa 2022 but is stale relative to the 34 launched.
  The tagline and description should say "~30 active / 34 launched" or simply
  "30-satellite constellation".
- Source: https://www.euspa.europa.eu/eu-space-programme/galileo/galileo-satellites
  https://en.wikipedia.org/wiki/List_of_Galileo_satellites
- Confidence: high

🟠 **i18n overlay · description · "full operational capability declared 2024"**
- Quote: "full operational capability declared 2024"
- The FOC declaration for the Open Service has not been formally announced as of
  mid-2026 per public ESA/EUSPA statements; the 2024 launches (L12 on Falcon 9)
  expanded the constellation but full FOC is pending 4 more satellites stored
  awaiting Ariane 6. The "2024" FOC claim is ahead of official declaration.
- Source: https://www.gsc-europa.eu/galileo/programme
  https://gnss.asia/new/galileo-on-its-final-steps-to-reaching-full-operational-capability-with-launch-11/
- Confidence: high

---

### glonass

🔴 **i18n overlay · description · "restored to full 24-satellite operational status 2011"**
- Quote: "restored to full 24-satellite operational status 2011"
- GLONASS reached full 24-satellite operational status in **1995** (first time),
  then collapsed in the late 1990s / early 2000s, then was restored to 24
  satellites around **2010-2011**. The description is technically correct for the
  *restoration* date but could be misread as "first ever full coverage was 2011",
  which would be wrong. More importantly the description says "collapsed in the
  1990s after Soviet funding ended; restored to full 24-satellite operational
  status 2011" — this is defensible as referring to the restoration. However the
  claim "First launched 1982" is correct; "collapsed in the 1990s" is correct.
  The error is that GLONASS is described as "first operational GNSS outside GPS"
  in the base file's best_known_for, which is accurate (declared operational 1993).
- base · best_known_for · "first operational GNSS outside GPS" — CONFIRMED
  correct per Wikipedia History of GLONASS (declared operational 1993, full
  constellation 1995).
- Source: https://en.wikipedia.org/wiki/History_of_GLONASS
- Confidence: medium-high (the overlay's wording is ambiguous but not factually
  wrong; the base claim is correct)

🟡 **base · era field · "1981-2011" — misleading for an active system**
- era: "1981-2011" suggests GLONASS ended in 2011. The system is actively
  operating in 2026. The era field presumably refers to an editorial epoch bucket,
  but for a reader this looks like an end date. Flag for editorial review.
- Confidence: medium (may be intentional epoch classification)

---

### goes-noaa

🔴 **i18n overlay · description · GOES-16 is no longer the active GOES-East**
- Quote: "Current generation GOES-R series (GOES-16, 17, 18, 19)"
- GOES-19 replaced GOES-16 as the operational GOES-East on **April 7, 2025**.
  GOES-16 is now stored as backup. GOES-17 was also replaced by GOES-18 in
  January 2023 (GOES-17 failed its ABI coolant loop). The description lists all
  four as "current generation" without clarifying that GOES-19 is now East-primary
  and GOES-16 is backup. This risks misleading readers about the current
  operational configuration.
- Correction: "GOES-19 (GOES-East, 75.2° W) + GOES-18 (GOES-West, 137.0° W)
  are the operational pair as of April 2025. GOES-16 stored as backup; GOES-17
  decommissioned."
- Source: https://www.noaa.gov/news-release/noaas-goes-19-satellite-now-operational-providing-critical-new-data-to-forecasters
  https://en.wikipedia.org/wiki/GOES-19
- Confidence: high

🔵 **i18n overlay · description · "30-second mesoscale scans"**
- The ABI can do 30-second mesoscale scans for a 1000×1000 km region; the full
  disk scan is every 5-15 minutes. "30-second mesoscale" is correct but reads
  as if the full constellation scans at 30-second cadence. Minor wording nit.
- Confidence: medium

---

### gps-gnss

🔴 **i18n overlay · description · "civilian unencrypted L1 C/A signal opened in 1983"**
- Quote: "civilian unencrypted L1 C/A signal opened in 1983 after Korean Air
  Lines 007 was shot down"
- The 1983 KAL 007 shootdown prompted President Reagan to *promise* future
  civilian GPS access — but GPS wasn't even operational until 1995. The civilian
  L1 C/A signal was not "opened" in 1983; rather, Reagan issued a policy
  direction that GPS would be made available to civilians once developed.
  Civilian access with full accuracy (SA off) came in **May 2000**.
  The framing "opened in 1983" is factually wrong.
- Correction: "Reagan's 1983 directive promised future civilian access after
  the KAL 007 shootdown; Selective Availability was turned off in May 2000,
  dramatically improving civilian accuracy."
- Source: https://en.wikipedia.org/wiki/Global_Positioning_System
  https://odimpact.org/case-united-states-opening-gps-data-for-civilian-use.html
- Confidence: high

🔵 **base · best_known_for · "free public service since 2000"**
- This correctly references SA being turned off in 2000. Consistent with fix
  above once overlay wording is corrected. Clean as a standalone claim.
- Confidence: high

---

### inmarsat

🟡 **i18n overlay · description · "14+ satellites" — soft claim, acceptable but drifting**
- The Inmarsat fleet is approximately 14 GEO satellites (L-band + I-4 + I-6 +
  GX Ka-band fleet). "14+" is a defensible lower-bound hedge but the Viasat
  acquisition and possible asset restructuring in 2024-2026 make this uncertain.
  Recommend "~13 GEO satellites" with a note that count may change post-merger.
- Source: https://www.inmarsat.com/
  https://en.wikipedia.org/wiki/Inmarsat
- Confidence: medium

---

### iridium-next

🔴 **i18n overlay · description + tagline · "75 satellites" overcounts operational sats**
- Quote (tagline): "75 sats, GMDSS partner, global voice/data"
- Quote (description): "75 satellites at 780 km in 6 polar planes"
- The Iridium NEXT programme launched 75 satellites (66 operational + 9 on-orbit
  spares). An additional 5 of 6 ground spares were launched May 2023. Total
  launched is now ~80. But the operational constellation is **66 satellites**
  (11 per plane × 6 planes). "75 satellites" as the count blurs operational
  with spares. Tagline + description should say "66 operational satellites"
  or "66 + spares."
- Source: https://www.thalesgroup.com/en/worldwide/space/press-release/iridium-next-constellation-66-operational-satellites-will-make
  https://en.wikipedia.org/wiki/Iridium_satellite_constellation
- Confidence: high

🟡 **i18n overlay · description · "The backbone of GMDSS — every ocean-going vessel's emergency comms run through Iridium"**
- Iridium is one of two GMDSS satellite providers (the other is Inmarsat). "Every
  ocean-going vessel" overstates Iridium's exclusive role — SOLAS vessels can
  fulfill GMDSS via Inmarsat OR Iridium. Flag as overclaim.
- Source: https://www.iridium.com/services/iridium-certus/gmdss/
- Confidence: medium-high

---

### kuiper

🔴 **CRITICAL — i18n overlay · name / tagline / description · "Project Kuiper" name stale**
- Quote (name): "Project Kuiper"
- Quote (tagline): "Amazon LEO broadband — 3236 sats planned, ramping 2024+"
- Amazon rebranded "Project Kuiper" to **"Amazon Leo"** in **November 2025**.
  The constellation has been operating under the Amazon Leo brand since then.
  All three fields (name, tagline, description) use the old name.
- Correction: name → "Amazon Leo (formerly Project Kuiper)"; tagline → "Amazon
  LEO broadband — 3,236 sats planned, commercial beta 2026"; description updated
  to reflect rebrand.
- Source: https://spacenews.com/project-kuiper-becomes-amazon-leo-ahead-of-leo-broadband-service-debut/
  https://en.wikipedia.org/wiki/Amazon_Leo
  https://www.aboutamazon.com/news/amazon-leo/project-kuiper-becomes-amazon-leo
- Confidence: high

🔴 **i18n overlay · description · "First operational launches began in 2023" — wrong**
- Quote: "First operational launches began in 2023"
- The 2023 launch (October 6, 2023) was the **prototype** KuiperSat-1 and -2
  test launch, not the first production/operational satellites. The first 27
  production satellites launched on April 28, 2025 (Atlas V). As of July 2026
  ~231 satellites are in orbit.
- Correction: "First prototype launch October 2023; first 27 production satellites
  April 2025; ~230+ in orbit as of mid-2026."
- Source: https://keeptrack.space/deep-dive/amazon-leo-progress-2026
  https://en.wikipedia.org/wiki/Amazon_Leo
- Confidence: high

🟠 **base · best_known_for + credit · FCC "50% deployment by July 2026" deadline**
- Quote: "FCC license requires 50% deployment by July 2026"
- The FCC deadline of 1,618 satellites by July 30, 2026 is confirmed, but Amazon
  has ~231 in orbit and has applied for a two-year extension. The base file's
  phrasing reads as if the milestone is on track, when in fact the deadline will
  almost certainly be missed and an extension is pending.
- Correction: note the extension request and shortfall.
- Source: https://keeptrack.space/deep-dive/amazon-leo-progress-2026
- Confidence: high

---

### landsat

🔵 **i18n overlay · description · "originally as ERTS-1" — correct, minor detail nit**
- Landsat 1 was named ERTS-1 (Earth Resources Technology Satellite) at launch and
  renamed Landsat 1 in 1975. The description says "launched 1972 (originally as
  ERTS-1)" which is accurate. No error; noting for completeness that ERTS-1 was
  renamed in January 1975, which the text doesn't say but doesn't need to.
- Confidence: high

---

### molniya

🟡 **i18n overlay · description · "~600 × 40,000 km" apogee figure slightly high**
- Quote: "The 12-hour Molniya orbit (~600 × 40,000 km)"
- Canonical Molniya orbit apogee is ~39,700 km (Wikipedia / Molniya orbit article).
  40,000 km is within rounding but the Wikipedia and standard references give
  39,700 km. Could say "~600 × ~39,700 km" or "~600 × ~40,000 km" with tilde
  to signal approximation.
- Source: https://en.wikipedia.org/wiki/Molniya_orbit
- Confidence: medium

---

### o3b-mpower

🟡 **i18n overlay · description · "20+ satellites" count stale**
- Quote: "20+ satellites at 8,063 km equatorial orbit"
- As of March 2026, 10 of 13 planned O3b mPOWER satellites have launched; the
  original O3b fleet had 20 satellites (of which some have been decommissioned).
  Combined fleet is ~28 O3b + mPOWER across generations, but counting only
  mPOWER the "20+" is misleading (only 10 mPOWER are up). The combined fleet
  with legacy O3b satellites is approximately 28-30 total. Recommend "~28
  combined O3b + mPOWER satellites" or split the generations clearly.
- Source: https://www.boeing.com/features/2026/03/latest-pair-of-boeings-o3b-mpower-satellites-enter-service
  https://en.wikipedia.org/wiki/O3b_mPOWER
- Confidence: medium-high

---

### oneweb

🟡 **i18n overlay · description · "648 satellites at 1,200 km in 12 polar planes"**
- Current verified count is ~649 satellites operational (essentially at designed
  capacity of 648). The description's "648" is the design figure and close to
  current reality. However the description says "First-generation LEO broadband
  constellation, 648 satellites" but new-gen satellites (440 ordered from Airbus,
  deliveries from late 2026) are coming. "First-generation" is accurate but
  the reader context of 2026 should acknowledge the gen-2 order is underway.
- Minor: the "12 polar planes" is correct (6 near-polar planes at ~87.9°).
- Source: https://en.wikipedia.org/wiki/Eutelsat_OneWeb
  https://www.airbus.com/en/newsroom/press-releases/2026-01-airbus-awarded-eutelsat-contract-for-further-340-low-earth-orbit
- Confidence: medium

---

### planet-labs

🟡 **i18n overlay · description · "~150 CubeSats + 21 SkySats" — SkySat count uncertain**
- Quote: "~150 PlanetScope 3U CubeSats (3-5 m resolution global daily imagery)
  and ~21 SkySats (50 cm tasked high-resolution)"
- PlanetScope count "~150" is consistent with 2025-2026 reporting (~200 SuperDoves
  total in various states; ~150 actively imaging is plausible). SkySat count is
  more uncertain: ESA Earth Online lists SkySat as "15 satellites"; Planet
  documentation describes a "high resolution constellation of 15 satellites."
  The "~21" figure may reflect peak fleet size before some retirements; current
  active count appears to be closer to 15-21. Flag as soft.
- Source: https://earth.esa.int/eogateway/missions/skysat
  https://docs.planet.com/data/imagery/skysat/
- Confidence: medium

---

### sbirs-heo

🔵 **i18n overlay · description · "SBIRS HEO-1 launched in 2006 as a hosted payload on USA-184" — correct**
- USA-184 launched June 28, 2006 (NROL-22); confirmed. USA-200 (HEO-2, 2008)
  and USA-259 (HEO-3, 2014) + HEO-4 operational 2017. All confirmed. Entry
  is clean.
- Source: https://en.wikipedia.org/wiki/Space-Based_Infrared_System
- Confidence: high

---

### sentinel-copernicus

Entry is clean. Sentinel-1/2/3/5P/6 assignments correct; free+open data policy
confirmed; sun-synchronous LEO confirmed. No findings.

---

### starlink

🔴 **CRITICAL — i18n overlay · tagline + description · "~6,000 active satellites" badly stale**
- Quote (tagline): "Largest LEO broadband constellation — ~6000 active satellites"
- Quote (description): "~6,000 active satellites at 550 km altitude"
- As of July 2026, Starlink has approximately **10,759 operational satellites**
  in orbit (per Jonathan McDowell's tracker and KeepTrack March 2026 report
  citing 10,087+). The ~6,000 figure is from approximately late 2023/early 2024.
  The tagline and description are both severely stale and undercount by ~4,700.
- Correction: tagline → "Largest LEO broadband constellation — ~10,000+ active
  satellites"; description → "~10,700+ active satellites" (or use soft "~10,000"
  with growing caveat).
- Source: https://keeptrack.space/x-report/spacex-brief-2026-03-22
  https://planet4589.org/space/con/star/stats.html
  https://findcheapbroadband.com/blog/how-many-satellites-does-starlink-have/
- Confidence: high

---

### tundra-sirius

🔴 **CRITICAL — i18n overlay · name / description · Sirius Tundra satellites decommissioned 2016**
- Quote (name): "Sirius Satellite Radio (Tundra)"
- Quote (description): "Commercial satellite-radio constellation in the 24-hour
  Tundra orbit (~25,000 × 35,786 km) at the 63.4° critical inclination. Each
  satellite dwells over CONUS for roughly two-thirds of every orbit..."
- The original Sirius FM-1/2/3 Tundra-orbit satellites were **decommissioned in
  2016**. SiriusXM discontinued broadcasting from Tundra orbits in 2016 and
  migrated to a geostationary fleet. As of 2026 SiriusXM operates ~7 GEO
  satellites (SXM series). The Tundra-orbit Sirius constellation no longer exists.
- Correction: The entry should be labeled as historical ("former Tundra orbit
  constellation, 2000-2016") or restructured to note that the Tundra concept
  (not the current SiriusXM service) is being illustrated.
- Source: https://en.wikipedia.org/wiki/List_of_SiriusXM_satellites
  https://en.wikipedia.org/wiki/Tundra_orbit
  https://spaceflightnow.com/2026/06/28/live-coverage-spacex-to-launch-7-5-ton-siriusxm-satellite-as-part-of-constellation-refresh/
- Confidence: high

🔴 **base · status "ACTIVE" — wrong**
- Quote: "status": "ACTIVE"
- The Tundra-orbit Sirius FM-1/2/3 satellites are decommissioned. Status should
  be "RETIRED" or "HISTORICAL". The current SiriusXM service is GEO-only.
- Source: https://en.wikipedia.org/wiki/Sirius_FM-1 (notes 2016 decommission)
- Confidence: high

🟠 **i18n overlay · description · "Sirius FM-1 launched from Baikonur in 2000 on a Proton-K"**
- The launch details are correct (June 30, 2000, Proton-K/DM3, Site 81/24,
  Baikonur). However the overall entry frames this as a current/active
  constellation, which makes the historical launch detail misleading in context.
  Once status is corrected to RETIRED, this becomes a valid historical note.
- Source: https://en.wikipedia.org/wiki/Sirius_FM-1
  https://space.skyrocket.de/doc_sdat/sirius-cdr.htm
- Confidence: high

---

## Cross-cutting notes

1. **Hard satellite counts throughout** — GPS (31), GLONASS (23-24), BeiDou (30),
   Galileo (~28 usable now, 34 launched), Iridium NEXT (66 operational + spares),
   Starlink (~10,700+) all drift. Recommend "~" prefix on any count that will
   change, and avoid bare integers for dynamic constellations.

2. **Kuiper/Amazon Leo rebrand** is the most important single fix — the name is
   wrong on both files and will confuse any 2026 reader.

3. **Tundra-Sirius ACTIVE status** is the most consequential base-data error —
   the constellation described has not operated for 10 years.

4. **Starlink count** (~6,000 vs ~10,700) is the largest numerical error in the
   set.

5. **GOES-East identity** (GOES-16 → GOES-19 as of Apr 2025) is the most
   time-sensitive operational error.
