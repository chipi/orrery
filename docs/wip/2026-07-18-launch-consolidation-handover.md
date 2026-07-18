# Handover — Consolidate launch/ascent into one extensible `/fly` system (delete dev workbenches)

*2026-07-18 · status: PLAN APPROVED, not yet implemented · pick up at S1*

This note is self-contained: the approved plan + the exact working-tree state + gotchas, so a fresh session can execute without re-deriving anything. (Original plan file: `~/.claude/plans/cozy-herding-token.md`.)

---

## Goal

`/dev/ascent` (1097 lines) and `/dev/launch` (38 lines) are **parallel deep-copies** of the `/fly` launch pre-roll — they re-implement the scene/renderer/HUD/physics/telemetry that `<LaunchScene>` already owns, plus dev-only affordances `/fly` lacks. The end state: **one launch/ascent implementation inside `/fly`**, every useful affordance ported in (nothing lost), the dev routes deleted, and the whole thing a **tested, well-interfaced foundation that arrival + descent/landing extend** (RFC-034 §9: `pad → orbit → cruise → arrival → descent → surface`; descent = same EOM, thrust reversed). Everything must keep working as it does today.

**Marko's hard rules on this epic (learned the hard way this session):**
- Do NOT delete anything until its functionality is confirmed present in `/fly`. He nearly lost `/dev/ascent`'s tools to a premature delete.
- No parallel/duplicate implementations. ONE main thing.
- Great, scalable, well-tested architecture with good interfaces — this is the foundation for arrival/landing.

## Scope decisions (locked)

IN scope: forces-as-Science-Lens-layers, formal phase interfaces, the unified pad→arrival scrubber, the ascent-losses Δv-ledger + new `/science` articles.
OUT of scope: **only** the descent/arrival *implementation* — build its seams (FlightPhaseScene contract, clock `Phase` union, headless physics core) + docs, not the feature.

---

## Current working-tree state (uncommitted — KEEP, it's the groundwork)

Last commit: `be808b72c7` (the 15 launch-epic files, pushed to `origin/launch`). Everything below is uncommitted on top of it.

**Already done this session (good — the plan builds on it):**
- `src/lib/orbital/ascent-hud.ts` (NEW) — pure HUD logic (`padState`, `buildAscentBeats`, `ascentStatus`, `countdownSeconds`, `T_MINUS_S`, `IGNITION_T_S`, `ORBIT_TARGET_KMS`, `BEAT_LABEL`) + `ascent-hud.test.ts`. Tested.
- `src/lib/three/ascent-renderer.ts` (NEW) — shared ACES+FilmPass+Vignette renderer factory (`createAscentRenderer`).
- `LaunchScene.svelte` / `LaunchTelemetry.svelte` — refactored: collapsed props (`LaunchTelemetry` takes `profile` not 8 exploded props), use `ascent-hud` + `ascent-renderer`, `$derived`/`untrack` state fixes.
- `ascent-physics.ts` — added `totalDurationS` to `AscentSummary`; fixed `maxTS` doc (2000), `aeroHeatFlux` unit label, removed dead `burnout` event, documented `source_tier`.
- `launch-profile-registry.ts` — `matchFlagship` now covers all 11 flagship IDs (was 3) + `launch-profile-registry.test.ts`, `ascent-profiles.test.ts` (drift guard vs `falcon-9.json`), guidance tests in `ascent-physics.test.ts`.
- `VEHICLE_LENGTH_KM` exported from `ascent-scene.ts` (was hard-coded 1.2 in 3 places).

**Restored to ORIGINAL (still the parallel copies — deleted in S4, NOT gutted):**
- `src/routes/dev/ascent/+page.svelte` (original 1097-line workbench)
- `src/routes/dev/launch/+page.svelte` (original thin mount)
- `src/lib/three/launch-ground.ts` (reverted a coverage-driven split; `resolveLaunchGround` is inline again — do NOT re-split)

Verified green as of this session: `typecheck` 0 errors, full `vitest` 197 files / 3933 tests, `test:coverage` 88.89/75.5/83.31/91.51 (gate: 88/73/82/90). Browser-smoked `/fly` untouched.

## Gotchas
- **NODE_OPTIONS dead `--require`**: every `node`/`npm` in this worktree dies `MODULE_NOT_FOUND` on `.../cmux-claude-node-options/restore-node-options.cjs`. Fix per-command: `export NODE_OPTIONS="--max-old-space-size=4096"` before running. Never `--no-verify`.
- Dev server: reuse or start on a unique port (`npm run dev -- --port 5399 --strictPort`); other sessions run 5199/5588 — never kill them. Kill only your own port when done.
- No e2e/nav references to `/dev/ascent` or `/dev/launch` (verified) — safe to delete in S4.
- Coverage: v8 only counts files LOADED by tests. WebGL builders (`ascent-scene`, `ascent-renderer`, `launcher-models`, `launch-ground`) aren't loaded → not counted today; S5 adds them to the explicit `vite.config.ts` exclude list per the `explore-scene.ts` precedent.

---

## The plan — S1…S8 (each ships + verifies)

### S1 — Formalize the phase-scene contract
- NEW `src/lib/three/flight-phase-scene.ts`: `interface FlightPhaseScene { scene; camera; setState(s); setAspect(a); setForceVisible(f: ForceKey, on); setForcesVisible(on); snapCamera(); reset(); dispose() }` + `type ForceKey = 'thrust'|'weight'|'drag'|'velocity'`. Pure types.
- `ascent-scene.ts`: `AscentScene extends FlightPhaseScene`; add per-vector `setForceVisible(force, on)` next to the existing group `setForcesVisible`. Force arrows already exist individually: `arrThrust/arrWeight/arrDrag/arrVel` (ascent-scene.ts ~L397-401), grouped in `forces` (L386), `showForces` flag (L403), `updateForces` (L442), `setForcesVisible` (L561). Per-vector = track a visibility bool per arrow + set `arr.visible`.
- `ascent-renderer.ts`: change the param type `AscentScene` → `FlightPhaseScene` (it only touches `.scene/.camera/.setAspect`).

### S2 — Force-vectors become Science-Lens layers (RFC-034 §11.2)
- `science-layers.ts`: add `thrust` + `drag` LayerKeys (reuse `gravity`=weight, `velocity`); add to `LAYER_ORDER`, `LAYER_DEFAULTS` (off), `metaFor()`; `/fly`-only like `coast`/`conics`.
- `science-layers.test.ts`: bump the `29`→`31` count assertion; union/order/defaults exhaustiveness stays green.
- NEW pure `LAYER→ForceKey` map (`{thrust→thrust, gravity→weight, drag→drag, velocity→velocity}`) + unit test.
- `LaunchScene`: on mount + `onLayerChange`, drive `sceneObj.setForceVisible(force, isLayerOn(layer))`. Real user feature (not debug-gated). Replaces `/dev/ascent`'s ad-hoc `forcesOn` toggle + legend (the lens panel is the legend now). Pattern to copy: `/fly` L2224/L2902 `onLayerChange` subscriptions.

### S3 — Port dev-only tools into `/fly` behind `?debug=1`
(Scrubber/play/speed are NOT here — they become the unified clock in S7.)
- `LaunchScene`, under existing `debugMode` (`?debug=1`, already at LaunchScene L66-68):
  - Window hooks `__ascentSetT`, `__ascentDebug`, `__topDownKm`, `__camOverride` (from /dev/ascent L258-292), `import.meta.env.DEV`-guarded.
  - URL pad-overrides `?lat/lon/off/yaw/launcher` → `createAscentScene` opts (from /dev/ascent L212-243).
  - `<AscentCameraDebug>` already renders under debugMode — keep.
- These let `/dev/ascent` be deleted with no loss even before S7.

### S4 — Delete the dev workbenches
- `rm -rf src/routes/dev/ascent src/routes/dev/launch`. Fix stale `/dev/ascent` doc-comments in `ascent-scene.ts`, `ascent-renderer.ts`, `ascent-hud.ts`, `LaunchScene`, `LaunchTelemetry`.

### S5 — Tests + coverage policy
- Add WebGL builders to `vite.config.ts` coverage `exclude[]` (`ascent-scene.ts`, `ascent-renderer.ts`, `launcher-models.ts`, `launch-ground.ts`) with the `explore-scene.ts`-style rationale comment. `flight-phase-scene.ts` (pure) + all `ascent-*` lib stay counted.
- Tests: `ascent-clock` `defaultRegimeFor` (the one lib coverage gap), science-layers (+layers), force-layer map.
- `npm run test:coverage` stays green.

### S6 — Document the extension path
- RFC-034 §9 addendum (or ADR): `FlightPhaseScene` + headless physics core + clock `Phase` union are the descent/arrival seams. Name future files (`descent-physics.ts`, `descent-scene.ts`, `DescentScene.svelte`) + `Phase = 'ascent'|'cruise'|'arrival'|'descent'` widening. Keep TA.md honest.

### S7 — Unified pad→arrival scrubber (RFC-034 §4/§11/S6) — the capstone (HIGHEST RISK)
Replaces today's split (launch autoplay + SKIP button; separate cruise scrubber) with ONE continuous timeline. Pure clock math already exists + tested in `ascent-clock.ts` (`makeTimeline`, `scrubberToPoint`, `pointToScrubber`, `advanceClock`, `ASCENT_SPEED_MULTIPLIERS`, `CRUISE_DAYS_PER_SEC`, `defaultRegimeFor`, `Phase='ascent'|'cruise'`).
- `/fly` master clock: `timeline = makeTimeline(summary.totalDurationS, cruiseDurationDays, 0.15)`. Existing `/fly` scrubber becomes `u∈[0,1]`; `pt = scrubberToPoint(u, timeline)`. Play advances via `advanceClock`. Seam `u = ascentScrubberFraction` = injection/handoff.
- LaunchScene becomes clock-driven: `t`/`playing`/`speed` move from internal state to **props/bindings** fed by the master clock (`ascentT`). Keeps its render rAF; no longer self-advances. `showLaunch = pt.phase === 'ascent'`. This is the extensibility payoff — a future DescentScene is driven the same way.
- Speed pills swap set at the seam (ascent real-time × vs cruise day/s). Warp fires crossing the seam forward; scrubbing back re-shows the launch (reset warp). Countdown auto-plays as the launch intro (scrubber range = liftoff→arrival).
- `prefers-reduced-motion` hard-freeze per ADR-025.
- RISK: `/fly/+page.svelte` is 10k lines with a deeply-embedded cruise time system (`simDay`/`simSpeed`/`isPlaying` L487-726, scrubber L1346, `togglePlay` L1328, `setSpeed` L1339). Rewire incrementally; browser-smoke each step.

### S8 — Ascent-losses Δv-ledger layer + `/science` articles (RFC-034 §11.2)
- Physics: add `lossGravityKms`/`lossDragKms`/`lossSteeringKms` (running totals to time t) to `AscentState`; `integrateAscent` already integrates the 3 loss rates each step — snapshot running totals into each sampled state. Test: monotonic, non-negative, final == `summary.losses`.
- `ascent-losses` Science-Lens layer (3rd new LayerKey → 32 layers; bump exhaustiveness test).
- NEW `src/lib/components/AscentLosses.svelte` — small HUD panel (gravity/drag/steering/total Δv, live from `state.loss*Kms`); rendered by LaunchScene when the layer is on.
- NEW `/science` articles: `thrust-to-weight`, `gravity-turn`, `max-q`, `rocket-equation`, `staging-mass-ratio` via the `/science` localization pipeline (getLocale overlays, per-locale prerender, 14 locales — `scripts/wave23` toolchain; see project_science_localization_architecture memory). ScienceChip `?name=` cross-links from launch lens layers + ledger + LaunchTelemetry `<em>` labels (tsiolkovsky/max-q/dv-budget). **Largest content piece** — runs through the translate toolchain, not hand-authored per locale.

---

## Verification (prove nothing lost)
1. `npm run typecheck` 0 errors; `npx eslint` touched files 0.
2. full `npx vitest run` + `npm run test:coverage` green, gate held.
3. Browser smoke `/fly?...&launch=1` on a launch mission: one continuous scrubber pad→orbit→cruise→arrival, speed pills switch at seam, scrub-back re-shows launch; toggle `thrust`/`drag`/`gravity`/`velocity` → vectors on rocket; `ascent-losses` → live ledger; lens/ledger cross-link to new `/science` articles; `?debug=1` → `__ascentSetT`/pad-overrides/cam-debug work; production `/fly?launch=1` (no debug) unchanged.
4. `/dev/ascent` + `/dev/launch` gone; `/fly` launch renders identically to today.
5. Docs build green (`/science` strict prerender, 14 locales); i18n bundles current.

## Files
- NEW: `flight-phase-scene.ts`, launch-force-layer map + test, `AscentLosses.svelte`, 5 `/science` articles (+14-locale overlays), RFC-034 addendum.
- EDIT: `ascent-scene.ts`, `ascent-renderer.ts`, `ascent-physics.ts` (+test), `LaunchScene.svelte`, `science-layers.ts` (+test), `src/routes/fly/+page.svelte` (S7), `vite.config.ts`, stale comments.
- DELETE: `src/routes/dev/ascent`, `src/routes/dev/launch`.
- KEEP: `ascent-hud.ts`, `ascent-clock.ts`, `ascent-cameras.ts`, `LaunchTelemetry.svelte`, `launch-profile-registry.ts` (+ this session's tests).
