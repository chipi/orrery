# Flight computers — forward plan (post Fable-5 adversarial review)

> 2026-08-31 · sequences the ADR-088 review fixes ahead of the new entry work
> (Mars guided-lifting → #29 skip → lunar return → Lab range-control lesson).
> Rationale: #29 EXTENDS the same entry model the review found mis-calibrated;
> building on it first repeats the mistake. Fix the base, then build up.

## The review in one paragraph

Fable 5 (adversarial) found the range-control entry work is honest in its ADR
*Non-goals* but fails the honesty bar in three load-bearing places: (1) the
"~7 g matching the flown value" claim is validated against LUNAR-return sources
for LEO-return profiles — the real Apollo 7 LEO peak was **3.3 g** (web-verified
FAA/NASA), inflated to ~7 g by a **4° entry angle** ~2× steeper than the real
~1.5°; (2) `targetDownrangeKm` (1400–1700 km) were fitted to be solvable in that
steep footprint, shipped under `flagship` mission-report provenance with nothing
marking them synthetic; (3) the systems-layer "entry computer"
(`solveEntryBankForRange`) is **dead code** — the app uses a duplicate solver
buried in the engine, breaking the ADR-087 architecture the feature is named for.
Plus real bugs: capsule L/D applied to parachute drag (M1), no post-solve
residual guard (M3), silent-garbage path when a target has no lift (M4).

## Phase 0 — Fix the base (BLOCKS everything else)

The calibration + entry-angle work is a prerequisite for #29: Mars and lunar
return re-use the same γ/lift/downrange integration, and the same peak-g bands.

- **0a — Re-calibrate Earth entry angle + peak-g (C1, C2).** Re-author the Earth
  capsule `flightPathAngleDeg` from 4° → the real ~1.5–2° LEO-deorbit band.
  Re-measure: at 1.5° full-lift-up ≈ 2.4 g, so a realistic mid-footprint target
  will fly a partial bank and land near the flown 3.3 g — the model becomes
  self-consistent with history. Re-band `descent-profiles.test.ts` earth peak-g
  to the flown envelope (LEO ~3–4.5 g; Mercury ballistic ~7–8 g, not 11). NOTE:
  4° is PRE-EXISTING across all 31 Earth profiles — this touches ballistic
  capsules too. Scope decision for the operator: minimal (fix only the claim +
  band, keep 4°, label it steeper-than-flown) vs full (re-author angles). Full
  is the honest one and it makes 0c's targets fall out naturally.
- **0b — Correct ADR-088 + mark synthetic fields (C1, C3).** Rewrite the
  calibration sentence to cite the LEO-return 3.3 g (not lunar 7 g). Add a
  per-field provenance marker (or an ADR sentence) naming which profile fields
  are invented (angle, L/D, target) vs sourced (mass, Cd·A). Add the Mars-guided
  gap to §Non-goals (currently only in a code comment — M5).
- **0c — Realistic targets (C3).** Re-derive `targetDownrangeKm` from real
  entry-interface→landing ranges (~2,000–3,000 km class) once 0a fixes the
  footprint; verify each sits inside its capsule's footprint.
- **0d — Wire OR delete the dead entry computer (C4).** Decide: make
  `integrateGuidedDescent` call shared `systems/entry-steering` logic (honest but
  the dynamics differ — chutes vs standalone), OR delete `solveEntryBankForRange`
  + downgrade the "same computer" docstring to "same range-target→bank
  principle." Recommendation: KEEP `solveEntryBankForRange` as the Lab-facing API
  (Phase 3 consumes it) and make the app's guided solve delegate to it where the
  dynamics allow; at minimum fix the false docstring now.
- **0e — Bug fixes (M1, M3, M4).** Apply lift only in `ballistic_entry` (not
  under canopy); add a post-bisection residual check → `targetReachable=false`
  when the miss exceeds tolerance; guard `targetDownrangeKm` set with no effective
  lift (throw or skip-guidance+warn). Add a `validate-data` check for the new
  fields.
- **0f (optional) — M6 perf.** Share one `integrateDescent` summary between the
  two `$derived` call sites instead of running the 100 ms bisection twice.

Gate: preflight green + the corrected peak-g band + a fresh /fly screenshot
showing the honest numbers.

## Phase 1 — #29 super-circular skip model (UNBLOCKS Mars + lunar)

The one model extension both Mars-guided and lunar-return need. Per the earlier
advisor guidance:
- Remove the γ-floor (`descent-physics.ts` ~580) for the lifting super-circular
  case so γ can go negative (climb) — the physical skip.
- Add an exo-atmospheric Keplerian coast (or semi-implicit Euler) above ~100 km
  to bound Euler energy drift over the skip arc.
- Turn the skip from a terminal outcome into logged events (`skip_out`,
  `second_entry`); only truly hyperbolic exit is terminal.
- Track specific energy E = v²/2 − μ/(R+h) as the teaching diagnostic +
  integrator-quality check.
- Write ADR-089 (super-circular lifting entry + skip).

## Phase 2 — Mars guided-lifting entries

On the Phase-1 model: author `liftToDragRatio` (~0.24) + guided targets for the
real guided lifting entries — Curiosity/MSL (the FIRST guided Mars entry),
Perseverance, Tianwen-1. Keep Viking small-lift; MER/Phoenix/InSight stay
ballistic (correct). Bank-reversal is still out of scope (planar) — disclose.
Surface in the /fly Mars EDL dossier.

## Phase 3 — Lunar return (11 km/s) + the Apollo round-trip capstone (#29 core)

The marquee case: Apollo CM entering Earth's atmosphere from the Moon at 11 km/s,
where the corridor is a knife-edge and the skip (Apollo 4 double-g-pulse) is the
drama. Add the lunar-return entry as a flight; compose the full Apollo round-trip
capstone goal (ascent PEG → TLI → LOI → powered descent → lunar ascent → TEI →
11 km/s guided skip entry) end-to-end through all three computers + stage
formulas. This is the original #29 deliverable.

## Phase 4 — Lab range-control lesson

The "entry-computer" education deliverable. A Lab goal + formula that consumes
`solveEntryBankForRange` (given a real home in Phase 0d): user sets a target
downrange, watches the computer solve the bank, fly to it, and the range/g trade
(near targets cost g). Figure + 14-locale i18n + goal. Closes the systems family.

## Parallel / independent

- **#32 encyclopedia article-gap audit** — lifting-body article (M2-F2/HL-10/X-24
  → Shuttle/Buran lineage) + the gap scan. Independent of the above; can slot
  anywhere.

## Sequencing summary

```
Phase 0 (fix base)  ──blocks──▶  Phase 1 (#29 skip model)
                                      ├──▶ Phase 2 (Mars guided)
                                      └──▶ Phase 3 (lunar return + Apollo capstone)
Phase 4 (Lab lesson) ── needs Phase 0d (wire solveEntryBankForRange)
#32 (articles) ── independent
```

## Open decisions for the operator

1. **Phase 0a scope:** minimal (fix claim + band, keep 4°) vs full (re-author all
   Earth entry angles to ~1.5°). Full is more honest and makes targets natural,
   but touches 31 pre-existing profiles + their test bands.
2. **Commit boundary:** commit the CURRENT block first (with 0b's ADR correction
   folded in so nothing false ships), then Phase 0 fixes — or fold Phase 0 into
   the current uncommitted block before any commit?
3. **Order:** operator said "Mars, then #29, then lunar return, then Lab." Phase 1
   (#29 skip model) is the shared prerequisite for BOTH Mars and lunar — so the
   real order is 0 → 1 → {2 Mars, 3 lunar} → 4. Confirm.
```
