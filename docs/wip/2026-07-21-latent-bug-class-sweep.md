# Latent bug-class sweep — 2026-07-21

After the launch-epic merge surfaced regressions in CI docker-e2e, a read-only
sweep looked for adjacent instances of the same bug-classes. Concrete inventory
below; the permanent rules live in **AGENTS.md → "Recurring bug-classes"**.

Status legend: **FIXED** (done this pass) · **DECIDE** (needs Marko's call) ·
**WATCH** (latent, low/predictable risk — fix opportunistically).

## Class 1 — `{#each}` keyed by a non-unique display string → runtime `each_key_duplicate`

- **FIXED** `src/routes/colophon/+page.svelte:164` — models/canvas keyed by `it.title`
  (two models shared a title) → now `it.thumb`.
- **FIXED** `src/routes/colophon/+page.svelte:216` — `data.writing` keyed by `it.title`
  → now composite `(it.route + '@' + it.title)`. (Title+route both unique *today*,
  but neither is schema-guaranteed; composite can't collide.)
- **WATCH** `src/routes/library/episodes/+page.svelte:180` — `epSources as src (src.label)`.
  Citation labels ("NASA", "Wikipedia") could repeat across an episode's sources.
  Fix if it ever throws; key by a composite or index.
- **WATCH** `src/lib/components/LaunchTelemetry.svelte:138` — `stages as st,i (st.name)`.
  Parallel-staging vehicles could have two "Booster" stages. Key by index `(i)` if seen.
- LOW / compile-time-constant keys (no action): programs `sec.label`, FleetEntryPanel
  `specRows`/`crew`, LensLegend, reading-list/watch-list static curated titles.

## Class 2 — Hardcoded data-derived COUNTS in e2e (brittle vs content growth)

Predictable future breakage — the number is right until the catalog grows. Not a
product bug; a test-maintenance cost. Prefer `toBeGreaterThanOrEqual(N)` + loose
upper bound, or read the count from the data in setup.

- **WATCH** `tests/e2e/missions.spec.ts` — ~16 uses of `toHaveCount(125)` (total missions)
  as a precondition; every new mission reds all of them. Also filter counts
  MARS=20 (`:44`), MOON=32 (`:55`), JUPITER=5 (`:81/:88`).
- **WATCH** `tests/e2e/list-search.spec.ts:61` `toHaveCount(125)` missions · `:113` `toHaveCount(252)` fleet.
- **WATCH** `tests/e2e/fly.spec.ts:211` `toHaveCount(125)` missions.
- **WATCH** `tests/e2e/launches-timeline.spec.ts:48` `toHaveCount(7)` decade pills — **near-term**:
  becomes 8 when the 2027-36 decade opens.
- **WATCH** `tests/e2e/landing.spec.ts:24` cards=11 · `:56` footer links=7 (comment already
  notes it changed once).
- (fleet 251→252 already fixed in the merge.)

## Class 3 — Per-frame GPU cost on an INTERACTIVE 3D scene (software-GL regression)

The exact class we removed from SurfaceScene (IBL starved rAF on GPU-less CI).

- **FIXED** `src/lib/surface-scene/SurfaceScene.svelte` — IBL removed.
- **DECIDE** `src/lib/three/fly-helio-scene.ts:347` — `scene.environment = heroEnvironment(renderer)`
  on the **/fly heliocentric** scene, which HAS user wheel/pinch zoom + orbit drag +
  a per-rAF loop. Same latent software-GL risk as SurfaceScene. **BUT** /fly docker-e2e
  is green (its zoom tests may not stress timing the way surface-flat-patch does), AND
  /fly is the cinematic flagship where hero-model reflections matter most
  ([[project_fly_cinematic_vision]]). **Do NOT blind-revert** — options: (a) leave it
  (cinematic value, tests green), (b) gate the IBL to high/ultra tiers only, (c) remove.
  Needs Marko's call.
- **WATCH** `src/lib/three/ascent-renderer.ts:53` — IBL on Launch/Coast/Descent scenes.
  These are **scripted cinematics (no user zoom)** — the camera is on a timeline rail,
  so no variable-cost interaction to starve. Lower risk; the per-rAF IBL cost still
  exists on software GL but no tight interactive-timeout test depends on it. Watch.

## Class 4 — Exhaustive `Record<Union, T>` maps (tsc-caught, but a sync checklist)

tsc flags a missing key **only in the tsconfig that compiles the file** — the merge's
`EDL_SYSTEM` gap only showed in `typecheck:scripts`. High-maintenance unions (extend
the union → update ALL of these together):

- **`ArchetypeName`** → `descent-profile-registry.ts` `ARCHETYPES` (:335) + `ARCHETYPE_SURVIVABLE`
  (:351) + `scripts/backfill-descent-arrival.ts` `EDL_SYSTEM` (:25).
- **`LayerKey`** → `science-layers.ts` `LAYER_DEFAULTS` (:95) + `ScienceLayersPanel.svelte`
  `$state<Record<LayerKey,boolean>>` (:70) — verify the `$state` initializer is tsc-checked
  after any `LayerKey` addition; it may not flag as reliably as the explicit `Record`.
- Smaller stable unions (ForceKey, EDLPhaseKind, ArSceneType, etc.) — one map each, low risk.
