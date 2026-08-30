# S1 · Physics-kernel boundary manifest (for review before any move)

_2026-08-29 · gates #459 (S1) · RFC-037 §3/§7/§8 · **classification is the load-bearing decision; nothing moves until this line is approved.**_

**Rule used to classify:** _kernel_ = a **physics formula** — produces a physical
quantity (force, velocity, position, Δv, time-of-flight, atmosphere, orbit
geometry) and is framework-pure. _app-side_ = anything about **how Orrery
presents/animates** it — cameras, HUD, shots, framing, screen-projection, marker
reveals, debug snapshots, speed pills, sim-clocks, narrative act descriptors.
"Pure function" ≠ "kernel": many camera/shot helpers are pure but are presentation.

Verified by: import-purity grep (three/svelte/`$app`/app-`$lib`/DOM), runtime-impurity
scan (`Date.now`/`localStorage`/`fetch`/`window`/`document`/`new Date`), and leading
docstring of every borderline module.

---

## 1 · KERNEL — move to `src/lib/physics/<subdir>/` (high confidence)

| Target subdir | Modules (sibling `.test.ts` travels with each) |
|---|---|
| `ephemeris/` | `astronomy/{time,planets,moon,horizontal,moon-observer,index}.ts` · `earth-sidereal.ts` ¹ · `universe/kepler.ts` |
| `transfer/` | `lambert.ts` · `lambert-grid.ts`(+`.constants`) · `lambert-geocentric.ts`(+`-grid.constants`) · `orbital.ts` · `interplanetary-geometry.ts` ⁴ · `orbital/{mission-arc,injection-burn,orbit-insertion,find-apsides,predict-ship-pos}.ts` |
| `ascent/` | `orbital/{ascent-physics,ascent-physics-constants,ascent-profiles,launch-profile-registry}.ts` (PEG impl + `peg-guidance.test.ts` live here) |
| `descent/` | `orbital/{descent-physics,descent-physics-constants,descent-profile-registry}.ts` |
| `cislunar/` | *(real cislunar compute = `lambert-geocentric.ts`, already under `transfer/`)* — see ⚠️ REVISION below |
| `satellite/` | `satellite/{tle,propagate,look-angles,stations,index}.ts` (NOT `tle-source`) |
| `propulsion/` | `orbital/{engine-registry,launcher-engines}.ts` |
| `util/` | `parse-delta-v.ts` · `planet-stats.ts` ³ · `earth-regimes.ts` · `orbit-regime-match.ts` |

¹ `earth-sidereal.ts` — `gmstRadians(now: Date = new Date())` default arg is the
only impurity (§7.5). **Scrub:** make the arg required (or accept a JD). Injectable → kernel-eligible after.
² `sample-cislunar-spacecraft` — interpolates precomputed `points[]`; borderline (see §4).
³ `planet-stats.ts` carries a `BODY_PALETTE` (colours, ~line 237) — **presentation data the
ESLint purity gate can't see.** Split the palette out during S1.1 while the file moves
anyway; the numeric tables (`SURFACE_BODY_KINEMATICS`, gravity/escape) are the kernel part.
*(Fable-5 MINOR 3.)*

---

## ⚠️ REVISION (post-Fable-5, 2026-08-29) — cislunar geometry is NOT kernel

Fable-5 BLOCKER 1 (verified against source): `cislunar-geometry.ts`'s `translunarCoast` /
`lunarOrbit` build trajectory **shapes** pinned for visual continuity — no lunar gravity in
the coast; `lunarOrbit` ignores `inclination_deg` "to eliminate the visible gap." By this
manifest's OWN rule (kernel = physical quantity; app = how Orrery presents/animates), those
are **app-side**. The import-purity grep marked them "pure" but pure ≠ computed-physics.

**Revised classification:**
- `cislunar-geometry.ts` (Tier-1 shape-gens) + `sample-cislunar-spacecraft.ts` → **app-side**,
  emitting figures tagged **`geometric`**, rendered in a register visibly distinct from `computed`.
- **`interplanetary-geometry.ts` is SPLIT at S1.2 (Fable-5 round-3 problem 2 — this gates
  S1.2, resolve before the move):** the analytic/closed-form trajectory helpers → kernel
  `transfer/` (`computed`); the **Tier-2 waypoint-replay path → app-side** (`replayed-published`).
  The file may NOT move whole — a kernel that contains a replay producer violates RFC §4's
  "the kernel may NOT emit `geometric`/`replayed`" invariant. If the split proves fiddly at
  S1.2, the fallback is keep the whole file app-side and expose only the analytic helpers the
  kernel needs via a thin re-export. Decide at S1.2 head, not mid-move.
- The **real** cislunar compute — patched-conic TLI/LOI, unit-tested vs Apollo bands — is
  **`lambert-geocentric.ts` (ADR-085)**, already kernel `transfer/`. M2's honest figure
  derives from it, not from the scene shapes.

This narrows the S1 `cislunar/` move; the `transfer/` move is unchanged **except the
`interplanetary-geometry.ts` split above.** S1 otherwise proceeds as approved.

## 2 · APP-SIDE — stay put (presentation / sim-state / cinema)

- **Cameras / shots / framing:** `ascent-cameras`, `ascent-hud`, `descent-hud`,
  `flyby-camera-plan`, `flyby-shots`, `flyby-shot-schedule`, `iconic-frame`,
  `helio-non-flyby-frame`, `cislunar-camera-target`, `cislunar/cislunar-hero-shot`,
  `cislunar/cislunar-screen-projection`, `cislunar/cislunar-marker-reveal`,
  `find-flyby-planet` ("for the iconic-shot composition").
- **Sim state / clocks / cinema windows:** `ascent-clock`, `descent-timewarp`,
  `sub-phase-transition`, `jump-to-met-bias`, `find-active-flyby`,
  `find-active-cislunar-phase`, `fly-debug-frame`, `fly-debug-snapshot`.
- **Rendering (RFC-§2-vs-code discrepancy — see §4):** `scale.ts`, `moon-projection.ts`, `porkchop.ts`.
- **Three-coupled overlays:** `descent-force-layers`, `launch-force-layers`
  (import `$lib/three/*` + `$lib/science-layers`).

## 3 · EXCLUDE / DECOUPLE-FIRST

- **`satellite/tle-source.ts` — EXCLUDE** (genuinely impure: `localStorage` + `fetch`
  + `Date.now` + memo). Confirmed matches RFC §7.3. Stays an app-side adapter.
- **Data-JSON coupling (§7.1, D2-b):** `satellite/stations.ts` imports `station-tles.json`;
  `lambert-grid.constants.ts` + `mission-arc.ts` pull `planets.json`/`small-bodies.json`.
  Co-bundle + CI drift-check per §8 — resolve as part of the move, don't move raw.

## 4 · Boundary decisions — ALL APPROVED (operator, 2026-08-29)

1. ✅ **`scale.ts` + `moon-projection.ts` → app-side** (rendering, not kernel).
   RFC-037 §2 lists them "Utility"; docstrings say rendering ("AU → pixels",
   "for the /moon screen"). **Action: correct RFC §2** (doc-vs-code divergence, rule 28).
2. ✅ **`porkchop.ts` → app-side** (RFC §7.5 locale date/colour helpers = rendering).
3. ✅ **`fly-physics.ts` + `fly-physics-constants.ts` → app-side for S1, untouched.**
   **Correction to the first draft:** this is NOT "the cheap keplerPos approximation"
   (keplerPos lives in `orbital.ts`). `fly-physics.ts` is a thin **`/fly`-renderer
   helper** — a MIX of real physics (`heliocentricSpeed` = vis-viva; `signalDelayMin`
   = light-time; unit conversions) and **presentation** (`moonPositionAtMet` /
   `moonOutboundArc` / `moonReturnArc` = Bézier *visual* arcs on `MOON_VISUAL_DISTANCE
   = 100`, a camera distance, not physical). Only `routes/fly/+page.svelte` + tests
   import it. **S1: leave app-side as-is** (splitting real-vs-visual is fiddly, blocks
   nothing). **S2: vis-viva + light-time become first-class registered kernel formulas**;
   `/fly`'s helper then delegates to the kernel or stays a thin adapter.
   Constants split at S2: `MU_SUN`/`AU_TO_KM`/`C_LIGHT` → kernel `util/`; `MOON_VISUAL_*`
   stay app-side. *Optional S2+:* expose a labelled `fast` kernel formula so the
   workbench can plot fast-vs-accurate and show the approximation error (honesty-line demo).
4. ⚠️ **REVISED post-Fable-5 (see the REVISION block above): `sample-cislunar-spacecraft`
   → app-side (`geometric`), NOT kernel** — it interpolates precomputed scene points, not
   physics. `earth-orbit-registry` ("the middle act… coast descriptors") → app-side. The real
   cislunar compute is `lambert-geocentric.ts`, already in `transfer/`.

### Fly-sims in the workbench (operator requirement, resolved)

A workbench fly-sim (launch → transfer → capture → descend) is driven by the
**flight integrators in the kernel** — `ascent-physics`, `injection-burn`,
`lambert*`/`lambert-geocentric`/`mission-arc`, `orbit-insertion`, `descent-physics` —
using the **authoritative JPL-Standish ephemeris** (§9), i.e. **higher fidelity than `/fly`'s
rendered path**. (The cislunar *leg's* on-screen trajectory renders from the app-side
`geometric` producer, honestly labelled — the computed TLI/LOI numbers come from
`lambert-geocentric`, not the scene shape.) It does NOT depend on `fly-physics.ts`. Two flavors:
**linear fly-sim at S3** (Notebook cards referencing the card above) · **free-form
wired fly-sim at S5** (Canvas graph engine). This is PRD-033 T2 composition —
"/fly's physics, authored by the user instead of scripted."

## 5 · Sub-slice sequence for S1 (each = commit + `npm run preflight` green)

1. **S1.0 — this manifest approved** + `src/lib/physics/` skeleton + ESLint
   `no-restricted-imports` gate scaffolded (not yet enforcing).
2. **S1.1 — `util/` + `ephemeris/`** (leaf-most, fewest inbound deps; scrub `earth-sidereal`).
3. **S1.2 — `transfer/`** (`lambert*`, `orbital.ts`, `mission-arc`; resolve JSON co-bundle here).
   ⁴ **SPLIT `interplanetary-geometry.ts`**: analytic helpers → kernel; Tier-2 waypoint-replay
   → app-side (`replayed-published`). Do NOT move whole (see REVISION). Gates this sub-slice.
4. **S1.3 — `ascent/` + `descent/` + `propulsion/`.**
5. **S1.4 — `satellite/`** (exclude `tle-source`). *(No `cislunar/` kernel move — the Tier-1
   shape-gens are app-side per the REVISION; the real cislunar compute `lambert-geocentric.ts`
   moved with `transfer/` in S1.2.)*
6. **S1.5 — turn the ESLint purity gate to ERROR** + public `physics/index.ts` with
   per-export units + citations + the D2-b drift-check in CI.

Blast radius measured: ~55 kernel modules, **69 importing files** repo-wide
(heaviest: `lib/three` 16, `lib/components` 9, routes). Each sub-slice rewrites only
the importers of the modules it moves, so the diff stays reviewable per step.

---

## Appendix · The Workbench Validation idea (operator note, 2026-08-29) — where it fits

Operator's insight: once the kernel is carved and the Notebook exists, `/lab` becomes
an **independent end-to-end validation harness** for the science — a canonical
"workbench scenario" per formula (launch a rocket, plan an orbit, …) that plots the
diagram/table, gets the numbers, and validates the physics **outside** the scripted
`/fly` `/plan` surfaces. Full coverage = every registered formula has a passing
workbench scenario. A **new test class**, distinct from the existing unit tests.

**Proposed placement:** a rider on **S2 (registry+FigureSpec)** feeding **S3 (Notebook)**:

- The **registry (S2)** already enumerates every formula → it is the coverage checklist.
- One **canonical scenario per registered formula**, authored as a seed Notebook, doubles as:
  - **Product** — the example-worksheet gallery `/lab` ships with.
  - **Golden-master test** — snapshot each scenario's `FigureSpec` JSON + `values`
    as committed fixtures; CI diffs them. End-to-end kernel validation, not unit.
  - **Register-distinction golden-master (Fable-5 round-3 problem 4)** — the honesty-line
    enforcement CANNOT be a FigureSpec-JSON snapshot (register lives in *renderer styling*,
    not the data). It must be a **rendered-SVG snapshot** (or a renderer test asserting
    distinct per-fidelity CSS classes) proving `computed` / `geometric` / `replayed-published`
    draw in visibly separate registers. Name it explicitly in S2.5.
  - **Completeness gate** — a formula with no passing workbench scenario is "not done."

→ **CONFIRMED (operator, 2026-08-29): tracked as S2.5 "Workbench Coverage Suite"**,
its own slice riding on S2→S3. Includes fly-sim scenarios (launch a rocket, plan an
orbit) that validate the flight integrators end-to-end. Size when S2 is picked up;
cheap *relative to* S2 because it consumes the same registry. Needs a GH issue under
epic #458 when we reach S2.
