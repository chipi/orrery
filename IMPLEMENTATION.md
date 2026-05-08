# Orrery — Implementation

*April 2026 · Living document · Update when slices complete or scope changes*

---

## Current state

**Production app (v0.3.x):** a static SvelteKit SPA — ten primary screens (`/explore`, `/plan`, `/fly`, `/missions`, `/earth`, `/moon`, `/mars`, `/iss`, `/tiangong`, `/science`). All mission, planet, porkchop, science section, and overlay JSON is served from `static/data/` at runtime (`/data/...` URLs). CI runs typecheck, lint, Vitest, ajv validation, porkchop precompute, and doc-system checks (all chained into `npm run build`); Playwright e2e runs on push to `main`.

The HTML prototypes under `docs/prototypes/` remain the historical design ground truth; they are not the shipping runtime.

**Stack:** TypeScript (strict) · SvelteKit (adapter-static) · Three.js r128 · Vitest · Playwright · GitHub Actions · GitHub Pages · Paraglide-js i18n · ajv data validation · `@vite-pwa/sveltekit` (per ADR-029)

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

*Goal: fully offline, accessible, production-ready, v0.1.0 tagged.*

**Status (2026-04-29):** complete. v0.1.0 tagged and pushed. Live at https://chipi.github.io/orrery/.

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
- ✅ `v0.1.0` tagged

**RFCs closed at this slice:** RFC-005 → ADR-025 (accessibility tier-1 contract). All six RFCs from the original concept package are now closed.

**Tier-2 work explicitly deferred to v2** per ADR-025:
- Canvas-object keyboard navigation (tabbing between planets/missions/sites within a canvas)
- Full screen-reader description of canvas content
- High-contrast mode
- Locales other than en-US (architecture is in place — content task)
- PWA manifest + service worker

---

## Post-Slice-6 audit (2026-04-29)

A 5-batch audit ran against the slice-6 codebase covering tests, drift, and code quality (20 findings). All landed before the `v0.1.0` tag.

- **Batch 1** (`9bd1693`) — ADR-025 breaches + i18n: planet axial spin gated under reduced-motion in /explore; identity HUD now `role="status" aria-live="polite"`; /fly subscribes to OS preference flips (was init-only); /missions filter pills bumped to 44px; hardcoded `'EARTH'` and Panel default label routed through Paraglide; /earth render switched from 60fps rAF to event-driven (data load, resize, selection change).
- **Batch 2** (`b23285f`) — testing backfill: `reduced-motion.test.ts` (8 tests, jsdom-pragma) + 6 new tests for `getEarthObjects` / `getMoonSites` (overlay merge, locale fallback). jsdom@26 added as a pinned dev-dep.
- **Batch 3** (`b2c8de8`) — pure helper extraction: `$lib/earth-regimes` (`deriveRegimeBounds`) + `$lib/moon-projection` (`latLonToUnitSphere`, `latLonToEquirect`). Routes import the helpers; 19 new unit tests.
- **Batch 4** — closed as no-op: `enterTwoDMode` and `getCanvas2dContext` were 2-callsite premature abstractions; `/moon` per-frame marker length-check is O(1) and correct; canvas `role="img"` is rejected by Svelte's a11y plugin.
- **Batch 5** (`ba5bc11`) — stale test counts corrected in IMPLEMENTATION.md.

---

## Final state at v0.1.0

- **Six screens shipping**, all in production at https://chipi.github.io/orrery/
- **144 unit tests** + **87 e2e tests** (1 mobile-only skip), all green
- **108 data files** ajv-schema-validated
- **25 ADRs** locked, **6 RFCs** closed (RFC-001 → ADR-013, RFC-002 → ADR-020, RFC-003 → ADR-022, RFC-004 → ADR-024, RFC-005 → ADR-025, RFC-006 → ADR-023)
- **TA.md at v1.7**
- Eight pure helper modules: `orbital`, `scale`, `lambert`, `mission-arc`, `parse-delta-v`, `earth-regimes`, `moon-projection`, `reduced-motion`
- Tagged `v0.1.0`

---

## v0.1.1 — UX patches (2026-04-29)

User feedback after v0.1.0 revealed two screens needed redesign before v0.2.0 themes could begin.

- **Nav reorder** (`af02a0e`): /moon moved from first to last tab so the audience progression reads /explore → /plan → /fly → /missions → /earth → /moon (close-to-home pair last).
- **Moon-marker rework** (after `af02a0e`): per-mission-category Three.js geometry replaces the previous identical low-poly spheres — crewed (cone + flag), rover (box-on-wheels), sample-return (octahedron + spike), orbiter (floating torus + tether), lander (octahedron + antenna). Markers now parented to `moonMesh` so they rotate with the sphere (previous bug: markers stayed in scene-space while moon spun underneath, breaking spatial reference). New helper `$lib/moon-marker-category` + tests.
- **/earth full redesign**: replaces the 1D vertical log-scale stack with a 3D dual-mode scene mirroring /moon's pattern. Earth at origin (textured sphere), 13 satellites with per-category geometry (station, constellation cluster, telescope scope, comsat dish, moon-orbiter probe), Moon rendered at compressed orbital distance with click-through to /moon, regime rings color-coded by altitude, 2D top-down toggle. Replaces the deleted `altToVis` with `altToOrbitRadius` calibrated for the 3D scene. New helper `$lib/earth-satellite-category` + tests.

**State at v0.1.1:** **161 unit tests** (was 144, +17) + **87 e2e tests**, all green. Ten pure helper modules (added `moon-marker-category` + `earth-satellite-category`).

---

## v0.1.6 — Multi-destination porkchop (2026-04-29)

Closes RFC-007 / ADR-026. /plan extends from Earth → Mars only to Earth → 5 destinations (Mercury, Venus, Mars, Jupiter, Saturn) with a LANDING/FLYBY toggle for inner planets.

- **1.6a-1 + 1.6a-2** — Foundation. New `static/data/schemas/porkchop.schema.json`, `scripts/precompute-porkchops.ts`, and 5 per-destination JSON files in `static/data/porkchop/`. `lambert-grid.constants.ts` extended with a `DESTINATIONS` map keyed by `DestinationId`. `computePorkchopGrid()` parameterised over destination (back-compat: defaults to `'mars'`). 7 new unit tests.
- **1.6a-3 + 1.6a-4** — `/plan` rewrite. Worker dependency dropped — pre-computed grids load via `$lib/data#getPorkchopGrid`. Destination `<select>` + LANDING/FLYBY pill row above the porkchop. URL contract `?dest=...&type=...` mirrors the `/missions` filter pattern. LANDING ∆v adds destination's `dv_orbit_insertion.LANDING` to the cell value. Y-axis switches between days (inner) and years (outer) per the loaded grid's `tof_axis_unit`.
- **1.6a-5** — `/fly` outbound-only arcs for non-Mars destinations. New `destinationPos()` + `outboundArc(depPos, steps, destA)` in `mission-arc.ts` with signed-eccentricity handling for inner planets. New `applyPlanSelection()` synthesises a one-way trajectory when `/fly` receives `?dest&dep&tof` without `?mission=`. Per-frame flyby ring tracks the active destination.
- **1.6a-6** — Tests. 8 new unit tests for `getPorkchopGrid` + 4 new e2e tests covering Jupiter render, gas-giant LANDING disabled state, Mars LANDING+FLYBY, destination-switch URL sync.
- **1.6a-7** — Docs roll-up + v0.1.6 tag + GitHub Release.

**State at v0.1.6:** **193 unit tests** (was 185, +8) + **91 e2e tests** (was 87, +4), all green. ~610 KB of pre-computed grid data in the bundle. Worker stays in the build for any future custom-range computation but is dormant for the 5 default destinations. Mars regression-tested across the e2e suite.

**Deferred to v0.3.0** (its own milestone + RFC-008): Uranus, Neptune, Pluto, Ceres, Eris, Makemake, Haumea. Multi-decade transfer-time axes + Lambert convergence at extreme distances + (open question) gravity-assist support.

---

## v0.3.0 — Outer planets + Ceres + Pluto (ADR-028 / issue #27)

Closes RFC-008 / ADR-028. `/plan` and `/fly` extend from five porkchop destinations to **nine** (+ Uranus, Neptune, Pluto, Ceres). Pre-computed grids: `static/data/porkchop/earth-to-{uranus,neptune,pluto,ceres}.json`. Pluto uses eccentric arrival in Lambert + `destinationPos`; Ceres uses a **circular** `a` in those paths (non-zero `e` prevented short-way convergence across the grid). **Ceres TOF window** is `[120, 480]` d with a **days** Y-axis — the ADR-028 draft `[800, 1800]` d band produced zero converged cells with the existing Lagrange–Gauss short-way solver (see ADR-028 table + `scripts/precompute-porkchops.ts`). Direct-Hohmann caveat banner on `/plan` and `/fly` for giants + Pluto.

- **3.0a-1 … 3.0a-6** — Types, porkchop JSON + schema, precompute, `/plan` selector + URL coercion + i18n, `/fly` colours + camera clamp 4000 + caveat, unit tests + e2e + TA/worker docs + IMPLEMENTATION/CLAUDE/rules refresh.
- **3.0a-5** — Mission catalogue: extended `Mission.dest` / schema with `JUPITER`, `NEPTUNE`, `PLUTO`, `CERES`; new folders `missions/{jupiter,neptune,pluto,ceres}/`; helper [`src/lib/mission-dest.ts`](src/lib/mission-dest.ts); `/fly` index-driven fetch + heliocentric arcs for outer entries; `/missions` destination filters + URL; **36** missions (Galileo, Voyager 2, New Horizons, Dawn). Honest `flight_data_quality: sparse` until full ADR-027 flight blocks are researched. Future optional fields (`itinerary[]`, etc.) documented in ADR-028 for multi-leg missions — not v1.

---

## v0.1.9 — Mission flight params + timeline navigator (2026-04-30)

Closes RFC-009 / ADR-027. Extends every mission record with a structured `flight` sub-object (launch C3, arrival V∞, orbit-insertion ∆v, MET-stamped events). Surfaces it on `/missions` (new FLIGHT tab + timeline navigator above the card grid) and `/fly` (per-mission flight-params HUD readout). Honesty rule: sparse / unknown data renders as `—` with a per-mission `flight_data_quality` flag and a caveat banner — never as fake numbers.

- **1.7a-1** — Schema + types + data layer. `mission.schema.json` extended; `Mission.flight` typed; `getMission()` returns it. 3 reference missions populated (Curiosity, Apollo 11, Perseverance).
- **1.7a-2** — `/missions` FLIGHT tab. New tab in MissionPanel between OVERVIEW and GALLERY. Caveat banner + LAUNCH / CRUISE / ARRIVAL / TOTALS / EVENTS sections. Source citations per subsection.
- **1.7a-3** — `/fly` HUD readout. New FLIGHT PARAMS group below NAV. Real C3 / V∞ / total ∆v from the mission's `flight.totals`. Outbound arc terminal hook for real `arrival.v_infinity_km_s` deferred to a follow-up — base HUD readout + sparse-data caveat banner shipped.
- **1.7a-4** — Timeline navigator. `TimelineNavigator.svelte` above the filter bar on `/missions`. 1957 → 2030 horizontal axis, agency-coloured dots, two drag handles, `?from=YYYY&to=YYYY` URL sync, click-to-nudge. Reduced-motion number-input variant ships; mobile pinch-zoom deferred to a follow-up.
- **1.7a-5** — Populated remaining 25 missions with appropriate `flight_data_quality`. Apollo 11 / 17, Mariner 4, Curiosity, Perseverance, MAVEN, InSight, Mars Express, Mangalyaan, MOM, Hope Probe, Tianwen-1, Mars Pathfinder, Viking 1, LRO, Clementine, Chandrayaan-1, Chandrayaan-3, Chang'e 4, Chang'e 5, Chang'e 6, SLIM at `measured` or `sparse`; Mars 3, Luna 9, Luna 17, Luna 24 at `sparse`; MMX, Starship Demo, Artemis 3 at `unknown`.
- **1.7a-6** — Tests + docs roll-up. 8 new e2e tests covering FLIGHT tab content + sparse/unknown caveats + timeline navigator + ?from=&to= URL sync + range clamping.

**State at v0.1.9:** **201 unit tests** (unchanged) + **64 e2e tests** (was 56, +8), all green. ~3 KB of flight data added per measured mission, ~25 KB total across 28 missions. No regression on existing OVERVIEW / GALLERY / LEARN tabs or any /fly behaviour.

**Honesty rule (PA §promises):** never invent flight data. A mission with `flight_data_quality: "sparse"` carries the flag forever — better to show `—` and cite the gap than to pretend the data exists. The caveat banner is structural: amber-tinted, plain-language, i18n-keyed.

**Backward compat:** the existing `delta_v` string field stays. `/fly` reads `flight.totals.total_dv_km_s` first and falls back to `parseDeltaV(mission.delta_v)` when the structured value isn't present. No mission file was broken by this slice.

**Deferred:** outbound-arc geometry hook using real `arrival.v_infinity_km_s` (touches `mission-arc.ts` — a separate slice). Mobile pinch-zoom on the timeline strip (base drag-handle range is the load-bearing UX; pinch-zoom is stretch).

---

## v0.1.10 — Panel galleries: GALLERY + LEARN tabs (2026-05-02)

The MissionPanel tab pattern (v0.1.7) extends to every detail panel in the app. PlanetPanel, SunPanel, and the inline panels on `/earth` and `/moon` gain GALLERY (photo grid + lightbox) and LEARN (tiered intro/core/deep links) tabs. 128 photos populated across the four new categories.

- **1.10a-1** — Schema + types. `planet-overlay.schema.json` and `sun-overlay.schema.json` allow optional `links[]`. `PlanetOverlay` + `SunOverlay` TS types extend with optional `links`. Empty manifest scaffolds (`planet-galleries.json`, `sun-gallery.json`, `earth-object-galleries.json`, `moon-site-galleries.json`) avoid console 404s while photos catch up.
- **1.10a-2** — Curated link sets. 8 planet overlays + sun overlay get 5-link tiered curation each (Wikipedia + NASA mission pages + peer-reviewed papers). Earth-objects and moon-sites already carried `links` in their base records — now surfaced.
- **1.10a-3** — Tab UI. PlanetPanel + SunPanel + `/earth` + `/moon` get the OVERVIEW / (existing tabs) / GALLERY / LEARN structure. `data.ts` gains `getPlanetGallery / getSunGallery / getEarthObjectGallery / getMoonSiteGallery`. New shared i18n keys: `panel_tab_gallery / _learn`, `panel_links_intro/core/deep`, `panel_gallery_empty / _credit / _aria`, `panel_no_links`, `panel_lightbox_close`.
- **1.10a-4** — Photo population. `scripts/fetch-assets.ts` extends with a generic `fetchPanelGallery` over four new query lists. Source: NASA Images API + curated Wikimedia Commons fallbacks. For moon-site IDs that match a mission ID (apollo11, change5, luna9 …) the script copies existing `missions/{id}/*.jpg` instead of re-downloading. Result: 40 planets + 5 sun + 39 earth-objects + 44 moon-sites = 128 new photos, ~18 MB.
- **1.10a-5** — Audit cleanup. Deep review across docs/specs/code/tests caught: ~250 lines of CSS duplicated across 5 surfaces (extracted to `src/lib/styles/panel-tabs.css`, net −723 LOC); hardcoded "Close gallery preview" aria-label in 5 places (i18n keys added); brittle `toHaveCount(5)` e2e assertion (switched to `first().toBeVisible()`).

**Bugfix found en route:** SunPanel's gallery `$effect` read `gallery.length` inside its body; once the empty manifest landed, `gallery = []` re-triggered the effect → infinite loop → `/explore` page hang. Fixed with a one-shot `galleryLoaded` guard.

**State at v0.1.10:** **201 unit tests + 64 e2e tests** (1 skipped), all green. ~18 MB of new image content; gallery manifests committed alongside images. No regression on missions GALLERY/LEARN tabs (v0.1.8 baseline).

**Honesty rule preserved:** entries with empty galleries (tiangong, gaia — Wikimedia filenames not findable) keep their GALLERY tab hidden rather than showing broken thumbnails.

**Deferred (issues open):** outbound-arc V∞ hook (carries from v0.1.9), mobile pinch-zoom on timeline (carries from v0.1.9), PRD-001/005/006 + UXS-001/005/006 §Extension polish, README mention. Tracked in v0.1.10 audit issue.

---

## v0.1.11 — Hover thumbnails + Earth year scrubber (2026-05-02)

Phase 1 of the multi-phase polish plan (`docs/...` plan file). Closes Theme A.A2 + A.A4 from issue #16.

- **1.11a-1** — Hover trajectory thumbnails on /missions cards. New `fetchMissionThumbnails()` step in `scripts/fetch-assets.ts` renders 28 PNGs (240×120, ~5 KB each) at build time using node-canvas + the shared `mission-arc.ts` math. Mars-bound: heliocentric view; Moon-bound: cislunar Bezier view. Cards gain a `.card-thumbnail` sibling that reveals on desktop hover (140 ms fade). Mobile users navigate via the FLY button — no long-press affordance needed.
- **1.11a-2** — `/earth` year scrubber + arrival pulse. Native `<input type="range">` above the canvas (1957..2030) drives `simYear` state. Both 2D `draw2d()` and 3D `sats[]` filter visibility by `o.launched <= simYear`. When `simYear` crosses an object's launched year, a 600 ms expanding teal ring pulses around the dot in 2D. URL sync: `?year=2009`. Reduced-motion: native input gives keyboard + screen-reader access; pulse animation collapses via the global `prefers-reduced-motion: reduce` rule.
- **1.11a-3** — Tests. 2 new e2e for the scrubber (URL pre-apply, out-of-range clamp). One existing test updated post-#31 promotion of artemis3 from unknown → sparse.

**State at v0.1.11:** **207 unit tests** + **73 e2e** (was 71, +2), all green. ~140 KB of new image data (28 thumbnails). New devDependency: `canvas` (native module — Python 3 + build tools required for install).

**Deferred from Theme A:** A1 (mission overlay rings on /explore) shipped in v0.1.10; A3 (HUD reflow) considered naturally addressed by prior /fly polish. Issue #16 fully closed.

---

## v0.1.12 — PWA service worker + high-contrast toggle (2026-05-02)

Phase 2 of the multi-phase polish plan. Closes Theme C from issue #18.

- **1.12a-1** — Service worker via `@vite-pwa/sveltekit` (new dev-dep). New ADR-029 documents the decision: precache shell+textures+fonts+logos+images; stale-while-revalidate for mission JSON + i18n overlays; network-first for gallery/manifest files; porkchop grids excluded (browser HTTP cache only). Update toast + visit-counter-deferred install prompt (3+ unique routes per CLAUDE.md "no surprises") in `+layout.svelte`. SW lands in `build/sw.js` + `workbox-*.js`.
- **1.12a-2** — Manual high-contrast toggle. New `src/lib/high-contrast.ts` mirrors `reduced-motion.ts` (matchMedia + MutationObserver subscription). New "Aa" button in Nav right-section toggles `data-high-contrast` on `<html>`; CSS hooks already shipped in v0.1.10's `tokens.css`. Both OS preference + manual override paths active.
- **1.12a-3** — 4 new e2e tests (manifest served, SW file served, manifest link in head, toggle flips html attribute). 207 unit + 77 e2e all green.

**Deferred:** Lighthouse CI gate (needs separate `lhci` config + baseline scoring). iOS install path stays manual via the share sheet (Safari ignores `beforeinstallprompt`); documented in ADR-029.

---

## v0.1.13 — Flight-data re-use across /fly + /missions (2026-05-02)

Phase 3 of the multi-phase polish plan. Surfaces the rich flight data populated by issue #31 in two new places.

- **1.13a-1** — `/fly` CAPCOM ticker reads structural events. New pure helper `src/lib/mission-event-merge.ts#mergeFlightEvents()` fuses editorial overlay events with `mission.flight.events[]`. Editorial events take precedence at MET collisions (within 0.05 day tolerance). Sparse-data missions (Mars 3, Luna 9/17/24, Apollo 17) now show their TCMs + EDL + anomalies in the ticker even when their editorial overlay is bare.
- **1.13a-2** — NEXT EVENT row in /fly FLIGHT PARAMS HUD. Derived from the merged events list; shows `T+Nd · LABEL` for the next upcoming event. Ticks down naturally as `simDay` advances.
- **1.13a-3** — `/missions` cards show flight-data-quality badge. Inline next to the existing status badge in `.card-head`. Four colour-coded states: `MEASURED` (teal), `SPARSE` (gold), `RECONSTRUCTED` (orange), `UNKNOWN` (grey).
- **1.13a-4** — Tests. 7 new unit tests for `mergeFlightEvents` (empty inputs, editorial passthrough, structural fallback, MET collision dedup, sort order, anomaly typing, label-map override). 5 new e2e: NEXT EVENT visible on Curiosity, Mars 3 ticker, three quality-badge cards.

**State at v0.1.13:** **214 unit tests** (was 207, +7) **+ 82 e2e** (was 77, +5), all green. No new dependencies; all work uses existing infrastructure.

---

## v0.2.0 — /fly trajectory math: isolation + per-mission validation (2026-05-02)

Phase 4 of the multi-phase polish plan — the largest. Extracts every numeric formula previously inline in `src/routes/fly/+page.svelte` into pure modules + adds a per-mission validation harness against the golden values from issue #31. **Minor version bump** because this touches the trajectory core. ADR-030 locks the contract.

- **2.0a-1** — `src/lib/fly-physics.ts` collects all extracted functions: `heliocentricSpeed`, `distanceBetween`, `auToKm`/`auToMkm`, `signalDelayMin`, `missionElapsedDays`, `dvRemaining`, `moonPositionAtMet`, `moonOutboundArc`, `moonReturnArc`. Constants centralised in `src/lib/fly-physics-constants.ts`. `+page.svelte` is now a consumer; the math is testable.
- **2.0a-2** — V∞ shaping + Moon Bezier test gaps closed. 4 new tests for `outboundArc()` V∞ shaping (baseline passthrough, energetic bend-out, Hohmann-matched, extreme clamp). 6 new tests for the extracted Moon arcs.
- **2.0a-3** — `src/lib/fly-physics-validation.test.ts` walks 10 real missions (9 measured + 1 sparse) and asserts peak heliocentric speed within tolerance against `mission.flight.cruise.peak_heliocentric_speed_km_s`. Per-mission tolerance bands reflect the Hohmann-approximation envelope (1.5 km/s energetic, 2.0 km/s flybys, 3.0 km/s sparse).
- **2.0a-4** — `src/lib/test-helpers/expect-close.ts` provides `expectCloseTo(computed, golden, tolerance, description)` with descriptive errors. Reusable for any future per-mission validation.
- **2.0a-5** — ADR-030 documents the pure-function boundary + tolerance philosophy + future-work hooks.

**State at v0.2.0:** **251 unit tests** (was 214, +37) **+ 82 e2e**, all green. No new dependencies. /fly math is now testable independently of Three.js + Canvas2D rendering.

**Multi-phase plan complete.** v0.1.10 → v0.1.11 → v0.1.12 → v0.1.13 → v0.2.0 shipped sequentially per the planning file at `~/.claude/plans/merry-sniffing-nest.md`. Next track: v0.3.0 outer-planet implementation (RFC-008 + ADR-028 already deliberated).

---

## Scope expansion (April 2026)

A documentation site was added outside the original six-slice plan, locked in **ADR-021**. VitePress builds `docs/` into a static site deployed at `https://chipi.github.io/orrery/docs/` alongside the main app. Three checkpoints (3a-docs-1, -2, -3) and ADR-021 (3a-docs-4) landed late-April 2026.

---

## What is not in scope for v0.1.0

- User accounts or saved missions
- Languages other than English (i18n architecture in place; translations not yet)
- Backend or server-side logic
- Launch Sequence screen (OR-P09) — designed, not built
- Mars landing scenario — free-return only (ADR-009)
- Social sharing meta tags, PWA manifest — Slice 6 stretch

> **Updates** — Languages other than English: Spanish shipped in v0.3.0; Wave 1 / 2 / 3 continuations tracked on `v0.4.0` milestone (#36 / #37 / #38).
> Mars landing scenarios: shipped (Curiosity, Perseverance, Mars 3, Viking 1, etc.) per `transferEllipse` — no longer free-return-only.
> PWA manifest + service worker: shipped in v0.1.12 per ADR-029.

---

## v0.3.0 — i18n closure + heliocentric Apollo + Mariner 4 / Apollo II / concept missions (2026-05-04)

Three large work-streams shipped together. Tagged `v0.3.0`.

### /fly trajectory overhaul
- New `transferEllipse(p1, p2, steps)` in `src/lib/mission-arc.ts` — true two-point Keplerian arc with Sun at one focus; both endpoints pin to live planet positions. Replaces the old `outboundArc + post-hoc rotation` that could only pin one endpoint. Spacecraft now visibly meets Mars / Moon at arrival.
- Polyline-based TubeGeometry in /fly so the past-tube drawRange progresses in lock-step with the spacecraft sprite (CatmullRomCurve3 centripetal parameterisation drifted relative to `lerpPoint`-based sc position; replaced with a custom `PolylineCurve3`).
- `$effect` dependency-tracking fix: refs not yet defined on first run prevented Svelte 5 from registering state deps; the marker + arc-rebuild effects silently skipped subsequent mission swaps. Fixed by reading state into locals before the early-return.
- Round-trip timeline math: `arr_day = dep + 2*transit_days` for crewed / sample-return missions so scrub maps cleanly across the full mission.

### Apollo / cislunar reframe
- Moon-mode now heliocentric like Mars (Sun + Earth orbit visible, Moon orbits Earth at the exaggerated `MOON_FLY_RADIUS_AU = 0.15`).
- Camera follows live Earth, zoomed tight (50u). Sim-speed pills swap to `[0.1, 0.5, 1, 3]×` with 1× default.
- `moonHelioArc(dep, arr, start, end, steps)` — cislunar trajectory in heliocentric AU; rides Earth's orbital motion + lateral hop to Moon.

### Four new missions (32 total)
- **Artemis II** (NASA, FLOWN April 2026 — the project's inspiration)
- **Inspiration Mars** (Tito 2013 free-return concept)
- **Starship Mars Crew** (SpaceX crewed Mars round-trip concept)
- **Blue Moon MK1** (Blue Origin cargo lunar lander)
- All four wired into `fetch-assets` queries + Wikimedia fallbacks; cover, gallery, and trajectory thumbnails downloaded.

### i18n closure (Phases A · B · C)
**Phase A — docs.** ADR-031 (language list + Wave structure), ADR-032 (font / script — Wave 1; CJK + RTL deferred), ADR-033 (LLM-only translation workflow). RFC-010 → Closed. New `docs/i18n-style-guide.md` with per-language glossary tables (universal symbols, proper nouns, astronomy + orbital-mechanics terms, mission-domain terms).

**Phase B — foundation.** New `src/lib/locale.ts` (`SUPPORTED_LOCALES`, `resolveLocale(url, navigatorLanguage)`, `localeFromPage($page)` — SSR/prerender-safe per ADR-017). New `src/lib/components/LocalePicker.svelte` mounted in Nav (44×44 px, native names, URL `?lang=` only — **no localStorage** per CLAUDE.md / RFC-010 maintainer-decisions). New `src/lib/format.ts` with `Intl.NumberFormat` wrappers (`formatKm`, `formatKmPerSec`, …). Layout-stage `setLanguageTag` in `$effect.pre` so Paraglide picks up the URL locale BEFORE descendant components render their `m.foo()` calls.

**Phase C — Spanish content.** All 277 UI strings translated in `messages/es.json`. 81 editorial overlays under `static/data/i18n/es/` (36 missions + 8 planets + 6 rockets + 1 sun + 1 scenario + 13 earth-objects + 16 moon-sites). Mission and agency proper nouns kept in original (Curiosity, Tianwen-1, Apollo, etc.). New `tests/e2e/i18n-es.spec.ts` smoke per screen.

### Other polish
- Small bodies (5 dwarfs · 2 comets · 1 interstellar) in `/explore` are now clickable in 3D — added pickAid invisible spheres for click ergonomics, extended hover raycaster, layer-toggle wired to pickAid visibility.
- Every panel-gallery body has ≥3 photos. Wikimedia filenames sourced via Commons API search rather than guessed.
- 3D `/fly` torus tube radius dropped 0.7→0.25 (markers no longer dwarf planets).
- Doc gating sentences added to PRD-007 + RFC-010 to satisfy `validate-data` doc-system check.

**State at v0.3.0:** **560 unit tests** (was 251, +309 — locale, format, expanded gallery + i18n harness) **+ 88+ e2e**, all green. 198 JSON files schema-valid. Lint + typecheck clean.

---

## v0.4.0 backlog

Tracked under `v0.4.0` milestone:
- **#36** Wave 1 continuation languages — French / German / Portuguese-BR / Italian
- **#37** Wave 2 — CJK locales (Mandarin / Japanese / Korean) — gated on follow-up CJK font ADR
- **#38** Wave 3 — Hindi / Arabic-RTL / Russian — gated on follow-up RTL CSS ADR
- **#39** `/science` encyclopedia — Phase 1 shipped (route + 40 sections + diagrams + editorial 101). Phase 2 (cross-screen `?` chips) tracked separately.
- **#30** v0.1.10 audit cleanup — drift fixes carried over

### `/science` Phase 1 — what landed

Ten primary nav destinations now (was nine): `/explore`, `/plan`, `/fly`, `/missions`, `/earth`, `/moon`, `/mars`, `/iss`, `/tiangong`, `/science`. The encyclopedia is a fully-prerendered companion to the simulator — every label and contour the simulator shows now has a deep-linkable explainer.

- **Route**: `/science` landing + `/science/[tab]` × 6 + `/science/[tab]/[section]` × 40 = 47 prerendered pages
- **Layout**: shared three-column chrome — left rail (six tabs, sticky), centre (content), right rail (active tab's sections, sticky); folds to single-column on mobile
- **Content**: editorial 8-chapter Space-101 narrative on the landing; 6 tab-level 101 intros; 40 per-section narrative_101 lead-ins; 40 technical body sections with KaTeX-rendered formulas where applicable
- **Diagrams**: 40 hand-coded SVGs (engineering-blueprint style, white-on-black with teal accents) + 6 artistic tab covers (chapter-title plates)
- **Math**: KaTeX server-rendered at build (ADR-034) — client receives HTML only, no JS math library
- **Schema + data**: `science-section.schema.json`, `science-section-overlay.schema.json`, `science-tab-intro.schema.json` — all chained into `validate-data` with fail-closed `validate-diagrams.ts` integrity check
- **i18n**: en-US only at ship, fallback per ADR-017; Phase 3 LLM translation pass for 13 locales deferred per ADR-033
- **ADRs**: ADR-034 (KaTeX), ADR-035 (diagram authoring), ADR-036 (`?`-chip pattern, used in Phase 2)

**Tests:** Vitest unit tests for the data layer (`getScienceSection`, `getScienceTab`, `getScienceTabIntro`) + the KaTeX render helper. Playwright e2e smoke (`tests/e2e/science.spec.ts`) covers tab grid, tab page intro, section reading view, KaTeX visibility, diagram visibility, deep-link navigation.

**Phase 2 (shipped):** 27 cross-screen `?` chips across `/missions` FLIGHT (6), `/fly` HUD (6), `/explore` TECHNICAL (5), `/plan` primer (4), `/earth` regime legend (1), `/moon` mission-type row (1), `/mars` mission-type row (1) plus 2 new sections — `orbits/orbit-regimes` and `mission-phases/mission-types`. Total 42 sections now.

**Phase 3 (partially shipped):** UI message bundles translated for all 13 locales (442 keys total). Full science overlay translations (49 files: _landing + 6 _intro + 42 sections) shipped for **5 locales — en-US, es, de, fr, it** (245 files). The remaining 8 locales (pt-BR, ja, ko, zh-CN, ru, hi, ar, sr-Cyrl, sr-Latn) keep their existing UI translations and gracefully fall back to en-US for science overlay content per ADR-017 — non-blocking, English-fallback bounded. Follow-up batch to author the remaining ~395 overlay files.

**Phase 4 — `/science` integration with the rest of the app (5 of 5 shipped):**

| # | Concept | Status |
|---|---|---|
| 1 | **`SCIENCE` tab in detail panels** | ✅ shipped on MissionPanel, PlanetPanel, SunPanel, SmallBodyPanel. Reusable `ScienceCard.svelte` renders a curated section list per panel type, lazy-loaded. |
| 2 | **Science Lens toggle** | ✅ v1 shipped. SVG icon in nav, attribute-on-`<html>` state pattern (mirrors ADR-029 high-contrast toggle). `ScienceLensBanner.svelte` shows a bottom-of-screen physics-context card on `/explore` and `/plan`; on `/fly` it's the more capable Flight Director banner (#3). v2 will add lens-conditional in-scene annotations (focal points, force vectors, SoI rings). |
| 3 | **Flight Director narration on `/fly`** | ✅ shipped. `FlightDirectorBanner.svelte` reflows through 5 physics phases (DEPARTURE / INJECTION / CRUISE / APPROACH / ARRIVAL) driven by `arcProgress`, each phase deep-linking to the matching `/science` section. Lens-gated, so /fly stays clean for users who haven't opted in. |
| 4 | **"Why?" popovers** | ✅ v1 shipped. `WhyPopover.svelte` is a click-only inline popover that explains a *value* in context (distinct from `ScienceChip` which navigates to /science). v1 mount points: MissionPanel FLIGHT-tab caveat banner, DLA label, MASS AT TLI label; /fly FLIGHT PARAMS HUD caveat. Mobile renders as a fixed bottom sheet. |
| 5 | **Mission Sandbox** | ✅ v1 shipped. Layered onto the existing `/plan` porkchop per user direction ("evolution of porkchop"). Pin one cell, click another → compare panel surfaces ΔDEP / ΔTOF / ΔΔv. ΔΔv flips teal when cheaper, gold when costlier. Pin clears automatically on destination change. |

---

*Orrery · IMPLEMENTATION.md · last updated May 2026 · v0.3.0*
