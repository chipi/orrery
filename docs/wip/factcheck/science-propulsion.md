# Science fact-check — Propulsion overlays

Reviewer: science-reviewer (independent, web-verified). Date: 2026-07-14.
Scope: `i18n-src/en-US/science/propulsion/{_intro, c3, dv-budget, engine-clustering, engine-types, fuels-and-oxidizers, oberth-effect, rocket-stages, specific-impulse, throttling-and-gimbaling, thrust-and-twr, tsiolkovsky, v-infinity}.json`. No base overlay file exists for propulsion.

Severity: 🔴 critical (wrong physics/formula) · 🟠 significant (wrong number / outdated fact) · 🟡 minor (imprecise/ambiguous) · 🔵 nit.

## Per-overlay verdicts

| Overlay | Verdict | Findings |
|---|---|---|
| _intro | PASS (1 shared nuance) | 🟡×1 |
| c3 | PASS | 🔵×1 |
| dv-budget | PASS w/ nuance | 🟡×1 |
| engine-clustering | PASS | 🔵×1 |
| engine-types | FIX | 🟠×1 |
| fuels-and-oxidizers | PASS | 🔵×1 |
| oberth-effect | PASS | — |
| rocket-stages | PASS | — |
| specific-impulse | PASS | 🟡×1 |
| throttling-and-gimbaling | PASS | 🔵×1 |
| thrust-and-twr | PASS | — |
| tsiolkovsky | FIX | 🟠×1 |
| v-infinity | PASS | — |

**Totals: 🔴 0 · 🟠 2 · 🟡 3 · 🔵 4** (9 findings). Core physics — Tsiolkovsky form, Isp values, C3/V∞ definitions, Oberth, TWR>1, g0 — all verify correct. Two items need a fix (one outdated fact, one wrong quantitative example); the rest are polish.

---

## tsiolkovsky.json

### 🟠 Wrong fuel-fraction numbers in the "doubling ∆v" teaching example
- **Field:** `narrative_101[1]`
- **Quote:** "If your rocket is half fuel, you get a certain ∆v. To double that ∆v, you don't make your rocket two-thirds fuel. You have to make it more like 87% fuel. To triple it, more like 95% fuel."
- **What's wrong:** The numbers are off by one step. ∆v ∝ ln(m0/mf). Starting from 50% fuel, mass ratio m0/mf = 2. **Doubling** ∆v means doubling ln → ratio must go from 2 to 2² = 4 → fuel fraction 1 − 1/4 = **75%**, not 87%. **Tripling** → ratio 2³ = 8 → fuel fraction 1 − 1/8 = **87.5%**, not 95%. (95% fuel ≈ ratio 20 ≈ 4.3× the base ∆v.) So the stated "87%" is actually the *tripling* answer and "95%" overshoots even quadrupling. This is the marquee quantitative illustration of the equation the whole overlay teaches — it should be exact.
- **Correction:** "To double that ∆v, you don't make your rocket two-thirds fuel — you have to make it about **75% fuel**. To triple it, closer to **87–88% fuel**." (Verified: ln(2)=0.693; e^{2·ln2}=4 → 75%; e^{3·ln2}=8 → 87.5%.)
- **Source:** arithmetic on the standard rocket equation; ratios computed directly.
- **Confidence:** High (deterministic math).

### (No formula error) — `formula_caption` "∆v from specific impulse, gravitational acceleration g₀, and mass ratio m₀/m_f" is a correct plain-language description of ∆v = Isp·g₀·ln(m₀/m_f). Saturn V worked example (`body_paragraphs[2]`): mass ratio 7800/600 ≈ 13, Isp ~330 → ∆v = 330·9.81·ln(13) ≈ 8.3 km/s. Matches the stated "∆v ≈ 8.3 km/s." ✓

---

## engine-types.json

### 🟠 DRACO nuclear-thermal flight demo is outdated — the programme was cancelled
- **Fields:** `body_paragraphs[3]` and `diagram_caption`
- **Quote (body):** "the DRACO programme (NASA + DARPA, scheduled 2027 flight) aims to fly the first one."
- **Quote (caption):** "Nuclear thermal (NERVA tested, DRACO flying ~2027)".
- **What's wrong:** DRACO's 2027 flight was put on indefinite hold in Jan 2025 and the programme was **cancelled** in the FY2026 budget (DARPA confirmed termination June 2025; no nuclear-thermal/electric propulsion funding). Presenting it as an in-progress "flying ~2027" first flight is now factually wrong.
- **Correction:** Reframe as historical/uncertain, e.g. "NASA's NERVA test-fired full-scale engines in the 1960s; the more recent DRACO demonstrator (NASA + DARPA) targeted a ~2027 in-orbit test but was cancelled in the 2026 budget. As of 2026 no NTP engine has flown." Update caption to "(NERVA tested 1960s; no NTP engine has flown)".
- **Source:** https://en.wikipedia.org/wiki/Demonstration_Rocket_for_Agile_Cislunar_Operations ; https://breakingdefense.com/2025/06/darpas-draco-nuclear-propulsion-project-roars-no-more/
- **Confidence:** High.

### (Verified correct) NTP Isp 800–1000 s (≈2× hydrolox), 2500–3000 K, thrust 50–250 kN; full-flow staged combustion first flown on Raptor; Hall thruster AEPS ~0.6 N; Apollo-family sub-types — all consistent with sources. ✓

---

## _intro.json

### 🟡 "Total to land on Mars is around 15 km/s" — shared with dv-budget; see nuance there
- **Field:** `paragraphs[2]`
- **Quote:** "Insertion at Mars adds another ~2. Total to land on Mars is around 15 km/s"
- **What's wrong:** Only a nuance (not an error): the ~15 km/s figure sums LEO (9.4) + TMI (3.6) + MOI (2) which lands you in *Mars orbit*, but the sentence says "to land." Actual Mars EDL is done mostly aerodynamically (atmosphere + parachute + terminal propulsion ≈ small propulsive ∆v), so the final descent adds little propulsive ∆v — the ~15 km/s is essentially the get-into-Mars-orbit budget, not an extra landing cost on top. The number is fine; the word "land" slightly overstates what those 15 km/s buy.
- **Correction:** "…around 15 km/s to reach the Mars system and brake into orbit — Mars's thin atmosphere then does most of the landing." (Or keep "land" but note atmosphere covers descent.)
- **Source:** standard Mars ∆v budgets (Earth→LEO ~9.4, TMI ~3.6, MOI ~1–2 km/s); Mars EDL is aero-dominated.
- **Confidence:** Medium (phrasing/pedagogy, not a numeric error).

---

## dv-budget.json

### 🟡 "A direct one-way Mars landing is around 15 km/s total" — same aero-braking nuance
- **Field:** `body_paragraphs[2]` and `narrative_101[2]`
- **Quote:** "A direct one-way Mars landing is around 15 km/s total — close to the limit of what current chemical rockets can deliver in one shot."
- **What's wrong:** Same as _intro: the 9.4 + 3.6 + 2 sum gets you to Mars *orbit/approach*, and Mars entry is aero-braked, so a propulsive ∆v of ~15 km/s "to land" conflates propulsive budget with atmospheric EDL. The headline number is a reasonable "hardness" proxy but "landing" ∆v is not literally 15 km/s of propulsion.
- **Correction:** Same as _intro — clarify the atmosphere handles descent, or label it "to reach and capture at Mars."
- **Source:** as above.
- **Confidence:** Medium.

### (Verified correct) Earth→LEO ~9.4 km/s, LEO→Mars Hohmann ~3.6 km/s, MOI ~2 km/s — all standard and correct. ∆v supply/demand framing (Tsiolkovsky ceiling vs trajectory cost) is physically sound. ✓

---

## specific-impulse.json

### 🟡 "the seconds cancel out almost everything else" is a loose explanation of the unit
- **Field:** `narrative_101[1]`
- **Quote:** "Isp = thrust ÷ (fuel-burned-per-second × Earth's gravity). The seconds cancel out almost everything else."
- **What's wrong:** The unit-of-seconds explanation is hand-wavy. The real reason Isp has units of seconds: thrust (N) ÷ [mass-flow (kg/s) × g₀ (m/s²)] = N / (kg·m/s³) = (kg·m/s²)/(kg·m/s³) = s. "Seconds cancel out almost everything else" isn't a correct statement of the dimensional cancellation (it's mass and length that cancel, leaving time). The *definition* Isp = F/(ṁ·g₀) is correct; only the throwaway explanation of why the unit is seconds is muddled.
- **Correction:** Drop or reword: "The mass and length units cancel, leaving pure seconds — which is why you can compare any two engines with one number."
- **Source:** dimensional analysis of Isp = F/(ṁ·g₀).
- **Confidence:** High (the definition is right; the aside is imprecise).

### (Verified correct) RS-25 452 s vac, solids ~250 s, hypergolic ~314 s, ion 3000–9000 s, NTP 800–1000 s — all match published values. ✓

---

## c3.json

### 🔵 New Horizons C3 stated as 158 (body) — actual ~157.7 km²/s²
- **Fields:** `narrative_101[1]` ("C3 = 158"), `body_paragraphs[1]` ("C3 = 158 km²/s²")
- **Quote:** "New Horizons launched with C3 = 158 km²/s² — the highest of any mission ever."
- **What's wrong:** Published injection C3 was ~157.7 km²/s² (sources vary 157.7–163.9 depending on stage/margin). 158 is a fine round figure; "highest ever" is still correct (Parker Solar Probe ~154). Nit only.
- **Correction:** Optionally "~157 km²/s²." No change required.
- **Source:** https://en.wikipedia.org/wiki/New_Horizons ; https://en.wikipedia.org/wiki/Characteristic_energy
- **Confidence:** High.

### (Verified correct) C3 = V∞² ✓; C3=0 = exact escape ✓; C3=25 → V∞=5 km/s ✓; units km²/s² ✓; Mars ~8–12, Jupiter direct ~80 ✓; Falcon Heavy curve points illustrative and plausible. ✓

---

## engine-clustering.json

### 🔵 N1 "30 × NK-15 = 45 MN" and F-1 6.77 MN — verified, minor caption note
- **Field:** `diagram_caption`, `body_paragraphs[0]`
- **Quote:** "Saturn V S-IC: 5 × F-1 = 33.9 MN. Soviet N1: 30 × NK-15 = 45 MN (4 failures)."
- **What's wrong:** Nothing — verified. N1 first stage = 30 NK-15, ~45.4 MN liftoff; F-1 6.77 MN SL, 5×F-1 ≈ 33.9 MN; Super Heavy 33 Raptor ~76 MN; Falcon 9 9×Merlin ~7.6 MN; Falcon Heavy 27 Merlin ~22.8 MN. All correct. Apollo 6 lost two S-II J-2s ✓. Listed as nit only to note the caption's numbers were all checked and pass.
- **Source:** https://en.wikipedia.org/wiki/N1_(rocket) ; https://en.wikipedia.org/wiki/Apollo_6
- **Confidence:** High.

---

## fuels-and-oxidizers.json

### 🔵 Densities and Isp values verified; methane "~420 kg/m³" vs ~430
- **Field:** `body_paragraphs[2]`
- **Quote:** "methane density is ~420 kg/m³ — about 6× hydrogen"
- **What's wrong:** Liquid methane ≈ 422–430 kg/m³ depending on temperature — "~420" is fine. LH2 ~70 kg/m³ ✓, RP-1 ~806 (stated ~800) ✓, hydrolox ~450 s vac on RS-25 ✓, kerolox ~300 SL / ~340 vac ✓, methalox ~330/380 ✓, solids ~250 s ✓. All within tolerance.
- **Correction:** none needed.
- **Source:** https://grokipedia.com/page/RP-1 ; LH2/CH4 boiling-point densities.
- **Confidence:** High.

---

## throttling-and-gimbaling.json

### 🔵 Throttle ranges verified; LM descent "10–65%" is the operational envelope
- **Field:** `body_paragraphs[0]`, `body_paragraphs[1]`
- **Quote:** "RS-25 throttles 67-109%"; "Apollo Lunar Module Descent Engine throttled 10-65%".
- **What's wrong:** Nothing. RS-25 67–109% ✓. LM DPS: full-range capability 10–~92.5%, but throttle above ~65% was avoided/commanded to full due to throat erosion, so "10–65%" is the correct *operational continuous-throttle* band. Merlin/Raptor ~40–100% ✓; Super Heavy inner 13 gimbal / outer 20 fixed ✓; SLS RS-25 ±10.5° ✓.
- **Correction:** none needed.
- **Source:** https://en.wikipedia.org/wiki/RS-25 ; https://en.wikipedia.org/wiki/Descent_propulsion_system
- **Confidence:** High.

---

## oberth-effect.json — PASS
KE ∝ ½mv²; small ∆v at high v yields larger energy gain; burn at periapsis; Oberth 1929; Parker Solar Probe / Juno perijove examples — all correct. Perigee example (11 km/s vs 1 km/s at apogee) is illustratively sound.

## rocket-stages.json — PASS
SSTO mass ratio ~12–15 (92–93% propellant) ✓; two-stage minimum; Saturn V S-IC(5×F-1)/S-II(5×J-2)/S-IVB(1×J-2) ✓; hot-staging Isp penalty; PSLV four-stage alternating solid/liquid ✓. No errors.

## thrust-and-twr.json — PASS
TWR>1 for liftoff ✓; Saturn V 1.18, N1 1.07 (marginal, 4 failures) ✓; sweet spot 1.2–1.5 ✓; Merlin 845 kN SL ✓; F-1 6770 kN ✓; SLS booster 16 MN ✓; thrust = ṁ·vₑ + (pₑ−p₀)Aₑ ✓; TWR 1.3 → 12.8 N/kg (1.3×9.81=12.75) ✓; Saturn V ~3000 t → ~38 MN needed, 5×F-1 = 33.9 MN SL rising past 40 MN ✓. All arithmetic checks out.

## v-infinity.json — PASS
V∞ = constant on hyperbola asymptotes ✓; C3 = V∞² relationship consistent with c3.json ✓; MRO arrived V∞ ≈ 2.6 km/s, ~1 km/s MOI burn ✓ (approach speed deep in well ~3 km/s; V∞ at asymptote lower — consistent); Voyager 2 Neptune V∞ ≈ ~8 km/s flyby (no insertion) ✓.
