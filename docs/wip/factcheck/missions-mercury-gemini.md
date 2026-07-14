# Fact-check — Earth-orbit crewed missions (Mercury + Gemini)

Reviewer: science-reviewer (independent, web-verified)
Date: 2026-07-14
Scope: 12 missions — prose overlay (`i18n-src/en-US/missions/earth/<slug>.json`) +
base data (`static/data/missions/earth/<slug>.json`).
Method: assume-wrong-until-verified; every date/crew/first/quantity web-checked.

## Per-mission verdicts

| Mission | Verdict | Highest severity |
|---|---|---|
| freedom-7 | PASS | — |
| liberty-bell-7 | FAIL | HIGH (wrong vehicle designation MR-8, should be MR-4) |
| friendship-7 | PASS | LOW (orbit-apogee value) |
| aurora-7 | PASS | — |
| sigma-7 | PASS (minor) | LOW (splashdown distance) |
| faith-7 | PASS | — |
| gemini3 | PASS | — |
| gemini4 | PASS (minor) | LOW (EVA duration) |
| gemini6a | PASS | — |
| gemini7 | PASS | — |
| gemini8 | PASS | — |
| gemini12 | PASS (minor) | LOW (duration precision) |

**Counts:** HIGH 1 · MED 0 · LOW 4 · total flagged missions 5 (1 fail, 4 minor).

---

## freedom-7 — PASS

All claims verified.
- Date 1961-05-05, MR-3, LC-5, Shepard, first American in space, suborbital ✓
- Apogee 187 km ✓ (NASA: 187.5 km); max-g 11.6 g ✓; downrange 487 km ✓
  (NASA: 487.3 km); USS Lake Champlain recovery ✓.
- "23 days after Gagarin" (Apr 12 → May 5 = 23 days) ✓; dispatch "three weeks"
  and "Twenty days later" (Kennedy Moon speech May 25 = 20 days) ✓ — consistent.
- Source: https://en.wikipedia.org/wiki/Mercury-Redstone_3 ; https://www.nasa.gov/mission/mercury-redstone-3-freedom-7/
- Confidence: high.

---

## liberty-bell-7 — FAIL

### HIGH — wrong launch-vehicle designation (MR-8 should be MR-4)
- File: `static/data/missions/earth/liberty-bell-7.json`
- Field: `vehicle`
- Quote: `"vehicle": "Mercury-Redstone (MR-8)"`
- Wrong: Liberty Bell 7 flew on **Mercury-Redstone 4 (MR-4)**, not MR-8. The prose
  `name` field correctly says "Liberty Bell 7 / MR-4", and the linked Wikipedia
  article is "Mercury-Redstone 4" — the base-data designation contradicts both.
  (MR-8 does not correspond to any crewed Mercury flight; MR-3 = Freedom 7,
  MR-4 = Liberty Bell 7.) The Redstone *booster* serial happened to be MRLV-8,
  which is likely the source of the confusion — but the *mission/flight*
  designation is MR-4.
- Also: File `i18n-src/en-US/missions/earth/liberty-bell-7.json`, field
  `events[0].note`: `"MR-8 from Cape Canaveral LC-5 1961-07-21 12:20 UTC."` —
  same MR-8 error; should read MR-4.
- Correction: change `vehicle` to `"Mercury-Redstone 4 (MR-4)"` and the launch
  event note to `"MR-4 ..."`.
- Source: https://en.wikipedia.org/wiki/Mercury-Redstone_4 ;
  https://www.nasa.gov/mission/mercury-redstone-4-liberty-bell-7/
- Confidence: high.

### Verified OK (same mission)
- Date 1961-07-21, LC-5, Grissom, capsule #11, apogee 190 km (NASA 190.4 km),
  downrange 480 km (NASA 486 km) ✓; hatch blew after splashdown, capsule sank
  ~4900 m ✓; recovered 1999-07-20 by Oceaneering ✓; Cosmosphere, Hutchinson KS ✓.
- "first flight to feature an explosive escape hatch" ✓ (Freedom 7 used a
  mechanically-latched side hatch; the explosive hatch debuted on Liberty Bell 7).
- Grissom recovery ship USS Randolph ✓ (Grissom lifted by Randolph's helicopter;
  capsule not recovered until 1999 — the event note "Grissom escaped; recovered
  by USS Randolph" is accurate for the *man*, not the capsule).

---

## friendship-7 — PASS

- Date 1962-02-20, Atlas LV-3B (MA-6), LC-14, Glenn, first American to orbit,
  3 orbits, inclination 32.5° (NASA 32.54°) ✓
- Duration 4 h 55 min (NASA 4:55:23) ✓; USS Noa recovery ✓; ~1287 km SE of
  Cape Canaveral (NASA "~800 mi SE" ≈ 1287 km) ✓; STS-95 1998 return at 77 ✓;
  NASM display ✓; retropack-kept-on / "fireflies" narrative ✓.

### LOW — orbit apogee value slightly high vs NASA figure
- File: `i18n-src/en-US/missions/earth/friendship-7.json` (and base is unaffected)
- Field: `description` / `events[].note`
- Quote: `"Orbit: 159 × 265 km"`
- Note: NASA/press figures give perigee ~160 km and apogee ~260–265 km
  (statute-mile sources: "100 × 162 mi" = 161 × 261 km). 159 × 265 km is within
  rounding of published values; not an error, flagged only for awareness.
- Source: https://en.wikipedia.org/wiki/Mercury-Atlas_6
- Confidence: high (claim acceptable).

---

## aurora-7 — PASS

- Date 1962-05-24, Atlas LV-3B (MA-7), LC-14, Carpenter, 3 orbits ✓
- ~25° off retro-attitude, overshoot ~400 km (NASA "250 mi" = 402 km) ✓;
  ~1 h recovery delay ("1 h 7 min") ✓; Carpenter never flew again ✓;
  Museum of Science and Industry, Chicago display ✓.
- Orbit 161 × 268 km — consistent with published values ✓.
- Source: https://en.wikipedia.org/wiki/Mercury-Atlas_7 ;
  https://www.nasa.gov/history/60-years-ago-scott-carpenter-orbits-the-earth-aboard-aurora-7/
- Confidence: high.

---

## sigma-7 — PASS (minor)

- Date 1962-10-03, Atlas LV-3B (MA-8), LC-14, Schirra, 6 orbits ✓;
  duration 9 h 13 min (NASA 9:13:11) ✓; first Mercury Pacific recovery ✓;
  USS Kearsarge; consumable-conservation "textbook" narrative ✓.

### LOW — splashdown distance from Midway
- File: `i18n-src/en-US/missions/earth/sigma-7.json`
- Field: `description` / `events[2].note`
- Quote: `"480 km NE of Midway"`
- Note: NASA gives "275 mi NE of Midway" = ~443 km, not 480 km. Discrepancy ~37 km
  / ~8%. Minor; recommend aligning to ~445 km (275 mi) if precision matters.
- Source: https://www.nasa.gov/mission/mercury-atlas-8-sigma-7/
- Confidence: medium (some sources round differently).

Note: the "38 kg vs 32 kg attitude gas" comparison in the description was not
independently verifiable in the search pass; plausible but unconfirmed — low
priority to source before relying on it.

---

## faith-7 — PASS

- Date 1963-05-15, Atlas LV-3B (MA-9), LC-14, Cooper, 22 orbits ✓;
  duration 34 h 19 min ✓; last Mercury + last solo US spaceflight ✓;
  power failure → manual re-entry ✓; ~7 km from target (NASA "4 mi from
  Kearsarge" ≈ 6.4 km) ✓; USS Kearsarge ✓; Space Center Houston display ✓.
- Source: https://en.wikipedia.org/wiki/Mercury-Atlas_9 ;
  https://www.nasa.gov/mission/mercury-atlas-9-faith-7/
- Confidence: high.

---

## gemini3 — PASS

- Date 1965-03-23, Titan II GLV (GT-3), LC-19, Grissom & Young, 3 orbits ✓;
  first crewed orbital maneuver ✓; "Molly Brown" nickname ✓;
  duration 4 h 52 m (mission "just under 5 h") ✓; Atlantic splashdown ✓.
- Source: https://www.nasa.gov/mission/gemini-iii/ ;
  https://en.wikipedia.org/wiki/Gemini_3
- Confidence: high.

---

## gemini4 — PASS (minor)

- Date 1965-06-03, Titan II GLV (GT-4), LC-19, McDivitt & White, 4 days /
  62 orbits ✓; first *American* EVA (correctly qualified — dispatch notes the
  Soviets/Leonov made the first spacewalk earlier) ✓; tethered, handheld
  maneuvering gun ✓.
- "First American spacewalk" superlative is dated + true ✓; the "American" (not
  "first ever") framing is correct.

### LOW — EVA duration & "ten weeks after Leonov"
- File: `i18n-src/en-US/missions/earth/gemini4.json`
- Field: `description` / `events[1].note` — `"~21 min"` /
  `dispatch` — `"ten weeks earlier"`
- Note: White's EVA is most commonly cited as ~23 min (hatch-open to hatch-close
  ~36 min; free-EVA ~20–21 min). "~21 min" is defensible but many sources say 23
  min — consider "~20–23 min" if you want to be unimpeachable. Leonov's EVA was
  1965-03-18; White's 1965-06-03 = ~77 days = 11 weeks, not "ten." Both are
  low-severity roundings.
- Source: https://www.drewexmachina.com/2015/06/03/the-forgotten-mission-of-gemini-4/
- Confidence: medium.

---

## gemini6a — PASS

- Date 1965-12-15 (launch 13:37 UTC = 8:37 EST) ✓; Titan II GLV (GT-6A), LC-19,
  Schirra & Stafford ✓; first crewed rendezvous, station-keeping ~30 cm (≈ 1 ft)
  from Gemini 7 ✓; pad engine shutdown 1965-12-12, Schirra did not eject ✓;
  16 orbits / ~1 d 1 h ✓.
- Source: https://en.wikipedia.org/wiki/Gemini_6A ;
  https://airandspace.si.edu/stories/editorial/worlds-first-space-rendezvous
- Confidence: high.

---

## gemini7 — PASS

- Date 1965-12-04, Titan II GLV (GT-7), LC-19, Borman & Lovell ✓;
  14 days / 206 orbits ✓ (longest crewed flight to that date) ✓;
  served as rendezvous target for Gemini 6A ✓; lunar-duration demonstration ✓.
- Source: https://en.wikipedia.org/wiki/Gemini_7 ;
  https://www.nasa.gov/mission/gemini-vii/
- Confidence: high.

---

## gemini8 — PASS

- Date 1966-03-16, Titan II GLV (GT-8), LC-19, Armstrong & Scott ✓;
  first docking of two spacecraft (with uncrewed Agena target) — correctly stated
  as "first docking of two spacecraft" ✓; stuck OAMS thruster → ~1 rev/s tumble ✓;
  Armstrong undocked, recovered with reentry-control system ✓; emergency Pacific
  splashdown after 10 h 41 m ✓; Armstrong's first flight ✓.
- (Recovery ship USS Leonard F. Mason — not claimed in editorial, so no error.)
- Source: https://www.nasa.gov/mission/gemini-viii/ ;
  https://en.wikipedia.org/wiki/Gemini_8
- Confidence: high.

---

## gemini12 — PASS (minor)

- Date 1966-11-11 (launch 20:46 UTC = 3:46 EST) ✓; Titan II GLV (GT-12), LC-19,
  Lovell & Aldrin, final Gemini ✓; three EVAs totalling 5 h 30 m ✓;
  underwater training + handholds/foot restraints "solved EVA" narrative ✓;
  59 orbits ✓; Atlantic (Western Atlantic) splashdown ✓.

### LOW — "4 days" rounding
- File: `i18n-src/en-US/missions/earth/gemini12.json`
- Field: `events[2].note`
- Quote: `"Atlantic splashdown after 4 days / 59 orbits"`
- Note: actual mission was 3 d 22 h 34 m — rounds to ~4 days, acceptable
  shorthand. Flagged only for precision.
- Source: https://en.wikipedia.org/wiki/Gemini_12
- Confidence: high (claim acceptable).

---

## Summary of actionable fixes

1. **HIGH — liberty-bell-7**: base `vehicle` "MR-8" → "Mercury-Redstone 4 (MR-4)";
   launch event note "MR-8" → "MR-4". (Contradicts own `name` field + linked WP.)
2. LOW — sigma-7: "480 km NE of Midway" → ~445 km (275 mi) per NASA.
3. LOW — gemini4: "~21 min" EVA acceptable but 23 min is the common figure;
   "ten weeks" after Leonov → ~11 weeks.
4. LOW — friendship-7 orbit (159×265) and gemini12 "4 days" are within rounding —
   no change required.
