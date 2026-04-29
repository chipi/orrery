# Orrery — Implementation

*April 2026 · Living document · Update when slices complete or scope changes*

---

## Current state

Six standalone prototype HTML files and a complete concept + Phase 2 document package. Everything runs in the browser directly. No bundler, no router, no production build, no data files — all data is embedded in the prototype HTML files.

The production build extracts, connects, and deploys what the prototypes demonstrate.

**Stack:** TypeScript · SvelteKit · Three.js r128 · Vitest · Playwright · GitHub Actions · GitHub Pages (preview) · Paraglide-js i18n · ajv data validation

---

## Slice 1 — Foundation

*Goal: a working SvelteKit + TypeScript project that routes between all six screens, passes CI, and deploys a preview to GitHub Pages on every push to main.*

**Deliverables:**
- SvelteKit scaffold with TypeScript strict mode
- Six route stubs: `/explore`, `/plan`, `/fly`, `/missions`, `/earth`, `/moon`
- `Nav.svelte` component shared across all routes — all six links, active state, mobile-responsive (44px touch targets)
- `Panel.svelte` component — bottom sheet on mobile, right drawer on desktop
- Three.js r128 installed via npm (`three@0.128.0`), bundled by Vite per ADR-012
- Google Fonts self-hosted (fetched by `scripts/fetch-assets.ts`)
- History API routing working; GitHub Pages `404.html` redirect in place
- Paraglide-js wired up — `src/lib/i18n/en-US.json` with all nav/UI strings
- Locale overlay architecture in place: `data/i18n/en-US/` directory structure
- `data.ts` client stub with `getMissionIndex()`, `getMission()`, `planets()`
- GitHub Actions `ci.yml`: build + typecheck + lint + doc-check
- GitHub Actions `preview.yml`: build + deploy to GitHub Pages on push to main
- Vitest configured; `orbital.test.ts` with Earth/Mars/transfer orbit velocity checks

**RFC gates:** RFC-001 closes here (SvelteKit router supersedes hand-written router question)

**ADRs confirmed at this slice:** ADR-011, ADR-012, ADR-013, ADR-014, ADR-015

---

## Slice 2 — Data layer

*Goal: all mission data, orbital constants, rocket specs, and Earth objects live as JSON files. Schema validated on every PR. i18n overlay architecture in place.*

**Deliverables:**
- `data/missions/index.json` — 28-entry lightweight manifest (language-neutral fields only)
- `data/missions/mars/*.json` — 14 mission base files
- `data/missions/moon/*.json` — 14 mission base files
- `data/i18n/en-US/missions/mars/*.json` — English editorial overlays (name, description, first, type, events)
- `data/planets.json`, `data/rockets.json`, `data/earth-objects.json`
- `data/schemas/mission.schema.json` — ajv schema for full mission record
- `scripts/validate-data.ts` — runs ajv against all mission files
- `data.ts` client complete: fetch + cache + locale merge, all methods typed
- `src/types/mission.ts`, `src/types/planet.ts` — TypeScript interfaces
- CI `validate-data` step added to `ci.yml` — blocks PR on schema failure
- Vitest integration tests: `getMissionIndex()` returns 28 entries, `filterMissions({dest:'MARS'})` returns 14

**RFC gates:** RFC-002 closes early at this slice into ADR-020 — schema is locked before 28 mission files are written, avoiding rework risk.

**ADRs confirmed:** ADR-006, ADR-007, ADR-017, ADR-019, ADR-020 (RFC-002 closure)

---

## Slice 3 — Solar System Explorer + Mission Configurator ✅ COMPLETE

*Goal: `/explore` and `/plan` running as production screens with local assets, data from JSON, all prototype functionality preserved.*

**Status (2026-04-29):** complete. Issue #3 closed across 8 sub-checkpoints (3a-1 → 3a-8). Live at https://chipi.github.io/orrery/.

**What landed:**
- ✅ `scripts/fetch-assets.ts` — fonts (Slice 1) + planet/moon textures (Slice 3 / 3a-2). Agency logos and mission imagery deferred to Slice 4 per the staged ADR-016 plan.
- ✅ `src/routes/explore/+page.svelte` — 3D Three.js scene + 2D Canvas top-down + 3D/2D toggle, click-pick, selection ring, hover tooltip, Sun click → SunPanel, Kuiper Belt + Planet Nine
- ✅ `src/routes/plan/+page.svelte` — porkchop plot (112×100, ~1.5s compute), Lambert worker integration, vehicle selector, ∆v budget bar, FLY button, RFC-006 Option C magnifier on mobile
- ✅ Math libraries: `src/lib/orbital.ts`, `src/lib/scale.ts`, `src/lib/lambert.ts`, `src/lib/porkchop.ts` all typed
- ✅ `src/workers/lambert.worker.ts` typed, contract locked by ADR-022
- ✅ Components: `Panel.svelte`, `PlanetPanel.svelte`, `SunPanel.svelte`, `SizesCanvas.svelte`
- ✅ Data layer extended: `getPlanets(locale)`, `getSun(locale)`, `getRockets(locale)` with locale-overlay merging; planet + sun overlay schemas + 9 en-US overlay files
- ✅ Mobile: bottom-sheet panels on ≤767px, magnifier on touch, single-finger orbit on /explore (two-finger pinch deferred to slice 3 polish — flagged in audit)
- ✅ 55 unit tests + 40 Playwright e2e tests (added in slice 3 polish, pulled forward from Slice 6)

**RFC gates closed at this slice:** RFC-001 (pre-empted by ADR-013 in Slice 1), RFC-003 → ADR-022, RFC-006 → ADR-023.

**Variances from original plan, documented for future-me:**
- 3a-2 textures sourced from Solar System Scope (CC BY 4.0) instead of three.js r128 examples (which don't carry the named 2k_*.jpg files). Decision in commit `70b552a`.
- 3a-5 LEARN tab deferred — depends on a curated link catalog with no schema yet. Will land in Slice 4 polish alongside the mission credits subsystem.
- 3a-6 small bodies + comets (Pluto, Ceres, Eris, Makemake, Haumea, Halley, 67P, ʻOumuamua) deferred to Slice 4 to co-ship with the missions that visit them (New Horizons, Dawn, Rosetta).
- 3a-6 3D-mode Kuiper Belt + Planet Nine rendering deferred to Slice 4 polish. 2D mode has both.
- "Real-device" mobile validation per RFC-006 closing-evidence is via Playwright Pixel 5 emulation in `tests/e2e/`. Real iOS/Android user testing tracked for Slice 6.

---

## Slice 4 — Mission Arc + Mission Library ✅ COMPLETE

*Goal: `/fly` and `/missions` as production screens. Mission arc loads from JSON. Mission library loads from data layer. URL sharing works.*

**Status (2026-04-29):** complete. Issue #4 closed across 6 sub-checkpoints (4a-1 → 4a-6).

**What landed:**
- ✅ `src/routes/missions/+page.svelte` — Mission Library with all 28 cards, dest + status filters, URL params (`?dest=MARS&status=ACTIVE`), responsive grid
- ✅ `src/lib/components/MissionPanel.svelte` — OVERVIEW + LEARN tabs, agency/status/data-quality badges, FLY CTA → goto(/fly?mission=id)
- ✅ `src/routes/fly/+page.svelte` — full Mission Arc with three HUDs (identity / navigation / systems), timeline scrubber, speed pills, CAPCOM panel
- ✅ `src/lib/mission-arc.ts` — pure-function library: outboundArc + returnArc + spacecraftPos + spacecraftHeading, 20 unit tests
- ✅ `getMission(id, dest, locale)` already in data.ts since Slice 2 — wired to /fly's `?mission=id` URL param with Mars-then-Moon fallback
- ✅ CAPCOM mode: event ticker from `events` array (locale overlay or ORRERY-1 default), comms one-way + RTT in light-minutes, three-state anomaly monitor
- ✅ 71 Playwright e2e tests (up from 51): 6 missions + 20 fly + 6 smoke + 7 plan + 7 explore × 2 projects = full coverage of the URL contract end-to-end

**RFC gates closed at this slice:** RFC-004 → ADR-024.

**Variances from original plan:**
- Per-mission trajectories aren't in the data layer (real Mars missions are landings, not free-returns). Arc geometry stays anchored to the canonical ORRERY-1 free-return scenario; HUDs surface the loaded mission's identity. Decision documented inline + commit `98daf6f`.
- GALLERY tab on MissionPanel deferred to Slice 5 polish — depends on the NASA Images API fetch step from ADR-016 which only fonts + textures have implemented so far.
- ∆v ledger is naive (static `dv_used = dv_total × 0.94`); per-burn accounting needs burn-schedule data we don't have.
- CAPCOM CRITICAL threshold (∆v margin < 0.3 km/s) is hardcoded from the prototype; real missions would tune per-vehicle.

**Post-Slice-4 audit (2026-04-29) — 6 batches, 24 findings closed:**
- Batch 1 (`ff9b3ce`): ORRERY-1 migrated from hardcoded constants in `/fly` to a new `static/data/scenarios/orrery-1.json` + locale overlay, with new `Scenario` / `ScenarioOverlay` types, `getScenario(id, locale)` data API, and a strict ajv schema. Closes the architectural inconsistency where the canonical scenario was the only "mission" not in the data layer.
- Batch 2 (`ff9b3ce`): /fly now has the `$effect($page.url)` re-sync ADR-024 mandates (back/forward navigation between `?mission=` values now updates the HUD). Mission-load race guarded by a monotonic `currentLoadId`. Scrubber pauses playback during drag to stop simDay races against the rAF tick.
- Batch 3 (`597b0a3`): mission `delta_v` schema tightened to a strict regex; final hardcoded HUD string ("DAY {n}") routed through Paraglide; speed pills + play button bumped from 36px to 44px touch targets.
- Batch 4 (`a88bfad`): composite spacecraft (nose cone + cylinder body + nozzle) replacing single cone per UXS-003; teal RETURN crosshair at Earth-arrival position; two-finger pinch-zoom on /fly 3D mirroring /explore; ADR-010 updated with an "Implementation note (Slice 4)" reconciling the return arc's cosine profile with the original Keplerian-half-ellipse decision.
- Batch 5 (`90b1466`): 18 new unit tests + 2 new e2e tests. `parseDeltaV` extracted into `$lib/parse-delta-v` with full coverage; `getMissionsForLibrary` and `getScenario` directly tested; `mission-arc` edge cases (pre-launch / post-arrival / tiny transit / phase-boundary heading) covered; /fly 2D pixel-sample regression test mirrors the /explore pattern.
- Batch 6 (this commit): /missions error banner (`role="alert"`) for load failures; stale `4a-5 will refine` comment removed; this section added.

**Final state:** 111 unit + 73 e2e (1 mobile-only skip), 110 validated data files, all green. `delta_v` field strictly schema-validated.

---

## Slice 5 — Earth Orbit + Moon Map ✅ COMPLETE

*Goal: `/earth` and `/moon` as production screens. All assets local.*

**Status (2026-04-29):** complete. Issue #5 closed. Both screens live at https://chipi.github.io/orrery/.

**What landed:**
- ✅ `src/routes/earth/+page.svelte` — vertical Canvas 2D, log-scale via `altToVis()`, regime bands (LEO/MEO/GEO/HEO/MOON/L2) derived from data, click → Panel with the `scale_fact` italic block per PRD-005
- ✅ `src/routes/moon/+page.svelte` — Three.js textured sphere using existing `2k_moon.jpg`, 16 site markers as small coloured spheres on a 1.03× shell to avoid z-fighting, equirectangular 2D flat map with lat/lon grid + nation legend, "STILL ON THE SURFACE" block per UXS-006
- ✅ `getEarthObjects(locale)` + `getMoonSites(locale)` in data.ts merging with overlays (already present from Slice 2)
- ✅ Touch: drag-to-orbit + two-finger pinch-zoom on the 3D sphere; click hit-test on 2D
- ✅ 14 new e2e tests (`tests/e2e/{earth,moon}.spec.ts`): pixel-sample regression, click → panel flow, "STILL ON THE SURFACE" block visible, zero console errors

**Variances:** 2D moon map uses a colour-fill background instead of an equirectangular texture (UXS-006 left this open; the fill keeps the asset surface simple — a flat-projection moon texture could be added in v2 if needed).

---

## Slice 6 — Polish and ship ✅ COMPLETE

*Goal: fully offline, accessible, production-ready, v1.0 tagged.*

**Status (2026-04-29):** complete. v1.0.0 tagged and pushed. Live at https://chipi.github.io/orrery/.

**What landed:**
- ✅ `prefers-reduced-motion` honoured on /explore (sim freezes), /fly (auto-play defaults off), /moon (auto-rotate stops). User-initiated drag still works. Helper in `src/lib/reduced-motion.ts`.
- ✅ Nav: `<nav aria-label={m.nav_aria_label()}>`, focus-visible globally
- ✅ Panel: focus management (close-button on open, restore on close), Escape closes
- ✅ Tab strip ARIA: `role="tablist"` / `role="tab"` (with `aria-selected`, `id`, `aria-controls`) / `role="tabpanel"` (with `id`, `aria-labelledby`) on PlanetPanel + SunPanel + MissionPanel
- ✅ Filter pills (`role="radiogroup"` / `role="radio"` / `aria-checked`)
- ✅ Canvas screens: honest aria-labels directing screen-reader users to the panel
- ✅ Live regions: hover tooltip (status/polite), HUD phase changes (status/polite), load-failure banners (alert)
- ✅ 44 × 44 px touch targets across every interactive element
- ✅ `prefers-reduced-motion` weekly rebuild cron in `.github/workflows/preview.yml` (Mon 06:00 UTC)
- ✅ Dependabot config (`.github/dependabot.yml`) — npm + github-actions, weekly, versioning-strategy=increase-if-necessary so Three.js r128 doesn't bump unattended
- ✅ Doc-system gating-sentence checks in `scripts/validate-data.ts` — every PRD has "Why this is a PRD", every RFC has "Why this is an RFC", every ADR has `> Status ·`
- ✅ README rewritten with Live link + Getting Started / Development / Build / Deploy sections
- ✅ `v1.0.0` tagged

**RFCs closed at this slice:** RFC-005 → ADR-025 (accessibility tier-1 contract). All six RFCs from the original concept package are now closed.

**Tier-2 work explicitly deferred to v2** per ADR-025:
- Canvas-object keyboard navigation (tabbing between planets/missions/sites within a canvas)
- Full screen-reader description of canvas content
- High-contrast mode
- Locales other than en-US (architecture is in place — content task)
- PWA manifest + service worker

---

## Final state at v1.0.0

- **Six screens shipping**, all in production at https://chipi.github.io/orrery/
- **125 unit tests** + **87 e2e tests** (1 mobile-only skip), all green
- **108 data files** ajv-schema-validated
- **25 ADRs** locked, **6 RFCs** closed (RFC-001 → ADR-013, RFC-002 → ADR-020, RFC-003 → ADR-022, RFC-004 → ADR-024, RFC-005 → ADR-025, RFC-006 → ADR-023)
- **TA.md at v1.7**
- Tagged `v1.0.0`

---

## Post-v1.0 audit (2026-04-29) — v1.0.1

A 5-batch audit ran against the v1.0.0 codebase covering tests, drift, and code quality (20 findings).

- **Batch 1** (`9bd1693`) — ADR-025 breaches + i18n: planet axial spin gated under reduced-motion in /explore; identity HUD now `role="status" aria-live="polite"`; /fly subscribes to OS preference flips (was init-only); /missions filter pills bumped to 44px; hardcoded `'EARTH'` and Panel default label routed through Paraglide; /earth render switched from 60fps rAF to event-driven (data load, resize, selection change).
- **Batch 2** (`b23285f`) — testing backfill: `reduced-motion.test.ts` (8 tests, jsdom-pragma) + 6 new tests for `getEarthObjects` / `getMoonSites` (overlay merge, locale fallback). jsdom@26 added as a pinned dev-dep.
- **Batch 3** (`b2c8de8`) — pure helper extraction: `$lib/earth-regimes` (`deriveRegimeBounds`) + `$lib/moon-projection` (`latLonToUnitSphere`, `latLonToEquirect`). Routes import the helpers; 19 new unit tests.
- **Batch 4** — closed as no-op: `enterTwoDMode` and `getCanvas2dContext` were 2-callsite premature abstractions; `/moon` per-frame marker length-check is O(1) and correct; canvas `role="img"` is rejected by Svelte's a11y plugin.
- **Batch 5** — this commit: stale test counts in IMPLEMENTATION.md corrected; v1.0.1 tag.

**Final state at v1.0.1:** **144 unit tests** (was 125, +19) + **87 e2e tests**, all green. Six pure helper modules (`orbital`, `scale`, `lambert`, `mission-arc`, `parse-delta-v`, `earth-regimes`, `moon-projection`, `reduced-motion`) — every Slice 4–6 feature now has a testable lib.

---

## Scope expansion (April 2026)

A documentation site was added outside the original six-slice plan, locked in **ADR-021**. VitePress builds `docs/` into a static site deployed at `https://chipi.github.io/orrery/docs/` alongside the main app. Three checkpoints (3a-docs-1, -2, -3) and ADR-021 (3a-docs-4) landed late-April 2026.

---

## What is not in scope for v1.0

- User accounts or saved missions
- Languages other than English (i18n architecture in place; translations not yet)
- Backend or server-side logic
- Launch Sequence screen (OR-P09) — designed, not built
- Mars landing scenario — free-return only (ADR-009)
- Social sharing meta tags, PWA manifest — Slice 6 stretch

---

*Orrery · IMPLEMENTATION.md · April 2026*
