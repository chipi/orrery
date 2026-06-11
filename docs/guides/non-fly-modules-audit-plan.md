# Non-`/fly` modules — refactor & test-coverage plan

> Status · Plan
> Date · 2026-06-11
> Tracking issue · TBD (filed alongside this doc)
> Companion to · the /fly audit closed in #324 + the typed `fly-cinematic-beats` module pattern (commit `5caf1c697`)

> **Why this plan exists.** After polish-waves 1-3 on `/fly` revealed structural debt — 13-let state spaghetti, scattered reset logic, magic-constant scattering, animate-loop coupling — we landed surgical refactors that bottomed out the debt for that route. A subsequent audit of the other major routes + supporting library modules found that **no route has /fly-scale debt**, but several have smaller, concrete patterns worth fixing before the codebase scales to ~80 missions. This document is the action plan.

The audit verdict in one paragraph: routes `/plan`, `/missions`, `/fleet`, `/library`, `/mars`, `/moon`, `/earth` are healthy and need no work. Routes `/iss`, `/tiangong`, `/explore` have moderate debt (shared boilerplate, state proliferation). Library `data.ts` is a god-object that should be split. Several lib modules lack unit tests. Test-coverage gaps exist for `/tiangong`, `/plan`, `/moon` at the e2e level.

The full audit transcript lives in this conversation's session log; this doc is the execution plan derived from it.

---

## How this plan is organised

Ten actions, grouped into five batches. Each batch is independently committable; later batches don't depend on earlier ones except where noted. Batches are ordered by impact-per-effort, not by dependency.

- **Batch 1** — shared state extraction (Actions 1, 5). Biggest cleanup win; touches /iss + /tiangong + a new lib module.
- **Batch 2** — e2e coverage gaps (Actions 2, 3). Three small specs.
- **Batch 3** — `data.ts` split (Action 4). Largest single refactor; isolatable but risky.
- **Batch 4** — `/explore` state consolidation (Actions 7, 9). Smaller scope, lower risk.
- **Batch 5** — unit-test + cleanup (Actions 6, 8, 10).

Suggested execution order: Batch 1 → Batch 2 → Batch 4 → Batch 5 → Batch 3. Reasoning: Batches 1, 2, 4, 5 are small-to-medium with low blast radius. Batch 3 (data.ts split) touches dozens of importers and is best done with a clear cache (no pending unrelated refactors to merge against).

---

## Batch 1 — Shared station-assembly state

### Action 1 — Extract `src/lib/station-assembly-state.ts`

**Problem.** `/iss` and `/tiangong` declare identical assembly-state machinery:

- Both have `assemblyOpen`, `assemblyPlaying`, `assemblyProgress` `$state` variables ([`iss/+page.svelte:46-50`](../../src/routes/iss/+page.svelte) and the matching block in `tiangong/+page.svelte`)
- Both have an `assemblyRef = { active, playing, progress }` object used by the animate loop
- Both have three `$effect` syncs writing the reactive state into the ref each frame
- Both have a `requestMaterialRefresh` + `resetCamera` closure pattern in the same shape

Approximately 150 lines of identical boilerplate per route.

**Spec.**

Create `src/lib/station-assembly-state.ts`:

```typescript
/**
 * Shared state container for station-assembly animations (/iss + /tiangong).
 * Used by both routes to drive the per-frame assembly playback inside their
 * animate() loops.
 *
 * Factory function returns a tuple of:
 *   - reactive Svelte $state bindings (the values the UI sees + toggles)
 *   - a plain mutable ref object the animate loop reads each frame
 *   - the $effect sync wiring that keeps them coherent
 *
 * The factory is called from the component's <script> tag; callers
 * destructure the returned shape and bind to template directly.
 */
export interface StationAssemblyRefs {
  /** Reactive — bound by the template / button handlers. */
  state: {
    assemblyOpen: boolean;
    assemblyPlaying: boolean;
    assemblyProgress: number;
  };
  /** Plain object the animate() loop reads each frame. */
  ref: { active: boolean; playing: boolean; progress: number };
}

export function createStationAssemblyState(): StationAssemblyRefs;
```

Add unit tests in `src/lib/station-assembly-state.test.ts`:

1. Factory returns fresh state (assemblyOpen=false, assemblyPlaying=false, assemblyProgress=0).
2. Mutating state.assemblyOpen propagates to ref.active (via effect, microtask-deferred).
3. Reset path: setting all three back to defaults clears ref to defaults.

**Files to edit.**

- New: `src/lib/station-assembly-state.ts`
- New: `src/lib/station-assembly-state.test.ts`
- Modify: `src/routes/iss/+page.svelte` (~150 lines removed)
- Modify: `src/routes/tiangong/+page.svelte` (~150 lines removed)

**Acceptance.**

- [ ] Module + tests land; `npx vitest run` passes (current 2527 + ~5 new = ~2532)
- [ ] `/iss` route file is ~150 lines shorter
- [ ] `/tiangong` route file is ~150 lines shorter
- [ ] Both routes' assembly animations still work in-browser (verify the assembly slider in each route)
- [ ] `npx svelte-check` 0 errors
- [ ] Existing `tests/e2e/iss.spec.ts` still passes

**Risk.** Low. Svelte `$state` + `$effect` semantics across module/script boundaries need a brief check — the factory must run in a `<script>` context where rune APIs are available. Pattern is already used in `audio-state.svelte.ts` (search the codebase for `.svelte.ts` files).

**Estimated diff.** `+150 / -300` net (`-150` lines).

### Action 5 — Move `DOCK_EVENTS` + `TRUSS_PHASES` to `src/lib/iss-assembly-phases.ts`

**Problem.** `/iss/+page.svelte:82-250` declares 7 dock events + 11 truss phases + 3 iROSA arrays inline. The route file owns DATA that should live in a library module — same separation-of-concerns principle the audit applied to `/fly` (moving constants into `fly-cinematic-beats.ts`).

**Spec.**

Create `src/lib/iss-assembly-phases.ts`:

```typescript
export interface DockEvent {
  id: string;
  date: string;
  vehicle: string;
  module: string;
  /** ... fields from current declaration */
}

export const ISS_DOCK_EVENTS: readonly DockEvent[] = [...];
export const ISS_TRUSS_PHASES: readonly TrussPhase[] = [...];
export const ISS_IROSA_PHASES: readonly IrosaPhase[] = [...];
```

Tests in `src/lib/iss-assembly-phases.test.ts`:

1. Arrays are non-empty.
2. All entries have required fields.
3. Dates parse as ISO 8601.
4. No duplicate IDs.
5. (Optional) Ordering invariants (chronological).

**Files to edit.**

- New: `src/lib/iss-assembly-phases.ts`
- New: `src/lib/iss-assembly-phases.test.ts`
- Modify: `src/routes/iss/+page.svelte` (remove declarations; add import)

**Acceptance.**

- [ ] Data round-trips identically (no value changes)
- [ ] Tests assert structural invariants
- [ ] Route imports from new module
- [ ] `npm run preflight` exit 0
- [ ] Existing iss e2e still passes

**Risk.** Low. Pure data move.

**Estimated diff.** `+200 / -200` net (zero — just relocates).

---

## Batch 2 — e2e coverage gaps

The audit found three routes with no e2e spec at all. These need basic smoke coverage before the codebase scales.

### Action 2 — Add `tests/e2e/tiangong.spec.ts`

**Spec.** Mirror `tests/e2e/iss.spec.ts` (whatever specs it asserts) for /tiangong. At minimum:

1. Route loads without console errors
2. Canvas mounts within 10s
3. Module-list panel toggles
4. Clicking a module updates the URL (`?selected=X`)
5. Assembly slider scrubs (asserts on `assemblyProgress` data attribute or visual state)

**Acceptance.**

- [ ] Spec file exists, runs on `desktop-chromium` + `mobile-chromium` projects
- [ ] All assertions pass
- [ ] No console errors (use the `errors` collector pattern from `fly-no-cislunar.spec.ts`)

**Risk.** Low. Read iss.spec.ts and adapt.

**Estimated diff.** `+150` lines.

### Action 3 — Add `tests/e2e/plan.spec.ts` and `tests/e2e/moon.spec.ts`

**Spec for `plan.spec.ts`:**

1. Route loads with default Mars selection
2. Porkchop grid SVG renders
3. Selecting a different destination updates URL + grid
4. Clicking a grid cell opens the rocket-suggestion panel
5. (Optional) Departure / arrival slider scrubbing updates DOM state

**Spec for `moon.spec.ts`:**

1. Route loads, canvas mounts
2. Site picker shows a non-zero count
3. Clicking a site opens panel
4. (Optional) `?site=apollo11` deep-link loads correct site selected

**Acceptance.**

- [ ] Both specs land, all assertions pass
- [ ] Spec count: existing fly + station + earth + mars tests + 3 new = consistent count after add

**Risk.** Low. Use existing `mars.spec.ts` as the moon-spec template.

**Estimated diff.** `+200` lines across two files.

---

## Batch 3 — `data.ts` split (largest item)

### Action 4 — Split `src/lib/data.ts` (1565 lines, 83 exports) into domain modules

**Problem.** `data.ts` is a god-object spanning missions, fleet, science, surface sites, station modules, porkchop grids, plus core cache + fetch + locale-overlay machinery. Single-responsibility violated. Tree-shaking is also compromised — anyone importing `getMission()` pulls in the entire fleet + science + station code path.

**Target modules.**

| New file                                  | Owns                                      | Approx LOC |
|-------------------------------------------|-------------------------------------------|------------|
| `src/lib/data-core.ts`                    | cache + fetch + locale overlay primitives | ~250       |
| `src/lib/missions-data.ts`                | `getMission*`, `filterMissions`           | ~250       |
| `src/lib/fleet-data.ts`                   | `getFleet*`, `getFleetGallery`            | ~200       |
| `src/lib/science-data.ts`                 | `getScienceTabs`, `getScienceSection`, …  | ~250       |
| `src/lib/surface-site-data.ts`            | `getMarsSites`, `getMoonSites`, `getEarthSites`, `getTraverse` | ~250 |
| `src/lib/station-data.ts`                 | `getIssModules`, `getTiangongModules`, `getIssVisitors`, `getTiangongVisitors`, gallery getters | ~200 |
| `src/lib/scenarios-data.ts`               | `getScenarios`, `getScenario`             | ~80        |
| `src/lib/rockets-data.ts`                 | `getRockets`                              | ~80        |

`data.ts` itself becomes a barrel re-export for backward compat (so existing `from '$lib/data'` imports keep working through the transition).

**Migration sequence.**

1. **Create `data-core.ts`** — extract `cache`, `fetchJson`, `getLocaleOverlay`, and any internal helpers. Update `data.ts` to import from it. Verify all tests still pass.
2. **Per-domain extraction** — one at a time:
   - Move exports from `data.ts` to the new domain module
   - Re-export from `data.ts` for backward compat
   - Move matching tests from `data.test.ts` to `<domain>-data.test.ts`
   - Run vitest after each domain to catch breakage early
3. **Sweep callers** — once all domains are extracted, replace `from '$lib/data'` imports across the codebase with the specific domain module. Use grep + Edit.
4. **Remove the barrel** — once no callers reference `$lib/data` directly, delete it (or leave it with `// @deprecated` comments).

**Acceptance.**

- [ ] All 8 new domain modules exist with the documented split
- [ ] `data.ts` is either a thin barrel OR deleted
- [ ] All existing `data.test.ts` assertions still pass (split into domain test files)
- [ ] `npx svelte-check` 0 errors
- [ ] `npm run preflight` exit 0
- [ ] All existing e2e tests still pass

**Risk.** Medium-high. Touches ~30+ importer files. Cache singleton pattern must be preserved (don't introduce module-load-order races). Best done with no other in-flight refactors on the same branch.

**Estimated diff.** `+1500 / -1565` across ~40 files. Net ~`-100` lines (test files balance out the new module headers).

---

## Batch 4 — `/explore` state consolidation

### Action 7 — Collapse `/explore` state bools into typed bags

**Problem.** `src/routes/explore/+page.svelte:699-788` declares 18 independent `$state()` bools/objects:
`panelOpen`, `sunPanelOpen`, `sizesOpen`, `smallBodyPanelOpen`, `satellitePanelOpen`, `beltPanelOpen`, `lensOn`, `hoverLayerOn`, `focusedOnPlanet`, `statsOverlayOn`, `pathsLegendOpen`, …

Each is read + written from multiple sites. Cohesion is poor. No reset funnel.

**Spec.** Group into four typed `$state` objects:

```typescript
let panelState = $state({
  planet: null as string | null,
  sun: false,
  sizes: false,
  smallBody: null as string | null,
  satellite: null as string | null,
  belt: null as string | null,
  pathsLegend: false,
});

let layerState = $state({
  lens: false,
  hover: false,
  statsOverlay: false,
});

let cameraState = $state({
  focusedOnPlanet: null as string | null,
});

let selectionState = $state({
  // Whatever per-frame selected items live here
});
```

Provide `resetExplorePanelState()` for use on route param changes / canvas-clear.

**Acceptance.**

- [ ] All 18 `$state()` declarations consolidated into 4 typed objects
- [ ] Template references updated (`panelOpen` → `panelState.planet != null`, etc.)
- [ ] Reset funnel exists + is called where state should clear
- [ ] `npx svelte-check` 0 errors
- [ ] In-browser smoke: every panel still opens/closes; lens toggle works; small-body selection works

**Risk.** Medium. Lots of references — easy to miss one. Recommend `grep`-driven systematic conversion (similar to /fly cine migration).

**Estimated diff.** `+50 / -150` net (`-100` lines from removing duplicate declarations + reset calls).

### Action 9 — Add `(key)` declarations to `{#each}` blocks at `explore:4560, 4574`

**Problem.** Two `{#each}` blocks have no explicit key. Svelte 5 prefers explicit keys for stable DOM under reordering. Low priority but cheap to fix.

**Spec.**

- `explore:4560` — change `{#each PATHS_LEGEND as entry}` → `{#each PATHS_LEGEND as entry (entry.mission_id)}`
- `explore:4574` — change `{#each agencyToLogoPaths(entry.agency) as logoPath}` → `{#each agencyToLogoPaths(entry.agency) as logoPath (logoPath)}`

**Acceptance.**

- [ ] Both blocks have explicit keys
- [ ] `npx svelte-check` 0 errors

**Risk.** Trivial.

**Estimated diff.** `+0 / -0` (line count unchanged; tokens added).

---

## Batch 5 — Unit tests + cleanups

### Action 6 — Add unit tests for `moon-lander-models.ts` + `mars-lander-models.ts`

**Spec.** For each module, add tests covering:

1. Builder factory returns a `THREE.Group` (or whatever the public return type is)
2. Group contains the expected number of meshes per lander variant
3. Material colors match expected agency-color palette
4. Position offsets are reasonable (non-zero, finite)
5. Lander variants list is comprehensive (test count matches the agency-mission roster)

**Acceptance.**

- [ ] `src/lib/moon-lander-models.test.ts` exists with 5+ tests
- [ ] `src/lib/mars-lander-models.test.ts` exists with 5+ tests
- [ ] `npx vitest run` passes (test count ~2540+)

**Risk.** Low. Three.js can be mocked in jsdom; use existing test patterns (search for other `*-models.test.ts` files).

**Estimated diff.** `+200` lines across two files.

### Action 8 — Increase `iss-proxy-model.test.ts` coverage from 0.18x to 0.30x ratio

**Problem.** 364 test lines for 2008 source lines = 0.18x ratio. Below the codebase's general level (cislunar-geometry is 0.39x, data is 0.63x).

**Spec.** Add tests for:

1. `MODULE_BOXES` table is complete (one entry per `ISS_MODULE_IDS`)
2. Each module's bounding box is finite + reasonable
3. `buildIssProxyStation` returns a Group with the expected mesh count
4. Decal-center calculations land within module bounds
5. Truss-section geometry maintains expected ratios

Target: add ~200 lines of tests to bring ratio to ~0.30x.

**Acceptance.**

- [ ] `iss-proxy-model.test.ts` test count grows by ~10
- [ ] `npx vitest run` passes
- [ ] Test:source ratio ≥ 0.30 (per `wc -l` count)

**Risk.** Low. Tests are read-only on the geometry.

**Estimated diff.** `+200` test lines.

### Action 10 — Remove dead `FLYBY_ONLY` + `GRAVITY_ASSIST_CAVEAT_DESTINATIONS` constants from `/plan`

**Problem.** `src/routes/plan/+page.svelte:26-34` declares two constants commented for v0.8. They are never read in the current script. Per audit recommendation, dead code shouldn't sit in active routes.

**Spec.** Per the comment in RFC-026 (v0.8 multi-destination expansion), check whether these constants are actually needed for v0.8 work-in-flight:

- If yes — move to RFC-026's tracking issue + delete from /plan
- If no — delete outright

**Acceptance.**

- [ ] Constants removed from /plan
- [ ] `npx svelte-check` 0 errors
- [ ] If needed for v0.8: notes added to RFC-026 about where they'll re-enter

**Risk.** Trivial.

**Estimated diff.** `-10` lines.

---

## Cross-batch verification

After each batch, the next agent should:

1. `npx svelte-check --tsconfig ./tsconfig.json` — must be 0 errors
2. `npx vitest run` — total count grows with batch 1, 5; stays same elsewhere
3. `npm run preflight` — exit 0
4. **Browser-verify the touched routes** — don't trust typecheck alone (this rule landed during /fly Task A/B):
   - Batch 1 → /iss + /tiangong assembly slider + module selection
   - Batch 2 → just run the new specs
   - Batch 3 → load `/fly`, `/missions`, `/fleet`, `/science`, `/library`, `/explore` and confirm each loads cleanly
   - Batch 4 → /explore — every panel, lens toggle, small-body selection, paths-legend
   - Batch 5 → no UI surface; tests-only

## Commit conventions

One commit per batch (or per action within a batch if commits get unwieldy). Message format mirrors the /fly refactor commits:

```
refactor(<area>): <short summary> + <secondary outcome>

<3-5 paragraph body explaining: problem, solution, verification, deferred items>

Closes #<tracking-issue> (or "Closes part of #<tracking-issue>" for partial batches)

Co-Authored-By: <agent name>
```

Example: `refactor(stations): extract shared assembly state shared by /iss and /tiangong`.

## Out of scope for this plan

- `/fly` further refactor (animate-loop full extraction): tracked in #324 (closed) — leave at the current Task A+B level
- raf+Three.js test harness: tracked in #325
- Any new features: this plan is debt cleanup only
- Mission-data onboarding (Voyager, Galileo, Juno, etc.): a separate work track Marko owns

---

## Estimated total

- ~10 action items
- ~5 batches
- 2500-3000 line diff across the codebase (mostly relocations + tests)
- ~20-30 new tests
- Net `~-200 lines` of route boilerplate
- 4-6 commits

Suggested cadence: one batch per session.
