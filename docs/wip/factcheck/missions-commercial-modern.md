# Fact-check — Commercial / Modern Earth-Orbit Missions

Reviewer: science-reviewer (independent, web-verified). Date: 2026-07-14.
Scope: `inspiration4`, `polaris-dawn`, `otv-1`…`otv-7` (prose overlay +
base data). **No files were edited** — findings only.

## Per-mission verdicts

| Mission | Verdict | Highest severity |
|---|---|---|
| inspiration4 | PASS — all claims verified | — |
| polaris-dawn | PASS — all claims verified | — |
| otv-1 | FAIL — apogee wrong | MAJOR |
| otv-2 | PASS (minor unverifiable apogee) | LOW |
| otv-3 | FAIL — fabricated Antares/CCAFS interruption claim | MAJOR |
| otv-4 | PASS | — |
| otv-5 | PASS | — |
| otv-6 | PASS (minor apogee rounding) | LOW |
| otv-7 | PASS (minor perigee number) | LOW |

## Counts

- CRITICAL: 0
- MAJOR: 2 (otv-1 apogee; otv-3 fabricated interruption)
- MINOR: 0
- LOW / note: 3 (otv-2, otv-6, otv-7 orbital-parameter precision)
- Total flagged: 5 across 9 missions

---

## inspiration4 — PASS

All checked claims verified.

- **Dates**: launch 2021-09-15 00:02 UTC (Sept 16 UTC / Sept 15 EDT — the
  file's 09-15 is the US launch date, internally consistent); splashdown
  2021-09-18 23:06 UTC. ✓
- **first / superlative** (`first`, `description`, `events[1].note`): "First
  all-civilian orbital spaceflight" ✓; "585 km circular … highest crewed
  orbit since the Hubble servicing missions" ✓ (Wikipedia: highest since
  STS-103 in 1999, a Hubble servicing mission). ✓
- **$243M for St. Jude** (`first`, `description`): ✓ ("more than US$243
  million").
- **Vehicle** (`description`, base `vehicle`): F9 B1062 third flight ✓;
  Crew Dragon Resilience C207 previously flown on Crew-1 ✓; cupola replacing
  docking adapter ✓ (first Dragon cupola flight).
- **51.6° inclination**, 3-day free flight, Arceneaux first cancer survivor
  in orbit — all ✓.
- Confidence: high. Source: https://en.wikipedia.org/wiki/Inspiration4

---

## polaris-dawn — PASS

All checked claims verified.

- **Dates**: launch 2024-09-10 09:23 UTC; splashdown 2024-09-15 07:36 UTC. ✓
- **first / superlative** (`first`, `description`): "First commercial
  spacewalk" ✓ (Wikipedia uses both "first commercial" and "first private");
  "highest Earth orbit by humans since Apollo 17 (1408 km)" ✓ (max geoid
  height 1408.3 km; farthest crewed non-lunar).
- **EVA mechanism** (`description`): no airlock, entire cabin depressurized,
  all 4 crew exposed to vacuum ✓; Isaacman + Gillis each ~8 min (7:56 / 7:15)
  ✓; new SpaceX EVA suits ✓.
- **Apogee profile** (`description`, base `delta_v`): raised to 1408 km day 1,
  lowered to ~730 km for EVA ✓ (sources give ~700 km; 730 is within tolerance
  and is the SpaceX-quoted figure).
- **Starlink laser inter-satellite links** ✓ (first crewed Dragon laser
  interlink test).
- **Vehicle**: F9 B1083, Crew Dragon Resilience C207 third flight ✓.
- Confidence: high. Source: https://en.wikipedia.org/wiki/Polaris_Dawn

---

## otv-1 — FAIL (MAJOR)

**[MAJOR] Wrong apogee.**
- File/field: `i18n-src/en-US/missions/earth/otv-1.json` →
  `events[1].note` ("ON-ORBIT OPS").
- Quote: *"Apogee 410 km; classified payload operations."*
- What's wrong: OTV-1's apogee was **~287 km**, not 410 km. Wikipedia OTV-1
  gives apogee 287 km (178 mi). 410 km is not supported by any source.
- Correction: change to ~287 km (or hedge "~290 km").
- Source: https://en.wikipedia.org/wiki/OTV-1
- Confidence: high.

**Verified-OK on otv-1:**
- Launch 2010-04-22 23:52 UTC, Atlas V 501 AV-012 from CCAFS SLC-41 ✓.
- Landing Vandenberg 2010-12-03 09:16 UTC, 224 days ✓.
- "first autonomous orbital spaceplane re-entry under runway-landing
  operations since the Soviet Buran 1.01 in 1988" ✓ (X-37B = second reusable
  spacecraft to perform automated landing after Buran 1988; first American).

---

## otv-2 — PASS (LOW note)

- **Dates/duration** (`description`, base): launch 2011-03-05 22:46 UTC,
  landed Vandenberg 2012-06-16 12:48 UTC, 469 days ✓ (precise 468 d 14 h,
  rounds to 469).
- **AV-026, Atlas V 501** ✓.
- **"at the time the longest US autonomous orbital spaceflight, surpassed by
  every subsequent OTV flight"** ✓ (record then; each later OTV longer).

**[LOW] Unverifiable apogee.** `events[1].note`: *"Apogee ~340 km"*. OTV-2's
precise orbit was not publicly disclosed; ~340 km is a plausible amateur-track
estimate but not authoritatively sourced. Hedged with "~", acceptable. No
change required; flagged for transparency. Confidence: medium.

---

## otv-3 — FAIL (MAJOR)

**[MAJOR] Fabricated operational-interruption claim.**
- File/field: `i18n-src/en-US/missions/earth/otv-3.json` → `description`.
- Quote: *"Operations interrupted by 16 days when the Antares CRS-3 launch
  failure on adjacent CCAFS infrastructure briefly hindered USSF support
  windows."*
- What's wrong: This is fabricated on multiple counts:
  1. The Antares Orb-3 (also called CRS-3) failure occurred **2014-10-28 at
     Wallops Island, Virginia (Mid-Atlantic Regional Spaceport, Pad 0A)** —
     NOT at Cape Canaveral / CCAFS. Antares never launched from CCAFS.
  2. It was a NASA/Orbital Cygnus cargo-resupply failure, wholly unrelated to
     the X-37B programme; no source connects it to OTV-3 operations.
  3. There is no record of any 16-day OTV-3 operational interruption.
  4. "USSF" is anachronistic for 2012–2014 (Space Force established Dec 2019;
     OTV-3 was a USAF mission). Same anachronism appears in every OTV base
     file's `agency`/`agency_full`, but is hedged there as "formerly USAF…".
     In this narrative sentence it compounds the fabrication.
- Correction: delete the entire sentence. OTV-3 flew 675 days uneventfully;
  no public interruption is documented.
- Sources: https://en.wikipedia.org/wiki/Cygnus_Orb-3 ,
  https://en.wikipedia.org/wiki/OTV-3
- Confidence: high.

**Verified-OK on otv-3:**
- Launch 2012-12-11 18:03 UTC, AV-034 from CCAFS SLC-41 ✓.
- Landed Vandenberg 2014-10-17 16:24 UTC, 675 days ✓ (674 d 22 h).
- "reuse of the OTV-1 flight vehicle" ✓ (OTV-3 reflew the OTV-1 vehicle).

---

## otv-4 — PASS

- **Dates/duration** (`description`, base): launch 2015-05-20 15:05 UTC AV-054;
  landed KSC Shuttle Landing Facility 2017-05-07 11:47 UTC; 718 days ✓
  (717 d 20 h; beat OTV-3's record).
- **First OTV landing at KSC SLF** ✓; "same 4.6 km runway formerly used by
  the Space Shuttle" ✓ (SLF runway is 15,000 ft ≈ 4.6 km).
- **Payloads** (`description`): AFRL Hall-effect thruster ✓ (Aerojet
  Rocketdyne XR-5A is the flight designation of the BPT-4000; the "XR-5A, ion
  propulsion" gloss is defensible — Hall thruster is a form of electric/ion
  propulsion) and a NASA materials experiment ✓ (NASA METIS materials-exposure
  payload; prose's "Materials Exposure Test bed" is an accurate descriptor).
- Confidence: high. Source: https://en.wikipedia.org/wiki/OTV-4
- Note (LOW, no change): Wikipedia does not print the "XR-5A" designator; it
  is correct per Aerojet/AFRL naming but slightly beyond the cited source.

---

## otv-5 — PASS

- **Dates/duration** (`description`, base): launch 2017-09-07 14:00 UTC from
  KSC LC-39A; landed KSC SLF 2019-10-27 07:51 UTC; 780 days ✓.
- **First X-37B on Falcon 9; only flight on a Block 4 F9** ✓; booster
  recovered at LZ-1 ✓.
- **54.5° inclination** ✓ (Wikipedia OTV-5: deployed into 54.5°, higher than
  previous X-37B missions — "first X-37B flight to a higher-inclination
  orbit" is correct). Note: a pre-launch NOTAM had suggested 49.5°, but the
  actual/reported orbit was 54.5°; the file's figure is right.
- Confidence: high. Source: https://en.wikipedia.org/wiki/OTV-5

---

## otv-6 — PASS (LOW note)

- **Dates/duration** (`description`, base): launch 2020-05-17 13:14 UTC AV-081;
  landed KSC SLF 2022-11-12 10:22 UTC; 908 days ✓ (record).
- **"first under the new USSF organisational designation"** ✓ (OTV-6 / USSF-7
  was the first X-37B mission under the U.S. Space Force).
- **Service module** ✓ (OTV-6 introduced the aft service-module ring).
- **Payloads** (`description`): NRL PRAM (Photovoltaic RF Antenna Module)
  power-beaming experiment ✓; USAFA FalconSat-8 deployed ✓.
- Confidence: high. Source: https://en.wikipedia.org/wiki/OTV-6

**[LOW] Apogee rounding.** `events[1].note`: *"Apogee ~390 km"*. Wikipedia
gives apogee 404 km / perigee 388 km. "~390 km" is closer to perigee than
apogee; minor, hedged with "~". Optional tighten to ~400 km. Confidence: high.

---

## otv-7 — PASS (LOW note)

- **Dates/duration** (`description`, base): launch 2023-12-29 01:07 UTC from
  KSC LC-39A on Falcon Heavy; landed Vandenberg SFB 2025-03-07 09:22 UTC;
  434 days ✓ (434 d 6 h). This is the latest completed OTV flight; the next,
  OTV-8/USSF-36, launched Aug 2025 on Falcon 9 — so "seventh flight" and the
  2025 landing status are current as of review date. ✓
- **first HEO orbit; first on Falcon Heavy** ✓; side boosters recovered at
  LZ-1/LZ-2, centre core expended ✓.
- **Apogee near GEO belt** ✓ (~38,838 km apogee, ~3,000 km above GEO).
- **Aerobraking-style de-orbit + public USSF transparency update** ✓ (novel
  aerobraking maneuvers publicized; first released X-37B Earth photo).
- Confidence: high. Sources: https://en.wikipedia.org/wiki/OTV-7 ,
  https://spaceflightnow.com/2025/03/07/u-s-air-forces-x-37b-spaceplane-lands-following-434-day-orbital-mission/

**[LOW] Perigee number.** `events[1].note`: *"Apogee HEO ~38,800 km × 250
km"*. Apogee ✓; the perigee "250 km" is low — sources give ~323 km. Minor,
hedged with "~". Optional correct to ~320 km. Confidence: medium.
