# Science overlay fact-check — `science/transfers/*`

Independent, web-verified orbital-mechanics review. Skeptical baseline: every
claim treated as wrong until confirmed. No edits made — findings only.

Severity: 🔴 wrong physics / wrong number that misleads · 🟠 materially
imprecise · 🟡 minor / debatable simplification · 🔵 nit / polish.

## Per-overlay verdicts

| Overlay | Verdict | Findings |
|---|---|---|
| `_intro` | Sound, one nuance | 1 🟡 |
| `conic-sections` | **One real physics error** | 1 🔴, 1 🟡 |
| `coplanar-trajectories` | Sound | 1 🟡 |
| `free-return` | Sound, two simplifications | 2 🟡 |
| `gravity-assist` | Sound | 1 🟡 |
| `hohmann-transfer` | Sound | 1 🟡 |
| `lambert-problem` | Sound | 0 |
| `patched-conics` | Sound | 1 🟡 |
| `transfer-ellipse` | Sound | 1 🟡 |

**Totals: 🔴 1 · 🟠 0 · 🟡 8 · 🔵 0 = 10 findings.**
Only one finding (conic-sections, Voyager "parabolic-ish") is an outright
physics error. Everything else is a defensible museum-level simplification;
listed for the record, not necessarily for action.

---

## `conic-sections.json`

### 🔴 Voyager probes described as "parabolic-ish", not hyperbolic
- **Field:** `narrative_101[2]`
- **Quote:** "The Voyager probes are now on parabolic-ish trajectories that will
  take them out of the solar system forever."
- **Wrong:** A parabola (e = 1) is the exact escape-velocity edge — zero
  hyperbolic excess velocity, asymptotic speed → 0. The Voyagers left the Sun's
  gravity well with large residual speed (V∞ ≈ 16–17 km/s; Voyager 1 heliocentric
  ~17 km/s). That is a **hyperbolic** trajectory, e > 1, by definition. Calling it
  "parabolic-ish" contradicts this same file's own narrative_101[1]/body_paragraphs
  ("Faster than that? Hyperbola — you blast through and never return") and the
  intro-tab framing. An escaping probe with excess speed is the textbook hyperbola.
- **Correction:** "…are now on hyperbolic escape trajectories (e > 1) that will
  take them out of the solar system forever." (If a softer register is wanted:
  "…solidly hyperbolic — escaping with speed to spare.")
- **Source:** https://en.wikipedia.org/wiki/Hyperbolic_trajectory ·
  https://www.wionews.com/photos/what-is-a-hyperbolic-escape-trajectory-and-why-is-nasa-s-voyager-2-on-this-path-1756966956045
- **Confidence:** High. Unambiguous — parabolic vs hyperbolic is defined exactly
  by e = 1 vs e > 1, and the Voyagers have measurable positive V∞.

### 🟡 "at `e = 1` you're moving at exactly the local escape velocity"
- **Field:** `body_paragraphs[1]`
- **Quote:** "The boundary is exact: at `e = 1` you're moving at exactly the local
  escape velocity."
- **Note:** True and well-phrased for a parabolic orbit. Minor caveat only: escape
  velocity is a speed at a given radius; e = 1 means the orbit's *specific energy*
  is exactly zero, which yields local escape speed at every point. The sentence is
  correct as written — flagged only because a careful reader could misread "at e=1"
  as a single point rather than the whole orbit. No change needed.
- **Confidence:** High that the statement is correct.

---

## `_intro.json`

### 🟡 "Going from there [LEO] to Mars adds only ~3.6 km/s"
- **Field:** `paragraphs[0]`
- **Quote:** "Reaching low Earth orbit costs about 9.4 km/s of ∆v … Going from
  there to Mars adds only ~3.6 km/s."
- **Assessment:** The **9.4 km/s to LEO** figure is standard and correct. The
  **~3.6 km/s** number is the correct order for the trans-Mars *injection* burn
  from LEO (sources give ~3.6 km/s crewed, up to ~3.9–4.3 km/s depending on
  geometry). The imprecision: "to Mars" reads as *arriving at / capturing at*
  Mars, but 3.6 km/s only buys you onto the transfer ellipse — it excludes Mars
  orbit insertion (~1–2 km/s, or aerobraking) and any landing. As a "you're
  halfway to anywhere" rhetorical point it's fine; as a literal budget it's the
  departure burn only.
- **Correction (optional):** "…the trans-Mars injection burn adds only ~3.6 km/s"
  (naming it as the departure burn removes the ambiguity).
- **Source:** https://en.wikipedia.org/wiki/Delta-v_budget ·
  https://www.marssociety.ca/2021/01/22/rocket-physics-how-to-go-to-mars/
- **Confidence:** High on the numbers; the flag is framing, not arithmetic.

---

## `coplanar-trajectories.json`

### 🟡 Plane-change numbers — both check out
- **Field:** `body_paragraphs[0]`
- **Quote:** "Changing a heliocentric trajectory's inclination by even 1° at
  Earth's orbital speed (~30 km/s) costs roughly 0.5 km/s of `∆v`. Doing the 80°
  plane change Ulysses needed … ~38 km/s."
- **Verified:** Δv = 2·v·sin(Δi/2). At v = 30 km/s: 1° → 2·30·sin(0.5°) =
  **0.524 km/s** ✓ ("roughly 0.5"). 80° → 2·30·sin(40°) = **38.6 km/s** ✓
  ("~38"). Ulysses' final orbit is 80.4° inclination, achieved via the Feb 1992
  Jupiter gravity assist because a direct chemical plane change was infeasible —
  exactly as stated. No error; recording the verification.
- **Source:** https://en.wikipedia.org/wiki/Orbital_inclination_change ·
  https://www.cosmos.esa.int/web/ulysses/the-ulysses-mission
- **Confidence:** High.

---

## `free-return.json`

### 🟡 "no engine burn required" / "no mid-course corrections" — Apollo 13 caveat
- **Field:** `narrative_101[2]`, `body_paragraphs[1]`
- **Quote:** "When their main engine became unusable, they drifted around the Moon
  on a free-return and came home." / (intro) "no engine burn required."
- **Nuance:** Apollo 13's *defining* feature was returning to the free-return
  trajectory (via an early LM descent-engine burn to get back onto it after the
  original hybrid non-free-return path). It then did fire the LM descent engine
  again — the **PC+2 burn** ~2 hours after perilune — to speed the return by ~10 h
  and move splashdown from the Indian to the Pacific Ocean. So "drifted … came
  home" with zero burns overstates it: the crew *did* fire an engine (the LM's),
  just not the crippled service-module SPS. The pedagogical point (gravity does the
  U-turn) is correct; the "no engine at all" absolute is not literally true for 13.
- **Correction (optional):** "…rode the free-return home, firing only the lunar
  module's engine for course corrections, never the crippled main engine."
- **Source:** https://en.wikipedia.org/wiki/Free-return_trajectory ·
  https://en.wikipedia.org/wiki/Apollo_13
- **Confidence:** High on the PC+2 burn; the finding is precision, not a physics error.

### 🟡 "the Moon's gravity bends your path 180 degrees" / "figure-8"
- **Field:** `narrative_101[1]`, `diagram_caption`
- **Quote:** "the Moon's gravity bends your path 180 degrees, and you fall back
  toward Earth."
- **Nuance:** The figure-8 shape is real and correct **in the Earth–Moon rotating
  frame** (as the discovery-mag/astronomy.com sources describe). The literal
  "bends 180°" is an idealization — the actual turn angle around the Moon on a
  lunar free-return is well under 180° (the classic Apollo free-return swings a few
  hundred km past the far side and the hyperbolic deflection about the Moon is
  modest); the *net* Earth-relative reversal comes from the whole geometry, not a
  180° hairpin at the Moon. Acceptable as a lay simplification; flagged so it isn't
  mistaken for a literal turn angle.
- **Source:** https://www.astronomy.com/space-exploration/why-apollo-flew-in-a-figure-8/ ·
  https://en.wikipedia.org/wiki/Free-return_trajectory
- **Confidence:** Medium-high. The 180° is loose but not egregiously wrong as prose.

Apollo 8 = first crewed free-return ✓ (verified). Mars free-return ~500-day
two-pass loop framing is a reasonable description of proposed crewed Mars flyby
free-returns; not flagged.

---

## `gravity-assist.json`

### 🟡 Physics is sound — recording the verification
- **Fields:** `narrative_101[0-2]`, `body_paragraphs[0-1]`, `diagram_caption`
- **Verified correct:**
  - Frame framing is right: "From the planet's point of view, the spacecraft
    enters and leaves at exactly the same speed … from the Sun's point of view …
    inherits some of the planet's orbital motion." This is the correct energy
    argument (gravity conservative in planet frame; heliocentric energy changes).
    The required "free lunch is paid by the planet slowing down" caveat **is
    present** ("the planet pays for it by slowing down") — the misconception the
    brief warns about is avoided. ✓
  - "Approach a moving planet from behind … you exit with more speed relative to
    the Sun" ✓ — passing behind the planet's motion (prograde-adding) accelerates;
    "approach from in front … you slow down" ✓.
  - Tennis-ball-and-train analogy ✓ (Wikipedia uses the identical analogy).
  - Voyager 2 chained Jupiter→Saturn→Uranus→Neptune ✓; Cassini Venus×2 + Earth×1 ✓;
    New Horizons Jupiter assist to Pluto ✓; Pioneer 11 Jupiter→Saturn ✓.
- **Source:** https://en.wikipedia.org/wiki/Gravity_assist ·
  https://science.nasa.gov/learn/basics-of-space-flight/primer/
- **Confidence:** High. No correction needed.

---

## `hohmann-transfer.json`

### 🟡 "eight months" vs the file's own "259 days" — internal rounding
- **Field:** `narrative_101[1]` ("Coast for eight months"), `narrative_101[2]`
  ("The eight-month wait") vs `body_paragraphs[1]` ("about 259 days").
- **Assessment:** 259 days ≈ 8.5 months, so "eight months" is a slight round-down
  but within lay tolerance. The **259-day** figure is the correct textbook
  Earth→Mars Hohmann value ✓; the **every-26-months** window ✓; two-burn cheapest
  ✓; "cheapest but slowest" ✓; V∞/entry-burn tradeoff for faster transfers ✓.
  Consistency nit only — "about eight months" and "259 days" describe the same
  thing; fine as is, or say "about 8.5 months" once.
- **Source:** http://marspedia.org/Earth-Mars_Transfer_Trajectory ·
  https://en.wikipedia.org/wiki/Hohmann_transfer_orbit
- **Confidence:** High.

Note: Hohmann is strictly cheapest only for orbit-radius ratios below ~11.94;
above that a bi-elliptic transfer beats it. Earth→Mars (ratio ~1.52) is well
inside the Hohmann-optimal regime, so "cheapest" is correct here. Not flagged —
the overlay scopes its claim to the coplanar circular two-orbit case.

---

## `lambert-problem.json`

### No findings
- Lambert's problem = two position vectors + time-of-flight → unique transfer
  orbit (long-way / short-way ambiguity noted) ✓. 1761 attribution ✓ (J.H.
  Lambert). "Hohmann is one specific Lambert solution — positions at opposite
  apsides, TOF = half the transfer ellipse period" ✓. Porkchop-plot = grid of
  Lambert solves ✓. Physics and history both clean.
- **Source:** https://en.wikipedia.org/wiki/Lambert%27s_problem
- **Confidence:** High.

---

## `patched-conics.json`

### 🟡 "NO closed-form solution to the three-body problem" — true, one refinement
- **Field:** `narrative_101[0]`, `body_paragraphs[0]`
- **Quote:** "We have NO closed-form solution to the three-body problem … The full
  math (the n-body problem) has no closed-form solution — only numerical
  integration."
- **Assessment:** Correct in the sense meant (no general closed-form / no
  elementary first integrals; Poincaré). Pedantic caveat only: Sundman (1912) gave
  a convergent power-series solution to the 3-body problem (and Wang generalized to
  n-body), but it converges too slowly to be useful — so "no *practical* /
  *useful* closed-form solution" is the fully-defensible phrasing. As written it's
  standard textbook shorthand and not misleading. SOI hand-off / few-percent-error
  framing is accurate.
- **Source:** https://en.wikipedia.org/wiki/Three-body_problem
- **Confidence:** High that the overlay's claim is accepted usage; refinement is optional.

---

## `transfer-ellipse.json`

### 🟡 "semi-major axis is the average of those two radii"
- **Field:** `body_paragraphs[1]`
- **Quote:** "The semi-major axis is the average of those two radii."
- **Assessment:** Correct — for an ellipse, a = (r_peri + r_apo)/2, i.e. the
  arithmetic mean of perihelion and aphelion radii. Exactly right for a transfer
  ellipse tangent to both circular orbits. Also correct: Sun at one focus,
  slow-at-aphelion/fast-at-perihelion, vis-viva and Kepler's third law apply,
  spacecraft flies half the ellipse, two burns. Recording the verification; no
  error found.
- **Source:** https://en.wikipedia.org/wiki/Hohmann_transfer_orbit ·
  https://en.wikipedia.org/wiki/Semi-major_and_semi-minor_axes
- **Confidence:** High.

---

*Method: claims cross-checked against Wikipedia (orbital mechanics, Voyager,
Apollo, Ulysses, Lambert, three-body), ESA Ulysses mission pages, NASA Science
gravity-assist primer, Marspedia, and independently recomputed plane-change Δv.
No files modified.*
