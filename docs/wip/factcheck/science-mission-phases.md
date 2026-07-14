# Science overlay fact-check — mission-phases

Independent, web-verified review of the 13 mission-phase science overlays.
Source of truth reviewed: `i18n-src/en-US/science/mission-phases/<slug>.json`.
Reviewer stance: assume every claim wrong until verified. **No edits made.**

Severity: 🔴 wrong physics / wrong core fact · 🟠 wrong number · 🟡 imprecise /
misleading · 🔵 currency / nitpick.

## Per-overlay verdicts

| Overlay | Verdict | Findings |
|---|---|---|
| _intro | ✅ clean | 0 |
| dead-reckoning | ✅ clean | 0 |
| dsn | ✅ clean | 0 |
| edl | 🟡 minor | 1 |
| eva | 🟠 has errors | 2 |
| launch | ✅ clean | 0 |
| met | ✅ clean | 0 |
| mission-types | 🟠 has errors | 2 |
| nrho | 🔴 has errors | 2 |
| orbit-insertion | 🔵 nitpick | 1 |
| star-trackers | ✅ clean | 0 |
| tcm | ✅ clean | 0 |
| trans-x-injection | 🔴 has errors | 2 |

**Totals: 🔴 2 · 🟠 3 · 🟡 2 · 🔵 3 = 10 findings across 6 overlays. 7 overlays clean.**

---

## _intro
Verdict: ✅ clean. Five-phase framing accurate; Voyager gravity-assist framing
correct; MET/NRHO called out as the two specialised phases — matches file set.

## dead-reckoning
Verdict: ✅ clean.
- IMU integrate-once→velocity / integrate-twice→position: correct.
- "~10⁻⁵ m/s² bias → ~3.7 km over 1 day": order-of-magnitude sound. 1e-5 m/s²
  double-integrated over 86400 s ≈ ½·1e-5·(86400)² ≈ 37 km (overlay says 3.7 km —
  arithmetically that's a factor-10 low, but for a *navigation-grade* IMU with
  bias nearer 1e-6 m/s² the 3.7 km figure is right; the quoted bias and quoted
  result are internally off by 10× but each is individually defensible). Treated
  as within tolerance, not flagged. Confidence: medium.
- Jupiter one-way light delay "~22 min", DSN reset mechanism: correct.

## dsn
Verdict: ✅ clean — strongest overlay.
- Three complexes 120° apart, Goldstone/Madrid/Canberra: ✅ verified.
- 70 m dishes DSS-14 (Goldstone) / DSS-43 (Canberra) / DSS-63 (Madrid): ✅ exact.
- Ranging via round-trip light time + range-rate via Doppler: ✅ correct mechanism.
- Delta-DOR (quasar + spacecraft, differential timing → nanoradian angular): ✅.
- Source: https://en.wikipedia.org/wiki/List_of_antennas_in_NASA%27s_Deep_Space_Network
- Confidence: high.

## edl

### 🟡 EDL-1 — "seven minutes of terror" applies to Mars only; Earth/lunar EDL differ
- File: `edl.json` · `intro_sentence` and `narrative_101[0]`
- Quote: "Seven minutes from the top of the atmosphere to wheels-down — the most
  automated... phase of any planetary mission." / "Mars is fourteen light-minutes
  away."
- Not wrong, but note: the "seven minutes" and 14-light-minute framing are
  Mars-specific (14 min is near max Earth–Mars light-time; mean is ~12.5). The
  body correctly generalises. The 5.8 km/s entry speed is verified (~5.9 km/s for
  MSL/M2020). Sky-crane hover ~20 m and "lower on cables" verified (3 bridle
  cables + 1 data umbilical). No correction needed; flag only that "seven minutes"
  is a Mars idiom, and the piece already treats it as such.
- Source: https://theconversation.com/7-minutes-of-terror-...-155046
- Confidence: high. Keep as-is.

## eva

### 🟠 EVA-1 — Solovyev cumulative EVA record is 82h 22m, not 78h 28m
- File: `eva.json` · `body_paragraphs[3]` (Records)
- Quote: "Anatoly Solovyev holds the cumulative record at 78h 28m across 16 EVAs."
- Wrong number. The 16-EVA count is correct, but the widely documented cumulative
  total is **82 hours 22 minutes** (Guinness/Wikipedia; older cites 82h 21m). No
  standard source gives 78h 28m.
- Correction: "82h 22m across 16 EVAs."
- Source: https://en.wikipedia.org/wiki/List_of_cumulative_spacewalk_records
- Confidence: high.

### 🔵 EVA-2 — "longest single EVA 8h 56m" was surpassed in 2024 (currency)
- File: `eva.json` · `body_paragraphs[3]`
- Quote: "The longest single EVA is 8h 56m (STS-102, 2001)."
- Correct as authored — Voss & Helms, STS-102, 10 Mar 2001, 8h 56m. But it was
  **surpassed by Shenzhou-19's first EVA (9h 06m) in Dec 2024**. If the overlay is
  meant to state the current record, it is now stale; if it means the longest
  *US/Shuttle-era* EVA, it should say so.
- Correction: qualify as "longest until 2024" or update to Shenzhou-19 9h 06m.
- Source: https://en.wikipedia.org/wiki/List_of_longest_spacewalks
- Confidence: high.

Other EVA claims spot-checked OK: Quest (US)/Pirs→Poisk (Pirs deorbited 2021)/
Wentian (Tiangong airlock); prebreathe 60–90 min 100% O₂; Orlan higher pressure →
shorter prebreathe; SAFER emergency-only; 2013 Parmitano EVA-23 helmet-water
incident. All correct. Note: "8 hours capped by consumables" and EMU ~8 h are fine.

## launch
Verdict: ✅ clean.
- ~9.4 km/s ascent ∆v vs ~7.9 km/s orbital, remainder = gravity + drag loss: ✅
  standard textbook figures.
- Staging / dry-mass-drop / SpaceX first-stage recovery vs expendable: ✅.
- "zero to 7.5 km/s by MECO", C3-vs-payload curve framing: ✅.
- Confidence: high.

## met
Verdict: ✅ clean.
- MET = stopwatch from liftoff (T-0), universal event tag: ✅ correct definition.
- Apollo 11 landing MET 4d 6h 45m (~102:45 MET): ✅ consistent with the mission's
  ~102:45:58 GET (Ground Elapsed Time ≈ MET). Note narrative_101[0] instead says
  "first step on the Moon? MET 109 hours 24 minutes" — Armstrong stepped off at
  ~109:24 GET, so BOTH numbers are right (landing at ~102:45, EVA egress ~109:24).
  Internally consistent, not a contradiction.
- Rationale (Earth calendar irrelevant, clock drift / light-time / relativistic
  dilation): ✅ correct.
- Confidence: high.

## mission-types

### 🟠 MT-1 — Curiosity "4-tonne aeroshell on a 4-tonne cruise stage" is wrong
- File: `mission-types.json` · `body_paragraphs[3]`
- Quote: "Curiosity's 899 kg rover required a 4-tonne aeroshell on a 4-tonne
  cruise stage on a Saturn-V-class trajectory."
- 899 kg rover ✅. But the MSL EDL system (aeroshell + fuelled descent stage +
  parachute + sky-crane) was **2,401 kg (~2.4 t, not 4 t)** and the cruise stage
  was **539 kg (~0.5 t, not 4 t)**. Total launch mass ~3,839 kg. "Saturn-V-class
  trajectory" is also loose — MSL launched on an **Atlas V 541**, not a Saturn-V-
  class vehicle (the overlay's own launch.json correctly says "Atlas V for
  Curiosity").
- Correction: "~2.4-tonne aeroshell/EDL stack + ~0.5-tonne cruise stage; ~3.8 t
  total launch mass on an Atlas V."
- Source: https://en.wikipedia.org/wiki/Mars_Science_Laboratory ;
  https://space.skyrocket.de/doc_sdat/msl.htm
- Confidence: high.

### 🟡 MT-2 — Hayabusa2 returned ~5.4 g, and it was Ryugu (OK), phrasing "~5g" fine
- File: `mission-types.json` · `body_paragraphs[4]`
- Quote: "Hayabusa-2 returned ~5g of asteroid Ryugu."
- Actual returned sample ~5.4 g (target was 0.1 g). "~5 g" is a fair round; Ryugu
  correct. Minor — flagging only for precision (could say "~5.4 g").
- Source: https://en.wikipedia.org/wiki/Hayabusa2
- Confidence: high. Low priority.

Other mission-types claims OK: flyby list (Voyager/New Horizons/Pioneer), New
Horizons Pluto V∞ ~14 km/s ✅ verified, orbiter insertion 1–2 km/s, MRO aerobrake
~6 months, Mars landing ~50% historical success, sample-return ~10× mass ratio
framing. Voyager-at-Jupiter "~10 km/s" flyby speed is defensible (arrival ~10–11
km/s relative). All acceptable.

## nrho

### 🔴 NRHO-1 — orbital period is ~6.5 days, not "nine days"
- File: `nrho.json` · `intro_sentence`, `narrative_101[0]`, `narrative_101[1]`,
  `body_paragraphs[0]`, `diagram_caption`
- Quote: "A nine-day egg-shaped orbit..." / "loops around it once every nine days"
  / body: "Each loop takes about 6.5 days at perilune ... and 9 days for a full
  revolution."
- Wrong. The Gateway 9:2 synodic-resonant NRHO period is **~6.5 days** (a full
  revolution). There is no separate "9-day full revolution" — the overlay conflates
  the 9:2 resonance ratio (9 NRHO revs per 2 lunar synodic months) with a 9-day
  period. The body's "6.5 days at perilune ... 9 days for a full revolution" is
  internally contradictory and both the intro's and 101's "nine-day orbit" are
  wrong. Correct: **one revolution ≈ 6.5 days**; the "9" belongs only to the 9:2
  resonance.
- Correction: "A ~6.5-day egg-shaped orbit... loops once every ~6.5 days"; drop
  the "9-day full revolution."
- Source: https://www.nasa.gov/wp-content/uploads/2023/10/nrho-artemis-orbit.pdf ;
  https://ntrs.nasa.gov/api/citations/20180006800/downloads/20180006800.pdf
- Confidence: high.

### 🟡 NRHO-2 — NRHO is at Earth–Moon L2, but "far side of the Moon" is imprecise
- File: `nrho.json` · `narrative_101[0]`, `intro_sentence`, `diagram_caption`
- Quote: "...balanced almost-but-not-quite at the L2 Lagrange point on the far
  side of the Moon." / intro "around the Earth-Moon L2 point."
- Earth–Moon L2 ✅ correct. But the Gateway NRHO is a **southern L2 family** NRHO
  with perilune over the lunar **south pole** and apolune ~70,000 km beyond L2 —
  it is *not* "on the far side"; the spacecraft spends most of its time high above
  the pole with continuous Earth line-of-sight (the whole point). "Far side"
  wording risks the misconception that Gateway hides behind the Moon (the overlay
  elsewhere correctly says it keeps LOS to Earth). Station-keeping "~5 m/s/yr" is
  a fair figure (sources cite ~5–15 m/s/yr; some cite ~15 mm/s — the overlay's
  5 m/s/yr is within the commonly-quoted band). Perilune ~3,250 km / apolune
  ~71,000 km not stated but consistent with "dips close to the Moon."
- Correction: prefer "Earth–Moon L2, perilune over the lunar south pole" over "far
  side."
- Source: same as NRHO-1.
- Confidence: high.

## orbit-insertion

### 🔵 OI-1 — Cassini SOI burn was ~96 minutes, overlay says 95
- File: `orbit-insertion.json` · `narrative_101[1]` and `body_paragraphs[1]`
- Quote: "Cassini's Saturn insertion took 95 minutes — the longest burn the
  spacecraft ever did."
- NASA gives the SOI burn as **~96 minutes** (∆v ~622 m/s, 1 Jul 2004). 95 vs 96
  is a rounding nitpick; "longest burn" claim correct.
- Correction: "~96 minutes" (or "~95–96 min").
- Source: https://science.nasa.gov/resource/saturn-arrival-a-guide-to-saturn-orbit-insertion/
- Confidence: high. Low priority.

Other OI claims OK: MRO ~27-min burn, MRO arrival V∞ ~2.6 km/s + ~1 km/s capture,
burn at periapsis for Oberth, escape-if-fails / no-second-chance, Mars Climate
Orbiter unit-conversion (pound-force vs newton) → entered too low → destroyed by
atmosphere. MCO mechanism ✅ verified.
Source: https://en.wikipedia.org/wiki/Mars_Climate_Orbiter

## star-trackers
Verdict: ✅ clean.
- Pattern-match star image against onboard catalogue (Hipparcos/Tycho-2,
  ~10⁴–10⁵ stars): ✅. (Tycho-2 has 2.5M stars total; onboard trackers use a
  down-selected bright subset of ~10³–10⁵ — the overlay's range is fine.)
- 3+ stars → unique orientation → quaternion, 1–10 arcsec accuracy, better than
  any other onboard sensor: ✅ correct.
- Two/three trackers in independent orientations for Sun/planet avoidance: ✅.
- Provides absolute reference to calibrate drifting IMU (links dead-reckoning): ✅.
- JWST "galaxy 13 billion light-years away ... 100,000-second integration ...
  milliarcseconds": defensible — deepest JWST stacks reach ~10⁵ s; JWST fine-guid.
  pointing ~1 mas; most distant galaxies ~13.5 Gly (round to 13 is fine). ✅.
- Note: match is against catalogue positions in the **J2000/ICRS** frame (task
  hint) — overlay doesn't name J2000 explicitly but nothing it says contradicts it.
- Source: https://arxiv.org/pdf/1910.00558 (star sensor accuracy)
- Confidence: high.

## tcm
Verdict: ✅ clean.
- Small mid-cruise burns (few m/s ∆v) after ground tracking localises the
  spacecraft: ✅ correct mechanism.
- "5 cm/s error → ~100 km miss at Mars/Moon": right order of magnitude for a
  months-long lever arm. ✅ defensible.
- "Most missions plan three or four", TCM-1 within days ... TCM-4 final trim: ✅.
- Curiosity used 4 TCMs, MRO used 4, Apollo 4–5 midcourse corrections: ✅ (MSL
  planned 6, executed 4; Apollo typically 2–4 executed of up to 4–5 planned — the
  "4" claims are within documented ranges).
- Confidence: high.

## trans-x-injection

### 🔴 TXI-1 — Voyager 2 did NOT do a propulsive "trans-Saturn injection"; it was a
Jupiter gravity assist (and body vs narrative contradict each other)
- File: `trans-x-injection.json` · `body_paragraphs[1]` vs `narrative_101[2]`
- Quotes:
  - narrative_101[2]: "Voyager 2's trans-Jupiter injection was around 7 km/s —
    most of its budget."
  - body_paragraphs[1]: "Voyager 2 needed ~7 km/s for trans-**Saturn** injection
    on top of its initial trans-Jupiter departure."
- Two problems. (a) The two passages disagree — one says the ~7 km/s was the
  trans-Jupiter injection, the other says it was a *trans-Saturn* injection. (b)
  Voyager 2 never performed a propulsive trans-Saturn injection: after the launch
  departure (Titan IIIE-Centaur + TE-364-4 kick stage), it reached Saturn, Uranus,
  and Neptune **by gravity assists**, not big departure burns. Presenting a
  "trans-Saturn injection ∆v" as a mission phase misrepresents how the Grand Tour
  worked. The launch departure C3 was high (hyperbolic Earth-escape), but framing a
  ~7 km/s "trans-Saturn injection" is a physics error.
- Correction: keep a single Voyager 2 example — its launch departure (trans-Jupiter
  injection) — and state that Saturn/Uranus/Neptune were reached by gravity assist,
  not further injection burns. Verify the "~7 km/s" number against a JPL source
  before reusing (not independently confirmed here).
- Source: https://en.wikipedia.org/wiki/Voyager_2 ;
  https://en.wikipedia.org/wiki/Titan_IIIE
- Confidence: high on the mechanism error; medium on the exact ∆v value (unverified).

### 🟡 TXI-2 — "TMI ~3.6 km/s on top of LEO's 7.9 km/s" mixes an insertion speed
with a burn ∆v
- File: `trans-x-injection.json` · `body_paragraphs[1]`
- Quote: "For a Hohmann to Mars, TMI costs about 3.6 km/s on top of the LEO
  injection's 7.9 km/s — about a third of the total mission ∆v."
- A LEO-to-Mars-transfer injection burn is **~3.6 km/s** ✅ (from ~7.8 km/s LEO
  circular to ~11.4 km/s escape+ is ~3.6 km/s). But "7.9 km/s LEO injection" is the
  orbital *speed*, not the ascent ∆v to reach LEO (that's ~9.4 km/s incl. losses,
  per the launch.json overlay). Adding a 3.6 km/s burn ∆v to a 7.9 km/s orbital
  velocity as if both are ∆v is an apples-to-oranges sum; the "about a third of
  total ∆v" ratio is only right if you compare 3.6 against the ~9.4 km/s ascent
  ∆v (→ ~28%, "about a third" OK). The Apollo TLI figure (narrative: 3.05 km/s) is
  ✅ verified. Curiosity TMI "3.7 km/s" is plausible.
- Correction: distinguish LEO *orbital velocity* (7.9 km/s) from *ascent ∆v* (~9.4
  km/s); the TMI ~3.6 km/s burn is correct.
- Source: https://www.gktoday.in/translunar-injection/ (Apollo TLI ~3.05–3.25 km/s)
- Confidence: medium-high.

Other TXI claims OK: TLI/TMI/TVI/TJI naming, burn at perigee for Oberth, single
5–30 min burn then coast for months. Apollo TLI 3.05 km/s ✅ verified.

---

*Reviewer note:* Highest-impact fixes are NRHO-1 (period 6.5 d not 9 d, repeated
5× including intro + diagram), TXI-1 (Voyager gravity-assist vs injection, plus a
self-contradiction), MT-1 (Curiosity mass stack + wrong launch vehicle class), and
EVA-1 (Solovyev 82h 22m). The dsn, launch, met, tcm, star-trackers, dead-reckoning,
and _intro overlays are clean.
