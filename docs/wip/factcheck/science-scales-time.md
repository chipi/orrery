# Fact-check — SCIENCE overlays: Scales & Time

Independent skeptical review of the 8 `scales-time` overlays. Every constant and
definition cross-checked against the web. Severity: 🔴 critical (wrong fact that
misleads) · 🟠 significant (wrong/stale number) · 🟡 minor (imprecise, defensible) ·
🔵 nit (style / borderline).

**Reviewer stance:** museum-grade neutrality; assume wrong until verified.

## Per-overlay verdicts

| Overlay | Verdict | Findings |
|---|---|---|
| `_intro` | PASS (1 minor) | 🟡×1 |
| `au` | PASS w/ 1 stale number | 🟠×1 |
| `ecliptic-plane` | ⚠️ 1 real error | 🔴×1, 🟡×1 |
| `frames` | PASS | 🔵×1 |
| `j2000` | ⚠️ definitional error (UTC vs TT) | 🟠×1, 🟡×1 |
| `light-minute` | ⚠️ stale Voyager numbers | 🟠×2, 🟡×1 |
| `long-duration` | PASS (numbers defensible) | 🟡×2, 🔵×1 |
| `sidereal-synodic` | PASS | 🟡×1 |

**Totals:** 🔴 1 · 🟠 4 · 🟡 7 · 🔵 3  — 15 findings across 8 overlays.

Nothing catastrophic. One genuine 🔴 (Pluto demotion causal claim). The recurring
theme is **stale Voyager 1 distance/light-time** (appears in `au` + `light-minute`)
and the **J2000 "noon UTC" vs "noon TT"** definitional slip.

---

## `_intro.json`

Verdict: **PASS** (1 minor).

### 🟡 Saturn "1.4 billion" km — rounding, fine; but "Pluto is 6 billion" is perihelion-ish, not average
- **Field:** `paragraphs[0]`
- **Quote:** "Mars is 200 million km away. Saturn is 1.4 billion. Pluto is 6 billion."
- **Issue:** Pluto's *average* distance is ~5.9 billion km (39.5 AU), so "6 billion" is
  fine as a round number. Mars "200 million km" is a typical opposition-era distance,
  not the semi-major axis (~228 M km / 1.52 AU); as a felt-distance hook it reads OK.
  No correction needed — flagging only that these are illustrative, not definitional.
- **Correction:** none required; numbers are within honest rounding.
- **Source:** https://science.nasa.gov/dwarf-planets/pluto/facts/ (39.5 AU avg)
- **Confidence:** high.

Constants that check out: Mars 1.5 AU ✓, Jupiter 5 AU ✓, Pluto 30–50 AU ✓,
Mars round-trip signal 4–22 min ✓, Mars windows every 26 months ✓, sidereal≠synodic
framing ✓, ecliptic disc ✓.

---

## `au.json`

Verdict: **PASS**, one stale number.

### 🟠 Voyager 1 "around 165 AU now" — stale; it is ~172 AU as of 2026
- **Field:** `narrative_101[1]`
- **Quote:** "Voyager 1, the most distant human-made object, is around 165 AU now and still going."
- **Issue:** As of early/mid-2026 Voyager 1 is ~172.6 AU from the Sun (~172 AU from
  Earth), approaching the 1-light-day milestone in Nov 2026. "165 AU" is a few years
  stale (that was ~2021–22). `body_paragraphs[1]` hedges correctly ("well past 150 AU")
  — but the `narrative_101` "165 AU" is a specific stale figure.
- **Correction:** "around 170 AU now" (or "past 170 AU"). Round to avoid re-staling.
- **Source:** https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/ ;
  https://en.wikipedia.org/wiki/Voyager_1 (172.59 AU, March 2026)
- **Confidence:** high.

Constants that check out:
- AU = **149,597,870,700 m exactly**, fixed by the IAU in 2012 ✓ (both `intro_sentence`
  and `body_paragraphs[0]` correct — resolution B2, IAU 2012).
- Pre-2012 AU tied to Earth's orbit / Gaussian gravitational constant ✓.
- Planet semi-major axes: Mercury 0.39 ✓, Venus 0.72 ✓, Earth 1.0 ✓, Mars 1.52 ✓,
  Jupiter 5.20 ✓, Saturn 9.58 ✓, Uranus 19.22 ✓, Neptune 30.05 ✓, Pluto 39.5 ✓.
  All match NASA fact-sheet AU values.
- Oort Cloud "tens of thousands of AU" ✓ (~2,000–100,000 AU).

---

## `ecliptic-plane.json`

Verdict: **⚠️ one real causal error.**

### 🔴 Pluto was NOT demoted "because" its orbit is inclined 17°
- **Field:** `narrative_101[2]`
- **Quote:** "Pluto orbits at 17 degrees off-plane, which is one reason it got demoted
  to dwarf planet — the eight \"real\" planets are all in line."
- **Issue:** This is factually wrong on causation. Pluto's 2006 IAU reclassification
  turned on the third planet criterion — it has **not cleared its orbital neighbourhood**
  (it shares the Kuiper Belt / resonance zone with many bodies). Orbital *inclination*
  played **no role** in the definition. Presenting a 17° tilt as "one reason" for the
  demotion is a museum-grade factual error and should be cut. (The 17° inclination is
  itself correct — Pluto's inclination to the ecliptic is 17.1°.)
- **Correction:** Drop the causal clause. E.g.: "Pluto orbits at 17 degrees off-plane —
  by far the most tilted of the classical nine. (Its 2006 reclassification was about not
  clearing its orbital neighbourhood, not its tilt.)"
- **Source:** https://www.iau.org/public/themes/pluto/ (IAU Resolution B5, 2006 — three
  criteria: orbits Sun, near-round, *has cleared the neighbourhood*).
- **Confidence:** high.

### 🟡 "vernal equinox … where the ecliptic crosses Earth's equator going north" — OK, but it's the *celestial* equator
- **Field:** `body_paragraphs[1]`
- **Quote:** "The vernal equinox direction — where the ecliptic crosses Earth's equator
  going north — is the zero-longitude reference…"
- **Issue:** The crossing is of the **celestial equator** (projection of Earth's equator
  onto the sky), not "Earth's equator" as a physical surface. Minor but a precise atlas
  should say celestial equator. Also this direction anchors *ecliptic longitude* /
  right-ascension zero; describing it as the reference for "longitude of ascending node
  and argument of periapsis" is loosely right (♈ is the reference direction) — OK.
- **Correction:** "where the ecliptic crosses the **celestial** equator going north."
- **Source:** https://en.wikipedia.org/wiki/March_equinox ; https://en.wikipedia.org/wiki/Ecliptic_coordinate_system
- **Confidence:** high.

Constants that check out: 8 planets within a few degrees of ecliptic ✓; Moon orbit ~5°
off ecliptic ✓; Mercury inclination 7° ✓; Pluto inclination 17° ✓; ecliptic = plane of
Earth's orbit / apparent solar path ✓; Earth inclination 0° by construction ✓; disc-origin
("fossil of formation") ✓.
Note: no explicit obliquity (23.4°) figure appears in this overlay — the overlay correctly
keeps ecliptic-vs-orbit-plane distinct and never conflates the 23.4° axial tilt with it.

---

## `frames.json`

Verdict: **PASS.**

### 🔵 "Geocentric … possibly a rotation (Earth's axial tilt)" — frame nuance
- **Field:** `body_paragraphs[1]`
- **Quote:** "Geocentric coordinates relate to heliocentric by a translation (Earth's
  heliocentric position) and possibly a rotation (Earth's axial tilt)."
- **Issue:** Slightly loose but defensible. Heliocentric-ecliptic → geocentric-*equatorial*
  does involve a ~23.4° rotation (obliquity); heliocentric-ecliptic → geocentric-*ecliptic*
  is translation only. The "possibly a rotation" hedge is honest. No change required.
- **Correction:** none (optional: "a rotation by the obliquity if you also switch to
  equatorial axes").
- **Source:** https://en.wikipedia.org/wiki/Ecliptic_coordinate_system
- **Confidence:** medium (interpretation-dependent).

Definitions check out: heliocentric = Sun origin ✓; geocentric = Earth origin ✓;
body-centric = target-body origin ✓; patched-conics handoff at sphere-of-influence ✓;
frame = choice of origin ✓. All standard astrodynamics. Note the overlay uses plain-English
frame names (heliocentric/geocentric/body-centric) rather than the formal ICRF/ECI/ECEF
labels — that's an editorial choice, not an error; the concepts map cleanly.

---

## `j2000.json`

Verdict: **⚠️ definitional error — J2000 is noon TT, not noon UTC.**

### 🟠 J2000 is defined at 12:00 **TT** (Terrestrial Time), not "noon UTC"
- **Field:** `intro_sentence`, `narrative_101[0]`, `body_paragraphs[0]`
- **Quote:** "12:00 noon UTC on January 1, 2000" (intro_sentence); "noon UTC on January 1,
  2000. That's J2000." (narrative_101[0]); "The standard answer is J2000: noon UTC on
  January 1, 2000." (body_paragraphs[0]).
- **Issue:** By IAU definition J2000.0 = **2000 Jan 1, 12:00 TT** = JD 2451545.0 TT. In
  UTC that instant is 2000 Jan 1, **11:58:55.816 UTC** (~64 s earlier). The overlay says
  "noon UTC" in three places. For a museum-grade astronomy atlas that repeatedly leans on
  "the exact agreed zero moment," stating the wrong time scale is a genuine definitional
  error, not a nit. (The ~64 s offset = TT−UTC ≈ 32.184 s + leap-second count at 2000.)
- **Correction:** "12:00 TT (Terrestrial Time) on January 1, 2000" — optionally note it's
  ~11:59 UTC. If the audience-level simplification to UTC is deliberate, at minimum drop
  the false precision of "noon UTC" and say "around noon, Jan 1 2000 (formally 12:00 TT)."
- **Source:** https://en.wikipedia.org/wiki/Epoch_(astronomy) (J2000 = 2451545.0 TT =
  2000-01-01 11:58:55.816 UTC); https://aa.usno.navy.mil/faq/TT
- **Confidence:** high.

### 🟡 Julian Day epoch "noon UTC on January 1, 4713 BC" — anachronistic time scale
- **Field:** `narrative_101[1]`, `body_paragraphs[1]`
- **Quote:** "the Julian Day count … has always ticked over at noon"; "starting at noon UTC
  on January 1, 4713 BC."
- **Issue:** The JD epoch predates UTC by millennia; it is conventionally Greenwich mean
  **noon** (Universal Time), and the year is −4712 (astronomical) = 4713 BC (proleptic
  Julian calendar). Calling it "noon UTC" is anachronistic; "noon (Universal/Greenwich mean
  time)" is the honest phrasing. The "noon, not midnight" reasoning is correct ✓.
- **Correction:** "noon Universal Time on January 1, 4713 BC (proleptic Julian calendar)."
- **Source:** https://en.wikipedia.org/wiki/Julian_day
- **Confidence:** high.

Constants that check out: J2000 = **JD 2,451,545.0** ✓ (clean integer, correct); Julian Day
count starts noon (not midnight) so observers avoid a mid-night date change ✓; 4713 BC start
year ✓; orbital elements drift / precession requiring an epoch ✓; mean motion n = 2π/T ✓.

---

## `light-minute.json`

Verdict: **⚠️ stale Voyager numbers + rounding to watch.**

### 🟠 Voyager 1 one-way light delay "about 22.5 hours" — stale; it is ~23.5 h in 2026
- **Field:** `narrative_101[2]`
- **Quote:** "Out at Voyager-1 distance (around 165 AU now), one-way light delay is about
  22.5 hours."
- **Issue:** Both numbers are stale. As of 2026 Voyager 1 is ~172 AU and one-way light
  time is ~23.5–23.6 hours (it reaches the **one-light-day**, i.e. 24 h, milestone in
  Nov 2026). "22.5 hours / 165 AU" was true around 2021–22. Same stale figure as `au.json`.
- **Correction:** "around 170 AU now, one-way light delay about 23.5 hours (it hits one
  full light-day — 24 hours — in late 2026)." The 2026 milestone is a great hook to use.
- **Source:** https://www.cnn.com/2025/12/09/science/voyager-1-light-day-earth ;
  https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/
- **Confidence:** high.

### 🟠 `body_paragraphs[1]` "Voyager 1 at 22.5 light-hours" — same stale figure
- **Field:** `body_paragraphs[1]`
- **Quote:** "Far enough out (Voyager 1 at 22.5 light-hours) you're sending one-way nudges
  that arrive almost a day later."
- **Issue:** Same as above — ~23.5 light-hours in 2026, not 22.5. Fix both occurrences.
- **Correction:** "Voyager 1 at ~23.5 light-hours."
- **Source:** as above.
- **Confidence:** high.

### 🟡 "165 AU → 22.5 h light delay" is also internally low
- **Field:** `narrative_101[2]`
- **Issue:** Even at the stated 165 AU the one-way light time is ~22.9 h (165 AU × 8.317
  min/AU ÷ 60 ≈ 22.9 h), so "22.5 h" slightly under-shoots even its own distance. Moot once
  the distance is refreshed to ~170 AU (~23.6 h).
- **Correction:** subsumed by the two 🟠 fixes above.
- **Confidence:** high.

Constants that check out:
- Speed of light ~300,000 km/s ✓ (299,792 km/s).
- Light-minute ≈ 18 million km ✓ (17.99×10⁶ km; matches the prompt's ~1.8×10⁷ km).
- Light-second = 300,000 km ✓.
- **1 AU ≈ 8.3 light-minutes** ✓ (8.317 min — exact: 499.0 light-seconds).
- Sun 8.3 light-minutes away ✓.
- Mars 4–22 light-minutes ✓ (matches Mars light-time range 3–22 min; overlay says 4–22
  which is fine for the practical minimum near opposition).
- Light-year = 9.46 trillion km ✓ (9.461×10¹² km).
- Proxima Centauri 4.2 light-years ✓ (4.2465 ly).
- Voyager 1 speed ~17 km/s ✓ (~16.9–17 km/s heliocentric).
- "~70,000 years to Proxima at Voyager's speed" ✓ (order-of-magnitude correct).

---

## `long-duration.json`

Verdict: **PASS** — all headline numbers defensible against the literature.

### 🟡 "heart shrinks by ~9.4% in volume during 6-month missions" — plausible but not the canonical figure
- **Field:** `body_paragraphs[1]`
- **Quote:** "heart shrinks by ~9.4% in volume during 6-month missions"
- **Issue:** The literature has a spread: older echocardiographic studies report ~9.1%
  (recovered by day 3 post-flight) and ~12±6.9% (10-day flights) LV **mass** decrease;
  the widely-cited Scott Kelly *Circulation* study (340 d) found LV mass loss ~0.74 g/week
  (often reported ~27% cumulative for his left ventricle over the year). "9.4%" isn't a
  number I can source to a specific 6-month-mission study — it sits between the 9.1% and 12%
  values. Defensible but slightly false-precision. Note "volume" vs "mass" is also loose
  (studies report mass).
- **Correction:** Soften to "the heart's left ventricle loses roughly 9–12% of its mass over
  a 6-month mission" (and say **mass**, not volume), or cite the Kelly figure explicitly.
- **Source:** https://pubmed.ncbi.nlm.nih.gov/11457776/ (12±6.9%); UT Southwestern /
  *Circulation* 2021 Kelly study (0.74 g/week).
- **Confidence:** medium (the exact 9.4% is unsourced; the range is right).

### 🟡 "GCR accumulate at ~0.5 mSv/day in LEO — about 100× sea level"
- **Field:** `narrative_101[2]`
- **Quote:** "radiation (Galactic Cosmic Rays accumulate at ~0.5 mSv/day in LEO — about
  100× sea level)"
- **Issue:** ~0.5 mSv/day on the ISS is a commonly-cited figure (ISS crews receive
  ~150–300 mSv/6 months depending on solar cycle / altitude), consistent with the overlay's
  own "~150–180 mSv per 6-month mission" in body_paragraphs[3]. Sea-level background is
  ~2.4 mSv/**year** ≈ 0.0066 mSv/day, so 0.5 mSv/day is ~**75×** daily background, not
  exactly 100× — but "about 100×" is a fair order-of-magnitude. Also the dose is not purely
  GCR (trapped-belt/SAA protons contribute in LEO). Minor.
- **Correction:** optional — "roughly 100× the natural background rate at sea level" is
  acceptable as an order-of-magnitude; tighten to "~75×" if precision is wanted.
- **Source:** https://www.nasa.gov/ (ISS dose ~0.3–0.8 mSv/day); UNSCEAR background 2.4 mSv/yr.
- **Confidence:** medium.

### 🔵 Records block — all correct
- **Field:** `narrative_101[1]`, `body_paragraphs[4]`
- **Verified:** Frank Rubio **371 days** (Sep 2022–Sep 2023), US/ISS single-mission record ✓;
  Valeri Polyakov **437.7 days** (Mir, 1994–95), all-time single-flight record ✓; Vande Hei
  **355 days** (2021–22) ✓; Kononenko cumulative >1000 d across 5 missions ✓ (passed 1000
  cumulative days in 2024). Tiangong ~6-month rotations ✓.
- **Source:** https://en.wikipedia.org/wiki/Francisco_Rubio_(astronaut) ;
  https://www.nasa.gov/international-space-station/space-station-astronaut-record-holders/
- **Confidence:** high.

Other constants check out: bone loss 1–2%/month without countermeasures ✓; ~0.5%/month with
ARED + bisphosphonate ✓; ~2 L cephalad fluid shift ✓; SANS description ✓; NASA 3%-excess-
cancer-mortality career limit framework ✓; re-adaptation hours-to-days ✓; the "three-month
threshold" framing ✓.

---

## `sidereal-synodic.json`

Verdict: **PASS.**

### 🟡 Synodic math rounds to "2.14 yr" then labels it "≈ 26 months" — 2.14 yr = 25.7 months
- **Field:** `body_paragraphs[2]`
- **Quote:** "1/T_syn = 1 − 1/1.88 = 0.468, so T_syn = 2.14 yr ≈ 26 months."
- **Issue:** Arithmetic is right (1 − 1/1.88 = 0.4681; 1/0.4681 = 2.136 yr). 2.136 yr ×
  12 = **25.6 months**, which is what rounds to ~26 months and matches the standard 779.9-day
  (25.6-month) Mars synodic period. So "≈ 26 months" is correct rounding — just note 780 d is
  25.6 months, and the overlay elsewhere says "26 months" consistently. No error; the "26
  months" label is the conventional rounding of 25.6. Flagging only that 2.14 yr is 25.7
  months, so the "≈ 26" is a round-up, not exact.
- **Correction:** none required; optionally "≈ 25.6 months (≈ 26)."
- **Source:** https://en.wikipedia.org/wiki/Exploration_of_Mars (synodic 779.9 d) ; synodic
  formula verified.
- **Confidence:** high.

Constants that check out: Mars sidereal period **687 Earth days** ✓; Mars synodic period
**780 days ≈ 26 months** ✓ (779.9 d); synodic formula 1/T_syn = 1/T_inner − 1/T_outer ✓
(correct form for inner=Earth, outer=Mars); Mars year 1.88 yr ✓; launch windows every 26
months / miss-one-wait-two-years ✓; Curiosity 2011 ✓, Perseverance 2020 ✓, next window 2026
✓ (Mars 2026 window ~late 2026 / opposition Feb 2027 era — correct); sidereal = vs fixed
stars ✓; synodic = vs another body's alignment ✓; Kepler-3 / vis-viva work in sidereal time ✓.

---

## Cross-overlay notes

1. **Voyager 1 staleness is the single recurring factual issue** — "165 AU" (au) and "22.5
   hours / 165 AU" (light-minute) both lag reality by ~3–4 years. In 2026 it's ~172 AU and
   ~23.5 light-hours, hitting one light-day in Nov 2026. Fixing both refreshes two overlays
   and unlocks a strong "one light-day" hook.
2. **J2000 "noon UTC" should be "noon TT"** — the ~64 s difference is pedantic but this is
   exactly the kind of definition a science atlas is expected to get right, and it appears
   three times in one overlay.
3. Prompt's requested spot-checks all land clean: AU = 149,597,870,700 m ✓; light-minute
   ~1.8×10⁷ km ✓; Sun light-time ~8.3 min ✓; Mars 3–22 min ✓; J2000 = JD 2451545.0 ✓;
   ecliptic obliquity concept (23.4° axial tilt kept distinct) ✓; sidereal day 23h56m
   (not directly stated in these overlays) ✓ where referenced; sidereal vs synodic Mars
   687 vs 780 d ✓. **Pluto ~4.5 h light-time is not stated in any of these overlays** (only
   Sun/Mars/Voyager appear) — no claim to check there.
