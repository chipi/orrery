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

**RFC gates:** RFC-002 deliberation in progress (schema not yet exercised by fly screen)

**ADRs confirmed:** ADR-006, ADR-007, ADR-017, ADR-019

---

## Slice 3 — Solar System Explorer + Mission Configurator

*Goal: `/explore` and `/plan` running as production screens with local assets, data from JSON, all prototype functionality preserved.*

**Deliverables:**
- `scripts/fetch-assets.ts` complete — planet textures, agency logos, mission imagery all fetched at build time
- `src/routes/explore/+page.svelte` — Solar System Explorer extracted from prototype
- `src/routes/plan/+page.svelte` — Mission Configurator extracted from prototype
- `src/lib/orbital.ts` fully typed — `keplerPos()`, `visViva()`, `auToPx()`
- `src/lib/lambert.ts` typed — solver callable from worker
- `src/workers/lambert.worker.ts` — typed, message protocol per RFC-003 proposal
- `src/lib/scale.ts` — `auToPx()`, `altToVis()`
- TECHNICAL tab, SIZES tab, Sun panel all working
- Porkchop plot: 11,200 cells, Lambert worker, progress bar
- Mobile: planet detail panel as bottom sheet, explore nav works on touch, pinch-zoom on 2D canvas
- RFC-006: porkchop mobile interaction tested on real devices

**RFC gates:** RFC-001 closes (router confirmed), RFC-003 closes (Lambert worker protocol confirmed), RFC-006 closes (porkchop mobile interaction locked)

**ADRs from RFC closures written at this slice**

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

**RFC gates:** RFC-002 closes (schema exercised by three mission types), RFC-004 closes (URL sharing end-to-end)

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

## What is not in scope for v1.0

- User accounts or saved missions
- Languages other than English (i18n architecture in place; translations not yet)
- Backend or server-side logic
- Launch Sequence screen (OR-P09) — designed, not built
- Mars landing scenario — free-return only (ADR-009)
- Social sharing meta tags, PWA manifest — Slice 6 stretch

---

*Orrery · IMPLEMENTATION.md · April 2026*
