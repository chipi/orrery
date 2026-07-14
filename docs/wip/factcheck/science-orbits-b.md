# Science fact-check — orbits, batch B

Independent skeptical review of 8 SCIENCE overlays under
`i18n-src/en-US/science/orbits/`. No base overlays present (empty dir), so
en-US is the sole source. **Reviewer did not edit any overlay** — findings only.

Severity legend: 🔴 wrong physics/formula · 🟠 wrong number/fact · 🟡
misleading/imprecise · 🔵 nitpick/polish.

## Per-overlay verdicts

| Overlay | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| lagrange-points | PASS (minor) | 0 | 0 | 1 | 1 |
| orbit-regimes | PASS (minor) | 0 | 1 | 1 | 1 |
| semi-major-axis | PASS | 0 | 0 | 0 | 1 |
| space-debris | REVIEW | 0 | 2 | 2 | 1 |
| special-orbits | REVIEW | 1 | 0 | 1 | 0 |
| sun-synchronous | PASS (minor) | 0 | 0 | 1 | 1 |
| true-anomaly | PASS | 0 | 0 | 0 | 0 |
| vis-viva | PASS | 0 | 0 | 0 | 1 |

**Totals: 🔴 1 · 🟠 3 · 🟡 6 · 🔵 6 = 16 findings.**

The single 🔴 (special-orbits: "Molniya repeats twice a day with two apogees,
one over each hemisphere") is a real physics error — both Molniya apogees sit
over the **northern** hemisphere, 180° apart in longitude. Everything else is
number-tightening or wording. Core physics (vis-viva, true anomaly, Kepler,
Lagrange stability, SSO precession, GEO altitude/light-time) is sound.

---

## lagrange-points.json

**Verdict: PASS (minor).** L1/L2/L3 unstable saddles, L4/L5 stable wells, JWST at
Sun–Earth L2 ~1.5M km, Lagrange 1772 — all correct. Spacecraft roster (SOHO/DSCOVR
at SEL1; JWST/Euclid/Gaia/Spektr-RG at SEL2; Herschel+Planck former SEL2; Queqiao/
Gateway at EML2) is accurate.

### 🟡 EML2 distance "~60,000 km past the Moon" is loose
- **Field:** `body_paragraphs[3]` and `diagram_caption`
- **Quote:** "EML2 (~60,000 km past the Moon)"
- **Issue:** Earth–Moon L2 is ~61,500 km beyond the Moon (Hill-radius scale
  ~0.1678 × 384,400 km ≈ 64,500 km; commonly cited 60,000–65,000 km). "~60,000 km"
  is within tolerance but on the low edge; "~65,000 km" is the more standard figure.
- **Correction:** acceptable as-is; "~60–65,000 km" would be tighter.
- **Source:** https://en.wikipedia.org/wiki/Lagrange_point (Earth–Moon L2 ≈ 448,900 km from Earth ⇒ ~64,500 km past Moon)
- **Confidence:** medium

### 🔵 "the most valuable real estate in cislunar space" — editorial, harmless
- **Field:** `narrative_101[0]`
- **Note:** SEL1/SEL2 are technically *not* cislunar (they're 1.5M km out, well
  beyond the Moon's 384,400 km). The sentence conflates Sun–Earth points with
  cislunar. Rhetorical, not a factual claim about a number. Low priority.
- **Confidence:** medium

---

## orbit-regimes.json

**Verdict: PASS (minor).** GEO 35,786 km / sidereal-day period (23h56m04s) / GEO
light-time ~240 ms all correct and well-stated. LEO<2,000 km, ISS 408 km, Hubble
540 km, Starlink ~550 km, GPS 20,200 km, GLONASS 19,100 km, Galileo 23,222 km all
verified. Molniya 63.4° / perigee ~600 / apogee ~40,000 km correct.

### 🟠 "LEO to escape (TLI/TMI) is about 3.2 km/s" is too low
- **Field:** `body_paragraphs[4]`
- **Quote:** "From LEO to escape (TLI/TMI) is about 3.2 km/s — counter-intuitively
  cheaper than reaching GEO from LEO"
- **Issue:** LEO→GEO ≈ 3.9 km/s (correct in the file). But LEO→escape (C3=0) is
  ~3.22 km/s *only for pure escape*; **TLI** (trans-lunar injection) is ~3.1–3.2
  km/s and **TMI** (trans-Mars injection) is ~3.6–3.9 km/s. Lumping TMI at "3.2 km/s"
  understates Mars injection. The headline point (escape can be cheaper than GEO
  because no circularisation) is valid; the number is right for TLI/escape, low for TMI.
- **Correction:** "LEO to escape / TLI is about 3.2 km/s" (drop TMI, or note TMI ~3.6+).
- **Source:** https://en.wikipedia.org/wiki/Delta-v_budget (Earth escape ~3.22 km/s from LEO; TLI ~3.12 km/s)
- **Confidence:** high

### 🟡 MEO "Period ~12 hours" overgeneralised
- **Field:** `body_paragraphs[1]`
- **Quote:** "Period ~12 hours; constellations of 24-30 satellites give global coverage."
- **Issue:** GPS period is ~11h58m (~12h ✓), but Galileo is ~14h and the narrative
  itself says MEO periods span "2–12 hours." Stating a single "~12 hours" for the
  whole band contradicts the 2–12h range given two paragraphs up and excludes Galileo.
- **Correction:** "Periods ~11–14 hours across the navigation band."
- **Source:** https://en.wikipedia.org/wiki/Medium_Earth_orbit
- **Confidence:** high

### 🔵 "Beidou MEO at 21,500 km"
- **Field:** `narrative_101[2]` / `body_paragraphs[1]`
- **Note:** BeiDou-3 MEO ≈ 21,528 km — fine.
- **Confidence:** high

---

## semi-major-axis.json

**Verdict: PASS.** Kepler T²∝a³, a as arithmetic mean of perihelion/aphelion radii,
Earth 1.0 AU / Mars 1.52 AU / Jupiter 5.2 AU, periods 1 yr / 687 d / 11.86 yr — all
correct. Two-tacks-and-string ellipse construction correct.

### 🔵 "average distance from the orbiting body to the focus, kind of"
- **Field:** `body_paragraphs[0]`
- **Note:** Correctly hedged. Precisely, `a` is the time-average of r only to
  first order; it is exactly the mean of perihelion and aphelion radii, and the
  arithmetic mean of the two extremes — which is what the text says. The hedge
  ("kind of") is appropriate. No change needed.
- **Confidence:** high

---

## space-debris.json

**Verdict: REVIEW.** Population counts (~36k ≥10 cm, ~1M 1–10 cm, >100M <1 cm,
~11,000 t total mass), Kessler 1978, FY-1C 2007 / Iridium-Cosmos 2009 / Russian
ASAT 2021 events, tracking infrastructure, ADR missions — nearly all verified.
Two numbers off, two framing issues.

### 🟠 Iridium–Cosmos altitude "776 km" is wrong
- **Field:** `body_paragraphs[1]`
- **Quote:** "collided with Russia's defunct Cosmos at 776 km altitude, generating
  1,800+ trackable fragments"
- **Issue:** The 2009 collision occurred at **789 km** (over the Taymyr Peninsula),
  not 776 km. Also, total catalogued fragments were ~2,296 (Cosmos 2251: 1,668 +
  Iridium 33: 628), so "1,800+" is a true-but-low floor; ~2,300 is the standard
  figure.
- **Correction:** "at 789 km altitude, generating ~2,300 trackable fragments."
- **Source:** https://en.wikipedia.org/wiki/2009_satellite_collision (789 km; 1,668+628 catalogued)
- **Confidence:** high

### 🟠 FY-1C target mass "750 kg" is low
- **Field:** `body_paragraphs[1]`
- **Quote:** "fragmented the 750 kg target into 3,500+ trackable pieces"
- **Issue:** Fengyun-1C's on-orbit mass is generally cited as ~880 kg (launch mass
  ~958 kg). "750 kg" appears in some early sources but is the outlier. Fragment
  count "3,500+" is correct (catalogue grew to ~3,500).
- **Correction:** "~880 kg target" (or "~950 kg launch mass").
- **Source:** https://en.wikipedia.org/wiki/2007_Chinese_anti-satellite_missile_test ; https://en.wikipedia.org/wiki/Fengyun (FY-1C ~880 kg)
- **Confidence:** medium (sources vary 750–958 kg; 880 is the consensus on-orbit figure)

### 🟡 Starlink "performs >50,000/year" understates by ~2×
- **Field:** `body_paragraphs[4]`
- **Quote:** "Starlink's autonomous system performs >50,000/year across the constellation"
- **Issue:** SpaceX's FCC semi-annual report (Dec 2023–May 2024) logged ~50,000
  avoidance maneuvers in **six months**, i.e. ~100,000/year. ">50,000/year" is
  technically true (it is more than 50,000) but reads as the annual total when the
  real annual figure is roughly double.
- **Correction:** "~50,000 per six months (~100,000/year)."
- **Source:** https://www.space.com/spacex-starlink-50000-collision-avoidance-maneuvers-space-safety
- **Confidence:** high

### 🟡 "current cadence is ~0/year" for ADR overstates
- **Field:** `body_paragraphs[4]`
- **Quote:** "removing 5 major LEO objects per year is the minimum to halt growth;
  current cadence is ~0/year"
- **Issue:** The ESA "~5 large objects/year to stabilise" figure is real and well-sourced.
  "~0/year" is rhetorically fine for *operational* removals (ELSA-d and ClearSpace-1
  were demos / not-yet-flown as of the 2024–25 baseline), but it is a rounded
  editorial claim, not a measured stat. Acceptable given the honest "starting to
  ramp" framing elsewhere; flag as opinion-shaped-as-number.
- **Source:** https://www.esa.int/Space_Safety/Clean_Space (5 large objects/yr)
- **Confidence:** medium

### 🔵 "1 cm aluminium fragment at 14 km/s ... kinetic energy of a hand grenade"
- **Field:** `body_paragraphs[0]`
- **Note:** 1 cm Al sphere ≈ 1.4 g; at 14 km/s KE ≈ ½·0.0014·14000² ≈ 137 kJ.
  A hand grenade's explosive energy is ~1–2 MJ chemical but ~kJ delivered as
  fragmentation; the analogy is order-of-magnitude folklore (NASA uses it too).
  Fine as illustrative. No change.
- **Confidence:** low

---

## special-orbits.json

**Verdict: REVIEW.** Molniya (e≈0.74, 12h, 63.4° critical inclination, apsides
locked, 3-sat constellation for >70° latitude), Tundra (24h, e≈0.25, figure-8,
SiriusXM/SBIRS-HEO), GTO (LEO perigee + GEO apogee, ~1.5–1.8 km/s apogee kick,
Kourou 5.2°), frozen orbits (arg. of perigee 90°, J2/J3 balance, ICESat-2/GRACE-FO)
— all correct and well-sourced. One clear physics error.

### 🔴 Molniya "two apogees, one over each hemisphere" is WRONG
- **Field:** `body_paragraphs[1]` (Tundra paragraph, comparing to Molniya)
- **Quote:** "Tundra trades the higher peak elevation of Molniya for full 24-hour
  repeat (Molniya repeats twice a day with two apogees, **one over each hemisphere**)."
- **Issue:** Both of a Molniya satellite's daily apogees lie over the **NORTHERN**
  hemisphere — one over Russia and one over North America, 180° apart in longitude.
  The whole point of the 63.4° critical inclination + arg-of-perigee 270° is to
  **lock apogee over the north** so it never drifts south. "One over each hemisphere"
  inverts the defining feature of the orbit.
- **Correction:** "(Molniya has two apogees per day, both over the northern
  hemisphere — one over Russia, one over North America, 180° apart in longitude)."
- **Source:** https://en.wikipedia.org/wiki/Molniya_orbit ("two apogees per day over
  the northern hemisphere, 180° apart in longitude")
- **Confidence:** high

### 🟡 "Super-synchronous transfer orbit ... used by some Ariane GEO launches"
- **Field:** `body_paragraphs[4]`
- **Quote:** "super-synchronous transfer orbit (apogee above GEO, used by some
  Ariane GEO launches to minimise inclination-change ΔV)"
- **Issue:** Correct in mechanism (raising apogee above GEO lets the plane-change
  burn happen at lower velocity, cutting ΔV). Minor: this is a general commercial-
  GEO technique (Proton, Ariane 5 supersync option), not Ariane-specific. Wording
  implies it's mostly an Ariane thing.
- **Correction:** "used on some GEO launches (Ariane, Proton) to minimise..."
- **Source:** https://en.wikipedia.org/wiki/Geostationary_transfer_orbit#Supersynchronous
- **Confidence:** medium

---

## sun-synchronous.json

**Verdict: PASS (minor).** SSO near-polar 96–99° retrograde, 600–900 km, precession
0.9856°/day matching Earth's 360°/yr orbital motion, J2 equatorial-bulge mechanism,
Sentinel/Landsat/NOAA roster, 130 m/s per degree inclination ΔV — all correct.
Landsat 705 km / 98.2° / 10:00 descending node verified. Vandenberg/Plesetsk
rationale correct.

### 🟡 "extra ~9 km/s of inclination-change ΔV" for Florida→SSO
- **Field:** `body_paragraphs[4]`
- **Quote:** "a typical SSO ascent from Florida (Cape Canaveral, 28.5°N) would cost
  an extra ~9 km/s of inclination-change ΔV — utterly impractical"
- **Issue:** The *number* is right for a pure plane change (28.5°→98.6° ≈ 70°;
  2·7.8·sin(35°) ≈ 8.9 km/s), but the "130 m/s per degree" rule quoted in the same
  paragraph is only valid for **small** angles — extrapolating it linearly to 70°
  (130×70 = 9.1 km/s) is coincidentally close but methodologically wrong, and the
  text presents the linear extrapolation as the derivation. Also, real SSO launches
  don't pay a monolithic 9 km/s plane change; they'd stage it or launch from a
  better site (which the text goes on to say). The "utterly impractical" conclusion
  is correct; the derivation conflates a small-angle rule with a large-angle result.
- **Correction:** note the 130 m/s/deg figure is a small-angle approximation;
  the exact 70° plane change via 2v·sin(Δi/2) ≈ 8.9 km/s.
- **Source:** https://en.wikipedia.org/wiki/Orbital_inclination_change (ΔV = 2v·sin(Δi/2))
- **Confidence:** high

### 🔵 Equatorial bulge "about 21 km extra radius"
- **Field:** `body_paragraphs[1]`
- **Note:** Equatorial radius 6,378 km vs polar 6,357 km ⇒ ~21 km. Correct.
- **Confidence:** high

---

## true-anomaly.json

**Verdict: PASS.** Definition (angle at focus from perihelion to current position),
non-uniform rate via Kepler's 2nd law, 0° at perihelion / 180° at aphelion,
mean/eccentric anomaly relationship, Kepler's equation `M = E − e·sin(E)`, M→E→ν
chain — all correct and precisely stated. Nothing to flag.

---

## vis-viva.json

**Verdict: PASS.** Energy-conservation basis, three inputs (μ, r, a) → speed via one
square root, high at perihelion / low at aphelion, Earth 30.3 km/s perihelion vs
29.3 km/s aphelion — all correct. The prompt's target form v²=GM(2/r − 1/a) is the
standard vis-viva; the overlay describes it correctly in prose (formula rendered via
`formula_caption` + diagram, not inline text, so no typo risk in the JSON).

### 🔵 Earth perihelion/aphelion speeds
- **Field:** `body_paragraphs[1]`
- **Note:** Earth's speed ranges ~30.29 km/s (perihelion) to ~29.29 km/s (aphelion).
  The file's "30.3 / 29.3 km/s" is correct to the stated precision.
- **Source:** https://en.wikipedia.org/wiki/Earth%27s_orbit
- **Confidence:** high

---

## Summary of actionable fixes (highest value first)

1. **🔴 special-orbits** — Molniya apogees are both over the NORTHERN hemisphere,
   not "one over each hemisphere." Real physics error; fix the parenthetical.
2. **🟠 space-debris** — Iridium–Cosmos altitude 789 km (not 776); fragments ~2,300
   (not "1,800+").
3. **🟠 space-debris** — FY-1C mass ~880 kg (not 750 kg).
4. **🟠 orbit-regimes** — "TLI/TMI ~3.2 km/s" is right for TLI/escape but low for
   TMI (~3.6+ km/s); drop TMI or split.
5. **🟡 space-debris** — Starlink ~50,000 maneuvers per **six months** (~100k/yr),
   not "/year".
6. **🟡 orbit-regimes** — MEO period is 11–14 h (Galileo ~14 h), not a flat "~12 h".
7. **🟡 sun-synchronous** — 130 m/s/deg is a small-angle rule; don't linearly
   extrapolate it to a 70° plane change (use 2v·sin(Δi/2)).
8. Remaining 🟡/🔵 are polish (EML2 distance, super-sync attribution, ADR "~0/year"
   framing, cislunar wording).
</content>
</invoke>
