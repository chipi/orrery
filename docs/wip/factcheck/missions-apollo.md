# Fact-check — Apollo Moon-landing editorials

Independent web-verified review of the 9 Apollo mission editorials (prose overlay
`i18n-src/en-US/missions/moon/<slug>.json` + base data
`static/data/missions/moon/<slug>.json`). Every claim treated as wrong until
verified against NASA / mission-report / Wikipedia sources.

Verified 2026-07-14.

## Per-mission verdicts

| Mission | Verdict | Highest severity |
|---|---|---|
| Apollo 8  | PASS (minor) | LOW |
| Apollo 10 | PASS (minor internal note) | LOW |
| Apollo 11 | PASS | none |
| Apollo 12 | **FAIL — 1 HIGH factual error** | HIGH |
| Apollo 13 | **FAIL — 1 HIGH (stale record) + 1 MED (date/UTC)** | HIGH |
| Apollo 14 | PASS (minor rounding) | LOW |
| Apollo 15 | PASS (minor rounding) | LOW |
| Apollo 16 | PASS | none |
| Apollo 17 | PASS (1 LOW internal inconsistency) | LOW |

## Counts

- HIGH: 3 (Apollo 12 ×1, Apollo 13 ×2)
- MEDIUM: 0 (the Apollo 13 UTC-date item counted under HIGH cluster; see note)
- LOW: 7
- Total findings: 10

Net: 2 missions FAIL, 7 PASS. All crew names, launch/landing dates, LRV
distances, sample masses, EVA/surface durations otherwise verified accurate.

---

## Apollo 8 — PASS (minor)

Dates, crew, Earthrise, viewers all check out.

- **[LOW] Earthrise photo ID + orbit — VERIFIED.** Overlay event EARTHRISE:
  "Anders photographs Earth rising … during the fourth orbit (1968-12-24,
  AS08-14-2383)." Correct: taken 24 Dec 1968 during the 4th of 10 orbits;
  catalog AS08-14-2383. No change. Confidence: high.
  Source: https://commons.wikimedia.org/wiki/File:NASA_Earthrise_AS08-14-2383_Apollo_8_1968-12-24.jpg
- **[LOW] Splashdown + recovery — VERIFIED.** Overlay/base: North Pacific
  1968-12-27, USS Yorktown. Correct. Confidence: high.
  Source: https://www.history.navy.mil/content/history/nhhc/browse-by-topic/exploration-and-innovation/navy-and-space-exploration/Apollo_8_NASA.html
- **[LOW] "~1 billion viewers, largest live TV audience to that date"** — overlay
  dispatch + description + GENESIS event. This is the commonly-cited figure and
  is defensible, though "billion" is an estimate (some sources say hundreds of
  millions). Not an error; flagged only for the estimate character. Confidence: medium.
- Note: base header `payload: "28833 kg"` for CSM-103 is within a few kg of the
  ~28,817 kg flown mass — acceptable rounding. Launch LC-39A, arrival_date
  1968-12-24 (LOI) consistent. No change.

## Apollo 10 — PASS (minor internal note)

- **[LOW] Launch pad / recovery — VERIFIED.** LC-39B, first & only Apollo launch
  from 39B; splashdown South Pacific 1969-05-26, USS Princeton. Correct.
  Confidence: high.
  Source: https://www.nasa.gov/missions/apollo/apollo-10-mission-details/
- **[LOW] Snoopy heliocentric / only-surviving ascent stage — VERIFIED.**
  Description: "the only one to leave lunar orbit with positive ∆v — jettisoned
  into a heliocentric orbit … most recently confirmed by Nick Howes / Faulkes
  Telescope, 2019." Correct — Snoopy's ascent stage is the only used Apollo LM
  ascent stage still in solar orbit; the 2019 candidate (2018 AV2) was announced
  by Nick Howes (who has long used the Faulkes Telescope). Wording is fine.
  Confidence: high.
  Source: https://en.wikipedia.org/wiki/Apollo_10#Snoopy
- **[LOW] Closest approach ~15.6 km — VERIFIED.** Snoopy descended to ~15.6 km
  (~8.4 nmi / 50,000 ft) above the surface. Correct. Confidence: high.
- Note: base header `arrival_date: 1969-05-21` = LOI date; overlay CMP John Young
  correctly stays in CSM Charlie Brown while Stafford + Cernan descend. Consistent.

## Apollo 11 — PASS

All headline numbers verified against NASA.

- **[—] Surface time 21 h 36 m — VERIFIED.** Overlay + base. Correct.
  Confidence: high.
- **[—] EVA duration — VERIFIED.** Overlay says "2.5 hours of EVA"; base event
  says "2h 31m EVA." The single Armstrong+Aldrin surface EVA was 2 h 31 m 40 s
  (~2.5 h). Both internally consistent and correct. No change. Confidence: high.
- **[—] Samples 21.55 kg — VERIFIED.** ~21.5 kg (47.5 lb). Correct.
  Confidence: high.
- **[—] ~600 million viewers — VERIFIED.** Standard cited figure. Correct.
  Confidence: high.
  Source: https://www.nasa.gov/history/apollo-11-mission-overview/
- Note: base event earth_return prose says "650 million people walk on the Moon"
  (clumsy phrasing — means "watched"), and quotes ~110 × 313 / 113 × 313 km LOI
  orbit and "<30 s fuel" — all within accepted ranges. Overlay's clean "~600
  million" is the primary claim and is correct.

## Apollo 12 — FAIL (1 HIGH)

- **[HIGH] "First man-made lunar impact event" is FALSE.**
  File: overlay `events[].note`, label LM IMPACT — "Intrepid ascent stage
  deliberately crashed onto Moon to calibrate ALSEP seismometers. **First
  man-made lunar impact event.**"
  What's wrong: The Intrepid ascent-stage impact (1969) was the first
  *deliberate impact recorded by an emplaced seismometer for calibration*, but it
  was NOT the first man-made object to hit the Moon. **Luna 2 (USSR) impacted the
  Moon on 13 Sep 1959**, and multiple Ranger probes (Ranger 4 in 1962, Rangers
  6–9 1964–65) plus spent Saturn S-IVB stages impacted before Apollo 12.
  Correction: reword to e.g. "the first crewed-mission spacecraft stage
  deliberately impacted onto the Moon and recorded by a surface seismometer" —
  drop the absolute "first man-made lunar impact event" superlative.
  Source: https://www.nasa.gov/history/60-years-ago-luna-2-makes-impact-in-moon-race/
  Confidence: high.
- **[LOW] Landing 163 m from Surveyor 3 — VERIFIED.** 535 ft ≈ 163 m, touchdown
  06:54 UTC 1969-11-19. Correct. Confidence: high.
- **[LOW] Surface time 31 h 31 m, samples 34 kg, ALSEP ~8 years — VERIFIED.**
  Surface 31 h 31 m; 34.4 kg samples; ALSEP transmitted until Sep 1977 (~8 yr).
  Correct. Confidence: high.
  Source: https://en.wikipedia.org/wiki/Apollo_12 ;
  https://en.wikipedia.org/wiki/Apollo_12_Passive_Seismic_Experiment
- Note: overlay "first ALSEP (vs Apollo 11's simpler EASEP)" — correct; Apollo 11
  flew EASEP, Apollo 12 flew the first full ALSEP.

## Apollo 13 — FAIL (2 HIGH)

- **[HIGH] "The farthest humans have ever travelled from Earth" is now STALE /
  incorrect (Artemis II, Apr 2026).**
  Files: overlay `events[].note` LUNAR FLYBY — "the farthest a crewed spacecraft
  has ever travelled from Earth"; AND base `flight.events[]` flyby description —
  "Apollo 13's altitude record: the farthest humans have ever travelled from
  Earth (400,171 km on the far side)." Base credit-string is OK (no
  still-standing claim).
  What's wrong: Apollo 13's 400,171 km record **was broken by Artemis II in April
  2026** (Orion reached ~406,700 km). Both notes assert the record as
  still-standing in the present tense.
  Correction: qualify as "the farthest humans travelled from Earth *until Artemis
  II (April 2026)*" or state the record was held 1970–2026.
  Source: https://www.cnbc.com/2026/04/06/artemis-ii-breaks-apollo-13s-distance-record.html
  Confidence: high.
- **[HIGH/MED] O2-tank-rupture date "1970-04-13" paired with "03:08 UTC" is
  internally wrong.**
  File: base `flight.events[]`, label anomaly — "**1970-04-13 03:08 UTC**. Oxygen
  tank 2 in the Service Module ruptured…"
  What's wrong: The rupture (GET 55:54:53) occurred at **03:08 UTC on 14 April
  1970** (= 10:08 pm EST, 13 April). "April 13" is the US-local date; pairing it
  with a UTC timestamp makes the field factually wrong — 03:08 UTC is 14 April.
  Correction: "1970-04-14 03:08 UTC" (or "1970-04-13 22:08 EST").
  Source: https://www.nasa.gov/history/detailed-chronology-of-events-surrounding-the-apollo-13-accident/
  Confidence: high.
- **[LOW] Launch/flyby/splashdown/altitude otherwise VERIFIED.** Launch
  1970-04-11 19:13 UTC; closest approach 254 km over the far side; splashdown
  1970-04-17, USS Iwo Jima; rupture GET 55:54:53 (overlay description "55 hours
  54 minutes" ✓). Correct. Confidence: high.
- Note: overlay's `first`/dispatch avoid the still-standing-record trap; the
  problem is confined to the two event notes above.

## Apollo 14 — PASS (minor rounding)

- **[LOW] Total EVA "9 h 23 m"** — overlay description. Actual total surface EVA
  = **9 h 22 m 31 s** (EVA-1 4:47:50 + EVA-2 4:34:41). "9 h 23 m" is a fair
  round of 9:22:31, but "9 h 22 m" is the more precise value. Cosmetic.
  Confidence: high.
  Source: https://en.wikipedia.org/wiki/Apollo_14
- **[LOW] Cone Crater "~30 m short of the rim"** — overlay dispatch/description.
  Sources vary: ~30 m (common) to ~40 m (astronomy.com). Defensible; consider
  "~30–40 m." Confidence: medium.
- **[—] Samples 42 kg, Shepard oldest Moonwalker at 47, first American in space,
  MET (no LRV), golf, Moon Trees, surface 33 h 31 m — VERIFIED.** ~42.3 kg;
  Shepard age 47 = oldest; MET correct; Fra Mauro (Apollo 13's lost target)
  correct. Confidence: high.

## Apollo 15 — PASS (minor rounding)

- **[LOW] Deep-space EVA "38 min at ~315 000 km"** — overlay description + event.
  Worden's trans-Earth EVA was **~39 min (39 m 7 s) at ~317,000 km**. "38 min /
  315,000 km" are slight under-statements. Consider "~39 min at ~317,000 km."
  Confidence: high.
  Source: https://en.wikipedia.org/wiki/Apollo_15
- **[—] LRV 27.9 km, samples 77.3 kg (overlay "77 kg"), EVA 18 h 35 m, Genesis
  Rock 15415 (4.1 Gyr anorthosite), hammer-feather drop, Hadley-Apennine,
  first J-mission, parachute failure — VERIFIED.** All correct. Confidence: high.
- Note: overlay says walking-only Apollo 14 range "3.5 km" — reasonable
  characterisation of the MET traverse radius; not a hard published figure but
  not misleading.

## Apollo 16 — PASS

- **[—] LRV 26.7 km, samples 95.7 kg (95.71), EVA 20 h 14 m, surface 71 h 02 m,
  Descartes highlands (breccia, not volcanic), lunar Grand Prix, Far-UV
  camera-spectrograph, Mattingly — VERIFIED.** All correct. "Heaviest Apollo haul
  to that date" correct (Apollo 17 later exceeded it). Confidence: high.
  Source: https://en.wikipedia.org/wiki/Apollo_16
- Note: base header `arrival_date: 1972-04-19` = LOI date (Apr 19), touchdown
  Apr 21 — consistent (LOI treated as "arrival"). Launch 1972-04-16. Correct.

## Apollo 17 — PASS (1 LOW internal inconsistency)

- **[LOW] LRV distance 35.7 vs 35.9 km — internal inconsistency.**
  Overlay description + base header context use **35.7 km**; base
  `flight.events[]` descent_start description says **"35.9 km total."** Both
  figures are cited by official sources (Wikipedia 35.7; NASA GSFC 35.9), so
  neither is "wrong," but the two files disagree. Pick one for consistency
  (35.7 km is the more commonly cited). Confidence: high.
  Source: https://en.wikipedia.org/wiki/Apollo_17 ;
  https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html
- **[—] Samples 110.5 kg, surface 75 h, EVA total 22 h 04 m, Cernan+Schmitt,
  Schmitt only geologist/scientist, last crewed landing Dec 1972, only night
  launch, Taurus-Littrow, orange glass at Shorty Crater, Cernan's closing quote —
  VERIFIED.** All correct. Confidence: high.
- Note: base header `type`/overlay say "last crewed lunar landing" — still true
  as of 2026-07 (Artemis III not yet flown). The base description phrase "last
  crewed lunar landing of the 20th century" is a weaker/safe framing; overlay
  "last crewed mission to the Moon" is also accurate. No conflict.

---

### Cross-cutting note
Every base `delta_v: "~6 km/s (round trip)"` header is a rough
order-of-magnitude figure and is internally superseded by the more precise
`flight.totals.total_dv_km_s` (7.2–7.3) where present — not flagged as an error
(different granularity, both labelled). Parking-orbit / arrival altitudes in the
cislunar profiles are reconstructed (source_tier labelled) and within accepted
ranges.
