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

## Slice 4 — Mission Arc + Mission Library

*Goal: `/fly` and `/missions` as production screens. Mission arc loads from JSON. Mission library loads from data layer. URL sharing works.*

**Deliverables:**
- `src/routes/fly/+page.svelte` — Mission Arc, free-return trajectory, CAPCOM mode
- `src/routes/missions/+page.svelte` — Mission Library, filter from index.json
- Mission detail panel lazy-loads full mission JSON on click
- CAPCOM event timeline driven by `events` array from locale overlay
- Mission URL sharing: `/fly?mission=curiosity`, `/missions?dest=MARS`
- i18n: all mission editorial content served from locale overlays
- Playwright e2e: mission library → click mission → fly screen loads correct mission
- Mobile: mission cards single-column, bottom sheet detail panel

**RFC gates:** RFC-004 closes (URL sharing end-to-end). *(RFC-002 closed early in Slice 2 — see ADR-020.)*

**ADRs from RFC closures written at this slice**

---

## Slice 5 — Earth Orbit + Moon Map

*Goal: `/earth` and `/moon` as production screens. All assets local.*

**Deliverables:**
- `src/routes/earth/+page.svelte` — Earth Orbit logarithmic scale viewer
- `src/routes/moon/+page.svelte` — Moon Map 3D sphere + 2D flat map
- Moon site data in `data/moon-sites.json` with i18n overlays
- Earth orbit objects from `data/earth-objects.json`
- Mobile: touch orbit on 3D sphere, bottom sheet for site/object detail
- Playwright e2e: all six screens load without console errors

---

## Slice 6 — Polish and ship

*Goal: fully offline, accessible, production-ready, v1.0 tagged.*

**Deliverables:**
- `prefers-reduced-motion` respected across all Three.js animations
- ARIA roles and keyboard navigation on nav bar, panels, mission library
- Weekly GitHub Actions schedule: rebuild to refresh NASA mission imagery
- `scripts/validate-data.ts` extended with Markdown doc-system checks (§18 checklist)
- Dependabot enabled for npm security updates
- README updated with install, dev, build, deploy instructions
- `v1.0.0` tag — production deployment decision made and executed

**RFC gates:** RFC-005 closes (accessibility approach confirmed)

**ADR from RFC-005 closure written at this slice**

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
