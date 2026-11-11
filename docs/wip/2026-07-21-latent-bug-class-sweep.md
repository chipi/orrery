# Latent bug-class sweep — 2026-07-21

**Status 2026-11-08 (re-checked after 0.9.7; the 2026-11-04 findings below still hold):** reference (rules live in AGENTS.md 'Recurring bug-classes', AGENTS.md:773), mostly closed. Class 3 DECIDE resolved by option (b): IBL is tier-gated (`2f768f913d5`, `quality.iblEnabled` at `src/lib/three/fly-helio-scene.ts:346`, `ascent-renderer.ts:63`). Class 2: the `toHaveCount(125)` totals are gone from missions/list-search/fly specs; still hardcoded: `tests/e2e/missions.spec.ts:59,70,96` (20/32/5), `launches-timeline.spec.ts:48` (7 decade pills), `landing.spec.ts:28` (22 cards). Class 1 WATCH items unchanged: `src/routes/library/episodes/+page.svelte:185` still keyed by `src.label`, `src/lib/components/LaunchTelemetry.svelte:174` by `st.name`. Class 4 re-checked 2026-11-08: the maps still exist but moved: `ARCHETYPES` / `ARCHETYPE_SURVIVABLE` are at `src/lib/physics/descent/descent-profile-registry.ts:414,431`, `EDL_SYSTEM` is in `src/lib/physics/descent/descent-arrival.ts:17` (no longer in `scripts/backfill-descent-arrival.ts`), `LAYER_DEFAULTS` at `src/lib/science-layers.ts:117`, the `$state<Record<LayerKey, boolean>>` at `ScienceLayersPanel.svelte:70`. Class 1 WATCH details: the `src.label` each at `library/episodes/+page.svelte:185` never renders today (`audio/episode-sources.json` has no episodes) and no launch profile in `static/data/launch-profiles` has two stages with the same name. Keep as live watch-list; not an archive candidate until Class 1/2 WATCH rows are fixed or dropped.

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
- **WATCH** `src/routes/library/episodes/+page.svelte:185` — `epSources as src (src.label)`.
  Citation labels ("NASA", "Wikipedia") could repeat across an episode's sources.
  Fix if it ever throws; key by a composite or index.
- **WATCH** `src/lib/components/LaunchTelemetry.svelte:174` — `stages as st,i (st.name)`.
  Parallel-staging vehicles could have two "Booster" stages. Key by index `(i)` if seen.
- LOW / compile-time-constant keys (no action): programs `sec.label`, FleetEntryPanel
  `specRows`/`crew`, LensLegend, reading-list/watch-list static curated titles.

## Class 2 — Hardcoded data-derived COUNTS in e2e (brittle vs content growth)

Predictable future breakage — the number is right until the catalog grows. Not a
product bug; a test-maintenance cost. Prefer `toBeGreaterThanOrEqual(N)` + loose
upper bound, or read the count from the data in setup.

- **FIXED** the `toHaveCount(125)` (total missions) and `toHaveCount(252)` (fleet) preconditions in
  `missions.spec.ts`, `list-search.spec.ts` and `fly.spec.ts`: no such count is left (checked 2026-11-08).
- **WATCH** `tests/e2e/missions.spec.ts:59,70,76,96,103` — filter counts MARS 20, MOON 32, JUPITER 5.
- **WATCH** `tests/e2e/launches-timeline.spec.ts:48` `toHaveCount(7)` decade pills — **near-term**:
  becomes 8 when the 2027-36 decade opens.
- **WATCH** `tests/e2e/landing.spec.ts:28` cards=22 (was 11) · `:66` footer links=9 (was 7; the
  comment above it already notes it changed several times).
- (fleet 251→252 already fixed in the merge.)

## Class 3 — Per-frame GPU cost on an INTERACTIVE 3D scene (software-GL regression)

The exact class we removed from SurfaceScene (IBL starved rAF on GPU-less CI).

- **FIXED** `src/lib/surface-scene/SurfaceScene.svelte` — IBL removed.
- ~~**DECIDE** `src/lib/three/fly-helio-scene.ts:347`~~ — resolved by tier-gating the IBL in `2f768f913d5` (option b); original text: — `scene.environment = heroEnvironment(renderer)`
  on the **/fly heliocentric** scene, which HAS user wheel/pinch zoom + orbit drag +
  a per-rAF loop. Same latent software-GL risk as SurfaceScene. **BUT** /fly docker-e2e
  is green (its zoom tests may not stress timing the way surface-flat-patch does), AND
  /fly is the cinematic flagship where hero-model reflections matter most
  ([[project_fly_cinematic_vision]]). **Do NOT blind-revert** — options: (a) leave it
  (cinematic value, tests green), (b) gate the IBL to high/ultra tiers only, (c) remove.
  Needs Marko's call.
- **WATCH** `src/lib/three/ascent-renderer.ts:63` (tier-gated by `iblEnabled`) — IBL on Launch/Coast/Descent scenes.
  These are **scripted cinematics (no user zoom)** — the camera is on a timeline rail,
  so no variable-cost interaction to starve. Lower risk; the per-rAF IBL cost still
  exists on software GL but no tight interactive-timeout test depends on it. Watch.

## Class 4 — Exhaustive `Record<Union, T>` maps (tsc-caught, but a sync checklist)

tsc flags a missing key **only in the tsconfig that compiles the file** — the merge's
`EDL_SYSTEM` gap only showed in `typecheck:scripts`. High-maintenance unions (extend
the union → update ALL of these together):

- **`ArchetypeName`** → `src/lib/physics/descent/descent-profile-registry.ts` `ARCHETYPES` (:414) + `ARCHETYPE_SURVIVABLE`
  (:431) + `src/lib/physics/descent/descent-arrival.ts` `EDL_SYSTEM` (:17).
- **`LayerKey`** → `science-layers.ts` `LAYER_DEFAULTS` (:117) + `ScienceLayersPanel.svelte`
  `$state<Record<LayerKey,boolean>>` (:70) — verify the `$state` initializer is tsc-checked
  after any `LayerKey` addition; it may not flag as reliably as the explicit `Record`.
- Smaller stable unions (ForceKey, EDLPhaseKind, ArSceneType, etc.) — one map each, low risk.
