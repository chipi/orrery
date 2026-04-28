# Orrery — Implementation

*April 2026 · Living document*

---

## Current state

Six standalone prototype HTML files and a complete concept package (documents 00–05). Everything runs in the browser directly. No bundler, no router, no production build, no data files — all data is embedded in the HTML files.

The prototypes are the ground truth for all design and physics decisions. The production build extracts, connects, and deploys what they demonstrate.

---

## Implementation slices

### Slice 1 — Foundation

*Goal: a working Vite project that loads Three.js locally, routes between all six screens, and passes the CI checklist.*

**Deliverables:**
- Vite project scaffold with `src/`, `public/`, `data/` directories
- Three.js r128 bundled locally (not CDN)
- Google Fonts self-hosted subset (Bebas Neue, Space Mono, Crimson Pro)
- Client-side hash router: `#/explore`, `#/plan`, `#/fly`, `#/missions`, `#/earth`, `#/moon`
- Nav bar component extracted and shared across all six screens
- `docker compose up` serves the built app on port 8080
- CI: lint + build passes

**RFC gates:** RFC-001 (router design — hash vs history, param handling for mission IDs)

**ADRs from concept package to write now:**
- ADR-001: Three.js r128 (locked — CDN-pinned in prototypes, now local)
- ADR-002: Vanilla JS, no framework
- ADR-003: Vite as bundler
- ADR-004: Hash-based client-side routing
- ADR-005: nginx + Docker Compose for deployment

---

### Slice 2 — Data layer

*Goal: all mission data, orbital constants, rocket specs, and earth objects live as JSON files served statically. No JS constants.*

**Deliverables:**
- `data/missions/index.json` — 28-entry lightweight manifest
- `data/missions/mars/*.json` — 14 individual mission files
- `data/missions/moon/*.json` — 14 individual mission files
- `data/planets.json` — Keplerian elements, physical constants
- `data/rockets.json` — launch vehicle specs
- `data/earth-objects.json` — ISS, JWST, Hubble, etc.
- `src/lib/data.js` — fetch + cache client (`getMissionIndex`, `getMission`, `filterMissions`)
- All six screens refactored to load from JSON (no embedded data)
- nginx `data/` volume mounted separately from `dist/` (mission update = no rebuild)

**RFC gates:** RFC-002 (mission JSON schema — `events` array for CAPCOM, field name canonicalisation vs prototype field names)

**ADRs:**
- ADR-006: JSON files over JS constants for mission data
- ADR-007: Separate nginx volume for data (live-mountable without rebuild)

---

### Slice 3 — Solar System Explorer + Mission Configurator

*Goal: OR-P01 and OR-P02 running as production screens with local assets, data from JSON, and all prototype functionality preserved.*

**Deliverables:**
- `src/screens/explore.js` — Solar System Explorer extracted from prototype
- `src/screens/plan.js` — Mission Configurator extracted from prototype
- Lambert solver moved to `src/workers/lambert.worker.js` (off main thread)
- Planet textures and agency logos locally bundled
- TECHNICAL tab, SIZES tab, Sun panel all working in production build
- Porkchop plot: 11,200 cells, real Lambert solver, unchanged from prototype

**RFC gates:** RFC-003 (Lambert worker — message protocol, progress reporting, cancellation)

**ADRs:**
- ADR-008: Lambert solver in Web Worker

---

### Slice 4 — Mission Arc + Mission Library

*Goal: OR-P03 and OR-P04 as production screens. Mission arc loads scenario from JSON. Mission library loads from data layer.*

**Deliverables:**
- `src/screens/fly.js` — Mission Arc with free-return trajectory, CAPCOM mode
- `src/screens/missions.js` — Mission Library filtering from `data/missions/index.json`
- Mission detail panel lazy-loads full mission JSON on click
- Mission arc scenario driven by mission JSON (not hardcoded ORRERY-1)
- CAPCOM event timeline from `mission.events` array in JSON
- Mission URL sharing: `#/fly?mission=curiosity` loads that mission's arc

**RFC gates:** RFC-004 (mission URL sharing — serialisation, back-button behaviour), RFC-002 closes here (schema exercised by three mission types)

**ADRs from RFC-002 closure**

---

### Slice 5 — Earth Orbit + Moon Map

*Goal: OR-P05 and OR-P06 as production screens. All assets local.*

**Deliverables:**
- `src/screens/earth.js` — Earth Orbit logarithmic scale viewer
- `src/screens/moon.js` — Moon Map 3D sphere + 2D flat map
- Moon sphere texture locally bundled
- Landing site data moved to `data/moon-sites.json`
- Earth orbit objects from `data/earth-objects.json`

**RFC gates:** none new — all design decisions settled in prototypes

---

### Slice 6 — Polish and ship

*Goal: fully offline, accessible, mobile-aware, and publicly deployed.*

**Deliverables:**
- NASA Images API degrades gracefully offline (placeholder shown)
- `prefers-reduced-motion` respected across all Three.js animations
- ARIA roles and keyboard navigation on nav bar and panels
- Mobile layout for mission library and moon map (minimum viable)
- README updated with install and deploy instructions
- GitHub Actions: CI on push, build artefact on tag
- First public release tagged `v1.0.0`

**RFC gates:** RFC-005 (accessibility approach — ARIA on canvas-heavy screens, reduced-motion contract)

---

## What is not in scope for v1.0

- User accounts or saved missions
- History API routing (hash routing ships; history API is a Slice 1 RFC-001 candidate for v2)
- Mission sharing via URL for porkchop state (Slice 4 covers fly screen only)
- Launch Sequence screen (OR-P09) — designed, not built
- Backend or server-side logic of any kind

---

*Orrery · ROADMAP.md · April 2026 · Updated when slices complete or scope changes*
