# Science overlays — orbits, batch A — fact-check

Reviewer: science-reviewer (skeptical, web-verified). Do-not-edit review; findings only.
Date: 2026-07-14.
Scope: `i18n-src/en-US/science/orbits/` — `_intro`, `apsides`, `cislunar-orbits`,
`disposal-end-of-life`, `eccentricity`, `hill-sphere`, `inclination`,
`keplerian-orbit`, `keplers-laws`.

Severity key: 🔴 blocker (flatly wrong physics) · 🟠 significant (misleading /
wrong causation) · 🟡 minor (imprecise but defensible) · 🔵 nit (style / clarity).

## Per-overlay verdicts

| Overlay | Verdict | 🔴 | 🟠 | 🟡 | 🔵 |
|---|---|---|---|---|---|
| _intro | PASS | 0 | 0 | 0 | 1 |
| apsides | REVISE | 0 | 2 | 1 | 0 |
| cislunar-orbits | REVISE | 1 | 1 | 0 | 0 |
| disposal-end-of-life | PASS (minor) | 0 | 0 | 1 | 0 |
| eccentricity | PASS | 0 | 0 | 1 | 0 |
| hill-sphere | REVISE | 1 | 1 | 1 | 0 |
| inclination | PASS | 0 | 0 | 0 | 1 |
| keplerian-orbit | PASS | 0 | 0 | 0 | 0 |
| keplers-laws | PASS | 0 | 0 | 0 | 0 |

**Totals: 🔴 2 · 🟠 4 · 🟡 5 · 🔵 2 (13 findings).**

Two hard blockers: the cislunar NRHO perilune/apolune-vs-pole reversal, and the
hill-sphere "1500× weaker" Sun-gravity figure (off by ~30×). Kepler's laws and
the Keplerian-orbit page are clean.

---

## _intro

Verdict: PASS. Physics all correct — "all orbits are ellipses," heavy body at a
focus not the centre, six orbital elements. (Strictly, bound orbits are ellipses;
escape trajectories are parabolic/hyperbolic conics — but in the intro's context
of planets/moons/spacecraft-in-orbit this is fine.)

### 🔵 A1 — "eight sections" / "six numbers … and the master equation (vis-viva)"
- File: `_intro.json` · `paragraphs[1]`, `paragraphs[2]`
- Quote: "Six numbers … describe any orbit perfectly. The eight sections in this
  tab unpack each of those numbers…"
- Issue: Consistency/clerical, not physics. The directory holds 17 overlays, and
  vis-viva is an equation, not one of the six elements, so "eight sections …
  unpack each of those numbers" is loose. Not a physics error.
- Correction: reconcile the section count with the actual tab contents; keep
  vis-viva described as the tying-together equation (as it already is).
- Confidence: high (structural, self-evident from the file list).

---

## apsides

Verdict: REVISE. Core definitions correct (apsis, line of apsides through both
foci, per-body naming). Two burn-location claims are wrong / self-contradictory.

### 🟠 A2 — internal contradiction: raise orbit at low point vs. "ISS reboost at apogee"
- File: `apsides.json` · `narrative_101[1]` vs `body_paragraphs[2]`
- Quote 1 (correct): "to raise your orbit you fire at the low point."
- Quote 2 (wrong): "ISS reboost burns are scheduled at apogee, where they're
  cheapest."
- Issue: These contradict each other. A prograde burn at **perigee** raises
  **apogee** (and vice versa); to raise the whole orbit against drag you add
  energy where it's most efficient — near perigee, not apogee. Published ISS
  reboost telemetry consistently shows the larger altitude gain at perigee (e.g.
  Progress: "+1 mile apogee / +2.3 miles perigee"), i.e. the burn is near
  perigee. "Reboost at apogee where they're cheapest" is not a real operational
  rule.
- Correction: drop/replace the ISS-at-apogee sentence; if an ISS example is
  wanted, note reboosts are performed to raise the orbit against drag (net energy
  add), consistent with the narrative's own "fire at the low point."
- Source: https://www.nasa.gov/blogs/spacestation/2024/11/08/dragon-spacecraft-boosts-station-for-first-time/
- Confidence: high.

### 🟠 A3 — "Voyager flybys were timed at perihelion of each planetary encounter"
- File: `apsides.json` · `body_paragraphs[2]`
- Quote: "The Voyager flybys were timed at perihelion of each planetary
  encounter."
- Issue: Conceptually muddled. "Perihelion" is closest approach **to the Sun**;
  a flyby's closest approach to a planet is that planet's **periapsis**
  (peri-jove, peri-saturnium, etc.), not perihelion. And Voyager encounters were
  timed by launch window / gravity-assist geometry, not by a spacecraft
  "perihelion." As written it mislabels the very apsis vocabulary the page is
  teaching.
- Correction: either remove, or reword to "each flyby's closest approach
  (periapsis) to the target planet."
- Source: apsis vocabulary — https://en.wikipedia.org/wiki/Apsis
- Confidence: high (terminology), medium (intended meaning).

### 🟡 A4 — "rendezvous and docking phasing burns happen at perigee, where the orbital geometry concentrates the velocity change"
- File: `apsides.json` · `body_paragraphs[2]`
- Quote: as above.
- Issue: Phasing/rendezvous burns are placed by phasing geometry and Oberth
  efficiency, not a general "perigee concentrates Δv" rule; the stated rationale
  is hand-wavy. Not flatly wrong (Oberth does favour perigee), but the causal
  phrasing overstates a clean rule.
- Correction: soften to "burns are placed for phasing efficiency, often near
  perigee (Oberth effect)."
- Confidence: medium.

---

## cislunar-orbits

Verdict: REVISE. Rich and mostly accurate (frozen-orbit inclinations, DRO
retrograde stability, Artemis-1 DRO, Queqiao/EML2, mascons) — but the flagship
NRHO geometry is stated backwards.

### 🔴 A5 — NRHO perilune placed over the SOUTH pole (it is over the NORTH pole)
- File: `cislunar-orbits.json` · `body_paragraphs[0]` and `diagram_caption`
- Quote: "perilune ~3,000 km above the lunar south pole and apolune ~70,000 km
  away from the Moon … the perilune over the south pole gives the shortest
  descent ΔV to the Artemis Base Camp site at Shackleton crater rim."
- Issue: Reversed. For the baseline southern-L2 9:2 NRHO, **perilune (closest
  approach, ~1,500 km altitude) is over the lunar NORTH pole**, and **apolune
  (~70,000 km) is over the SOUTH pole**. The orbit's south-pole coverage — the
  whole reason it was chosen for Artemis — comes from the long dwell near
  **apolune** over the south pole, not from perilune. Also "perilune ~3,000 km"
  conflates radius-from-center (~3,200–3,400 km) with altitude-above-surface
  (~1,500 km); as written "~3,000 km above the … pole" reads as altitude and is
  wrong on both count and pole.
- Correction: "perilune ≈1,500 km altitude (perilune radius ~3,200 km) over the
  lunar **north** pole; apolune ≈70,000 km over the **south** pole. The long
  dwell near apolune over the south pole gives near-continuous coverage of the
  Artemis south-polar sites." Then re-derive the descent-ΔV sentence — the
  advantage is south-pole *visibility/coverage*, not a "perilune over the south
  pole."
- Sources: https://ntrs.nasa.gov/api/citations/20200002920/downloads/20200002920.pdf ;
  https://www.nasa.gov/centers-and-facilities/johnson/lunar-near-rectilinear-halo-orbit-gateway/ ;
  https://en.wikipedia.org/wiki/Near-rectilinear_halo_orbit
- Confidence: high.

### 🟠 A6 — "halo orbits exist as 'spiral' families"
- File: `cislunar-orbits.json` · `body_paragraphs[2]`
- Quote: "Halo orbits exist as 'spiral' families around all five Earth-Moon
  Lagrange points…"
- Issue: Two errors. (1) Halo orbits are 3-D **periodic** orbits (closed loops),
  not spirals. (2) Halo families exist around the **collinear** points L1/L2/L3,
  not "all five" — the triangular points L4/L5 host tadpole/horseshoe libration,
  not halos. The page's own next sentences only ever cite EML1/EML2 halos, so
  "all five" is internally inconsistent too.
- Correction: "Halo orbits are periodic 3-D families around the collinear
  Lagrange points (L1, L2, L3)."
- Source: https://en.wikipedia.org/wiki/Halo_orbit ;
  https://en.wikipedia.org/wiki/Lagrange_point
- Confidence: high.

Verified-correct in this file (for the record): frozen-orbit inclinations
27°/50°/76°/86° (discovered 2001 from mascon studies), DRO retrograde and
Artemis-1 6-day DRO stay (Nov 2022), Queqiao EML2 relay for Chang'e-4 far side,
NRHO ~5 m/s/yr station-keeping, mascons destabilising low lunar orbits.
Source: https://en.wikipedia.org/wiki/Lunar_orbit ; https://en.wikipedia.org/wiki/Frozen_orbit

---

## disposal-end-of-life

Verdict: PASS (one minor causal imprecision). 25-year IADC rule, FCC 5-year
(2022), GEO deorbit ΔV ~1.5 km/s, graveyard ≥235 km, Point Nemo/SPOUA, Mir 2001,
frozen-vs-decay for HEO — all check out.

### 🟡 A7 — the 235 km graveyard figure attributed entirely to SRP + lunar perturbations
- File: `disposal-end-of-life.json` · `body_paragraphs[1]`
- Quote: "The 235 km figure is calculated from the maximum perigee variation a
  derelict GEO satellite could see over centuries due to solar radiation pressure
  and lunar perturbations."
- Issue: Slightly off. In the IADC formula the minimum re-orbit is
  **235 km + 1000·C_R·(A/m)** above GEO. The **235 km is a fixed base**
  (~200 km GEO protected zone + ~35 km gravitational/luni-solar tolerance); the
  **solar-radiation-pressure term is the variable part on top** (depends on
  C_R and area-to-mass, pushing real minima to ~250–300+ km). The file folds SRP
  into the 235 base, which is the wrong decomposition. (The task's "~235–300 km"
  band is consistent with this — the file's number is fine; only the *reason* is
  imprecise.)
- Correction: "235 km is the base (GEO protected zone + gravitational tolerance);
  solar-radiation pressure adds a satellite-specific term (1000·C_R·A/m),
  typically pushing the real minimum to ~250–300+ km."
- Source: https://en.wikipedia.org/wiki/Graveyard_orbit
- Confidence: high.

---

## eccentricity

Verdict: PASS. e=0 circle, 0<e<1 ellipse, e=1 parabola/escape, e>1 hyperbolic
flyby — all stated correctly. Earth 0.0167, Mars 0.093, Mercury 0.205 (most
eccentric of the eight) all correct. Apollo TLI e ≈ 0.97 confirmed (Apollo 11
geocentric TLI ellipse e ≈ 0.977).

### 🟡 A8 — "Hohmann transfers to Mars sit around 0.21"
- File: `eccentricity.json` · `narrative_101[2]`
- Quote: "Hohmann transfers to Mars sit around 0.21."
- Issue: Defensible but rounder than ideal. A Hohmann ellipse with perihelion
  1.0 AU and aphelion ~1.52 AU gives e = (1.52−1.0)/(1.52+1.0) ≈ 0.207, and using
  Mars aphelion 1.666 AU it rises. "~0.21" is a fair round figure for the mean
  case; flagging only because the exact value depends on which Mars distance is
  used, so "~0.2" would be safer.
- Correction: optional — "~0.2" or "≈0.21 for a 1.0→1.52 AU transfer."
- Source: https://en.wikipedia.org/wiki/Hohmann_transfer_orbit
- Confidence: medium.

---

## hill-sphere

Verdict: REVISE. Formula is right (r_H ≈ a(1−e)(m/3M)^{1/3}) and the cube-root
scaling is right. But one narrative figure is a hard physics error, one causal
claim about JWST is wrong, and the "largest relative to parent" superlative is
shaky.

### 🔴 A9 — "the Sun's pull on you would be about 1500× weaker than … on the Sun's surface"
- File: `hill-sphere.json` · `narrative_101[0]`
- Quote: "Out at Earth's orbit, the Sun's pull on you would be about 1500×
  weaker than it is on the Sun's surface."
- Issue: Off by a factor of ~30. Solar surface gravity ≈ 274 m/s²; solar
  gravitational acceleration at 1 AU ≈ 0.0059 m/s². Ratio ≈ 274/0.0059 ≈
  **46,000×**, not 1500×. (Equivalently (215 R_sun / 1 R_sun)² ≈ 46,000, since
  1 AU ≈ 215 solar radii.) The "1500×" is flatly wrong.
- Correction: "about 46,000× weaker" (or "~50,000×").
- Source: solar surface gravity 274 m/s² —
  https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html ; inverse-square
  at 215 R_sun.
- Confidence: high.

### 🟠 A10 — JWST "sits right at the [Hill-sphere] boundary — which is why it needs constant tiny corrections"
- File: `hill-sphere.json` · `narrative_101[1]`
- Quote: "The James Webb Space Telescope, at 1.5 million km, sits right at the
  boundary — which is why it needs constant tiny corrections to stay there."
- Issue: Wrong causation. JWST orbits the **Sun–Earth L2** point, which is a
  saddle (unstable) equilibrium; it needs station-keeping (~2.5 m/s/yr, burns
  ~every 21 days) **because L2 is dynamically unstable**, not because it sits at
  the edge of Earth's Hill sphere. That the Hill radius and the L2 distance are
  both ~1.5 M km is a coincidence of the same (m/3M)^{1/3} scale, not the cause
  of the corrections. Presenting Hill-boundary proximity as the reason is a
  physics misconception.
- Correction: "JWST orbits the unstable Sun–Earth L2 point (also ~1.5 M km out)
  and needs small station-keeping burns because L2 is a saddle point — not
  because it is falling out of Earth's Hill sphere."
- Source: https://jwst-docs.stsci.edu/jwst-observatory-characteristics/jwst-orbit
- Confidence: high.

### 🟡 A11 — "Pluto … the largest Hill sphere relative to its parent body in the system"
- File: `hill-sphere.json` · `body_paragraphs[1]`
- Quote: "Pluto 7.6 M km (3200 R_Pluto — the largest Hill sphere relative to its
  parent body in the system…)"
- Issue: Two problems. (1) The **absolute** value: standard tables give Pluto's
  Hill radius ≈ **6.0 M km** (~0.04 AU), not 7.6 M km. (2) The **superlative in
  body-radii**: Wikipedia's Hill table gives Pluto ≈ 5048 R_Pluto vs Neptune ≈
  4645 R_Neptune and Uranus ≈ 2613 R_Uranus — so Pluto *is* plausibly the
  largest in body-radii, but the file's own figure (3200 R_Pluto) is lower than
  Wikipedia's 5048, so its internal numbers don't support the ranking it asserts.
  Either way "relative to its parent body" is awkward (Pluto orbits the Sun; its
  "parent" here is the Sun). Reconcile the number and the wording.
- Correction: set Pluto Hill radius ≈ 6.0 M km; if keeping the R_Pluto
  superlative, use a consistent ~5000 R_Pluto and phrase as "largest Hill sphere
  measured in its own body radii."
- Source: https://en.wikipedia.org/wiki/Hill_sphere (table: Pluto 5.99 M km /
  5048 body radii; Neptune 115 M km / 4645; Uranus 66.8 M km / 2613)
- Confidence: high on the 6.0 M km number; medium on the superlative.

Verified-correct here: Neptune has the largest **absolute** Hill radius
(~116 M km) — the file states this and does not claim Jupiter is largest in
absolute terms (it calls Jupiter "by far the largest" only in the planet-radii
column, where Jupiter's 740 is *not* actually the largest either, since Uranus
2613 / Neptune 4645 / Pluto exceed it — but that clause reads as a loose aside,
folded into A11's reconciliation). Earth Hill radius ~1.5 M km, Moon at 0.384 M
km ≈ ¼ of the way out — both correct.

---

## inclination

Verdict: PASS. Definition (angle of orbit plane to reference, measured at
ascending node going north), ecliptic vs equatorial reference, ISS 51.6° (Baikonur
reachability), polar for imaging, sun-sync ~98°, GEO equatorial, plane-change
being expensive — all correct. Mercury 7°, Pluto 17° correct.

### 🔵 A12 — "the ascending node, where the orbit climbs through the reference plane heading north"
- File: `inclination.json` · `body_paragraphs[0]`
- Quote: as above.
- Issue: Correct, just worth confirming — "north" here means the +z / ascending
  direction relative to the reference plane. Fine as written; no change needed.
  Logged only so the reviewer's pass on this definition is on record.
- Confidence: high (this is correct).

---

## keplerian-orbit

Verdict: PASS. Ellipse with body at one focus (not centre); six Keplerian
elements correctly enumerated (a, e, i, Ω, ω, ν); patched-conic caveat correct;
"model breaks down when a third body matters" correct. No findings.

---

## keplers-laws

Verdict: PASS. All three laws stated precisely:
- First: ellipses, Sun at one focus. ✓
- Second: equal areas in equal times = angular-momentum conservation; faster at
  perihelion, slower at aphelion. ✓ (correctly framed)
- Third: T² ∝ a³, with the μ-dependence flagged in the formula caption. ✓

Historical framing (Tycho's Mars data, 1609, Newton ~70 years later) is accurate.
No findings.

---

*End of batch A. Do-not-edit review — corrections above are proposals for the
content author.*
