# Descent & Landing — Phase 2: outer + small-body EDL (RFC-034 §12)

**GH issue:** #418 · **Started:** 2026-07-18 · **Branch:** `launch`

**Progress:**
- **S1 ✅** (f57b86ce69) — body regimes/types/constants/guards. typecheck-green.
- **S2 ✅** (6363e06ae2) — 4 archetypes + pressure-terminus integrator branch. typecheck-green.
- **S5a ✅** (b8a5a7a3a0) — the 3 already-flyable missions (hayabusa1/osiris-rex/galileo)
  ship profiles + integrate to honest outcomes; **94 vitest pass** (Galileo hits
  230 g, matching published ~228 g). Density no longer clamps at datum; terminal
  beat recognises probe_signal_lost.
- **Pending:** S4 (models — needs browser verify), S6 (/fly act wiring + no-surface
  terminal cards — needs browser verify), S3 (destination-wiring for the 4 blocked
  missions + 2 new mission JSONs), S7 (RFC-034 §12 doc + TA.md), S5b (the 4 blocked
  missions' profiles, after S3).

**What works today:** the descent *physics* for asteroid TAG + Jupiter probe is
real and tested. **What does NOT yet:** none of the 7 render or trigger in /fly
(no models, no act wiring); the 4 blocked missions have no reachable arrival.

Phase 1 (Moon/Mars/Venus, 37 missions) shipped. Phase 2 extends the `/fly`
Descent & Landing act to the **7 lander/probe missions outside that scope**,
across **4 new body regimes**. Marko approved full scope ("all 7") 2026-07-18.

## Mission scope + reachability (from recon)

| Mission | id | body regime | /fly-reachable today? | Wiring gap |
|---|---|---|---|---|
| Hayabusa 1 | `hayabusa1` | asteroid micro-g (Itokawa) | **YES** (ITOKAWA→`itokawa`) | none |
| OSIRIS-REx | `osiris-rex` | asteroid micro-g (Bennu) | **YES** (BENNU→`bennu`) | none |
| Galileo probe | `galileo` | Jupiter atmosphere (no surface) | **YES** (JUPITER→`jupiter`) | none |
| Hayabusa 2 | `hayabusa2` | asteroid micro-g (Ryugu) | NO (ASTEROID→null) | Ryugu not a DestinationId |
| Rosetta/Philae | `rosetta` | comet 67P micro-g + bounce | NO (COMET→null, explore-only) | comet arc not flyable |
| Cassini/Huygens | (new) | Titan thick-atm parachute | NO | Titan not a target; no Huygens mission JSON |
| NEAR Shoemaker | (new) | asteroid micro-g (Eros) | NO | no mission data at all in repo |

## Slice plan

- **S1 — Physics + body regimes.** Extend `DescentBody` union in
  `src/lib/orbital/descent-physics.ts`; add constants (below) to the 5 Records +
  `BODY_LABEL` in `descent-physics-constants.ts`; add new bodies to `R_BODY_KM`
  in `src/lib/three/descent-scene.ts`; fix the hard-coded 3-body guard in
  `isValidRaw()` in `descent-profile-registry.ts` (line ~310). Add
  `EDLEndTrigger` kind `pressure_pa` (Jupiter has no ground). Add `EDLPhaseKind`:
  `touch_and_go_contact`; generalize `airbag_bounce` for comet multi-bounce. Add
  `DescentEventType`: `harpoon_fire`, `first_contact`, `sample_collected`,
  `probe_signal_lost`, `parachute_jettison`. **Self-contained + compiles with no
  behavior change** (no profile references a new body yet) → good commit point.
- **S2 — Archetypes** (`descent-profile-registry.ts`): `ASTEROID_TOUCH_AND_GO`
  (`powered_retro`→`touch_and_go_contact` exit at v≈0.1, no survivable-touchdown),
  `COMET_HARPOON` (`powered_retro`→`coast`→`bounce`×2→`settle`), `TITAN_PARACHUTE`
  (`ballistic_entry`→`parachute`→`parachute_jettison`→`aeroshell_descent`→ground,
  2.5 h), `JUPITER_PROBE` (`ballistic_entry`→`parachute`→`aeroshell_descent`→
  `pressure_pa` crush, no ground). `ARCHETYPE_SURVIVABLE` entries.
- **S3 — Destination wiring.** Ryugu + Eros as flyable DestinationIds
  (`small-bodies.json`, `lambert-grid.constants.ts`, `mission-dest.ts`); comet-67P
  descent arc (unblock `COMET`); Titan as a target + a **Huygens standalone
  mission JSON** (`static/data/missions/titan/huygens.json`, dest TITAN→`titan`,
  new DestinationId) — mirror the #341 body-wiring checklist; **NEAR Shoemaker
  mission JSON from scratch** (`static/data/missions/eros/near-shoemaker.json`).
- **S4 — Models** (`descent-models.ts` + BUILDERS): `buildHuygensStack` (flat
  dish aeroshell + pressure sphere, no legs), `buildCometLanderModel` (Philae box
  + 3 legs + harpoon rigging in the `airbags` slot), `buildAsteroidSamplerStack`
  (Hayabusa/OSIRIS-REx flat bus + solar wings + sample horn below + ion nozzle),
  Galileo probe (reuse `sphereConeHeatshield` + `parachuteCanopy`, empty terminal
  lander).
- **S5 — 7 descent-profile JSONs** + `/fly +page.svelte` wiring
  (`hasDescentProfile` gate already generic once S1 lands).
- **S6 — No-surface terminal cards.** `handleTouchdown()` per-body: asteroid →
  "SAMPLE COLLECTED · DEPARTED" (no goto), Jupiter → "SIGNAL LOST · N bar", comet
  → "SETTLED (after N bounces)", Titan → "TOUCHDOWN" (no `/titan` route → rest on
  landed frame, same as Venus). DescentScene HUD phase strip variants per regime.
- **S7 — Tests + docs.** `descent-physics.test.ts` / `descent-profiles.test.ts`:
  micro-g soft contact (<0.2 m/s), Jupiter no-touchdown (ends on pressure, not
  ground), comet multi-bounce ordering, Titan soft (~5 m/s), peak-g bands
  (Jupiter ~200–260 g, asteroid ~0, Titan ~10–16 g). RFC-034 §12 Phase-2 section;
  TA.md flight-subsystem line.

## Body constants for S1 (researched — SI, μ=GM)

```
DescentBody union += 'titan' | 'jupiter' | 'comet_67p' | 'itokawa' | 'ryugu' | 'bennu' | 'eros'

                μ (m³·s⁻²)        R (m)         ρ₀ (kg·m⁻³)   H (m)     c_s (m·s⁻¹)   label
titan           8.9780e12         2_574_700     5.3           40_000    194           'Titan'
jupiter         1.26686534e17     69_911_000    0.16          27_000    800           'Jupiter'     (R = 1-bar volumetric; probe descends below datum → denser)
comet_67p       6.662e2 (~667)    1_720         0             1         0             '67P/C-G'     (M≈9.98e12 kg)
itokawa         2.342             165           0             1         0             'Itokawa'     (M≈3.51e10 kg)
ryugu           30.03             448           0             1         0             'Ryugu'       (M≈4.50e11 kg)
bennu           4.892             245           0             1         0             'Bennu'       (M≈7.33e10 kg)
eros            4.463e5           8_420         0             1         0             'Eros'        (M≈6.687e15 kg, mean R from volume)
```

Micro-g note: surface g = μ/R². Itokawa ≈ 8.6e-5 m/s² (~9 µg); Bennu ≈ 8.1e-5;
Ryugu ≈ 1.5e-4; Eros ≈ 6.3e-3; 67P ≈ 2.3e-4. The integrator handles these fine;
`terminalVelocityMs ≈ 0.1` is the meaningful contact speed and g-force readout ≈ 0.

## Verification
`npm run typecheck` after S1; `npx vitest run` after S7; browser `/fly?mission=osiris-rex`
(TAG), `?mission=galileo` (Jupiter probe, no touchdown), `?mission=hayabusa1`.
Regression: an orbiter must still show cruise-only (descent gate must not fire).
