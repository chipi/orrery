# TA — Technical Authority
*Orrery · Reference document · v1.0 · April 2026*

This is the reference document for the technical plane. RFCs anchor to it by section. ADRs update §stack and §map when decisions are locked.

---

## §components

The subsystems of the production application.

**Router** — hash-based client-side router. Reads `window.location.hash`, maps to screen module, handles query params for mission IDs and filters. See RFC-001, ADR-004.

**Data client** (`src/lib/data.js`) — fetch and cache layer for all JSON data files. Returns JSON as-is. Never transforms data. Cache is a `Map` keyed by URL, session-only. Exposes: `getMissionIndex()`, `getMission(id, dest)`, `filterMissions({dest, status, agency})`, `planets()`, `rockets()`, `earthObjects()`. See ADR-006, ADR-007.

**Nav bar component** (`src/components/nav.js`) — shared across all six screens. Renders the 52px bar with wordmark, screen links, and a slot for screen-specific right-region controls. Active screen highlighted in blue. All other screens link to their hash route.

**Right panel component** (`src/components/panel.js`) — shared detail panel used by explore, missions, and moon screens. Renders header, tab strip (OVERVIEW/TECHNICAL/LEARN/SIZES), scrollable content area, and optional action footer. Panel content is injected by each screen.

**Orbital library** (`src/lib/orbital.js`) — Keplerian mechanics. `keplerPos(a, e, L0, T, t)` returns position at time t (days from J2000). `visViva(a, r)` returns orbital velocity in km/s. `auToPx(a)` returns visual radius for 2D rendering. All constants from IAU; see §contracts.

**Scale library** (`src/lib/scale.js`) — rendering scale functions. `auToPx(a_au)` — compressed log-linear scale for solar system 2D. `altToVis(alt_km)` — logarithmic scale for Earth orbit viewer: `38 + 54 * log10(1 + alt_km / 100)`.

**Lambert library** (`src/lib/lambert.js`) — Lagrange-Gauss short-way Lambert solver. Called only from the Lambert worker, never from the main thread. See ADR-008, RFC-003.

**Lambert worker** (`src/workers/lambert.worker.js`) — runs the Lambert solver off the main thread. Receives a message with departure date range, arrival date range, and step counts. Posts back the full porkchop grid (delta-v values for each cell). See RFC-003.

**Six screen modules** (`src/screens/[moon|explore|plan|fly|missions|earth].js`) — one module per screen. Each initialises its canvas/renderer, loads data, handles user interaction, and owns its HUD or panel state. Screens do not share mutable state directly — they use the shared data client and the URL hash.

---

## §contracts

Data shapes between components.

### Mission index entry (from `data/missions/index.json`)

```json
{
  "id": "curiosity",
  "name": "Curiosity",
  "agency": "NASA",
  "dest": "MARS",
  "status": "ACTIVE",
  "year": 2011,
  "type": "ROVER · ACTIVE",
  "sector": "gov",
  "color": "#0B3D91",
  "first": "First nuclear-powered Mars rover"
}
```

### Full mission record (from `data/missions/[dest]/[id].json`)

```json
{
  "id": "curiosity",
  "name": "Curiosity",
  "agency": "NASA",
  "agency_full": "NASA / JPL-Caltech",
  "sector": "gov",
  "dest": "MARS",
  "color": "#0B3D91",
  "year": 2011,
  "type": "ROVER · ACTIVE",
  "status": "ACTIVE",
  "dep": "Nov 26, 2011",
  "arr": "Aug 6, 2012",
  "tof": 253,
  "vehicle": "Atlas V 541",
  "payload": "899 kg",
  "dv": "~6.1 km/s",
  "first": "First nuclear-powered Mars rover",
  "description": "...",
  "data_quality": "good",
  "credit": "© NASA/JPL-Caltech",
  "links": [{ "l": "...", "u": "...", "t": "intro|core|deep" }],
  "events": [{ "met": 0, "label": "LAUNCH", "note": "...", "type": "nominal|info" }]
}
```

`events` is an array of mission timeline events for CAPCOM mode. `met` is mission elapsed time in days. See RFC-002 for open questions on schema canonicalisation.

### Planet record (from `data/planets.json`)

```json
{
  "name": "Earth",
  "a": 1.000,
  "e": 0.017,
  "T": 365.25,
  "L0": 1.753,
  "incl": 0.00,
  "axialTilt": 23.44,
  "rotPeriod": 0.9973
}
```

### Lambert worker message protocol

**Main → Worker:**
```json
{ "depRange": [depStart, depEnd], "arrRange": [arrStart, arrEnd], "steps": [112, 100] }
```

**Worker → Main:**
```json
{ "grid": [[dv, ...], ...], "depDays": [...], "arrDays": [...] }
```

See RFC-003 for open questions on progress reporting and cancellation.

### Orbital constants

```js
MU_SUN      = 4 * Math.PI * Math.PI   // AU³/yr²  — IAU
AU_TO_KM    = 149597870.7             // km/AU    — IAU 2012
AU_TO_LMIN  = 8.317                   // light-minutes/AU
AUPYR_TO_KMS = 4.7404                 // km/s per AU/yr
```

---

## §constraints

Non-negotiables. Cannot be changed without a new ADR that explicitly supersedes the constraint.

- **Browser-only.** No server-side logic. No backend. No API server. nginx serves static files only. The application must work as `file://` (with caveats for fetch) and as `http://localhost`.

- **No user data.** No accounts. No login. No `localStorage`. No `sessionStorage`. No cookies for user preferences. State is session-only and resets on reload.

- **Three.js r128.** Not r129, not r130. r128 is the pinned version. `THREE.CapsuleGeometry` does not exist in r128 — use `CylinderGeometry` or `SphereGeometry` instead. CDN URL: `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` (CDN only in prototypes; production bundles locally).

- **AU units in 3D scenes.** All 3D coordinates are in astronomical units. Earth orbit = 1.0 AU. Sun sphere radius = 0.06 AU. Do not mix pixel-scale coordinates into 3D scenes.

- **Keplerian two-body mechanics only.** No n-body simulation. No perturbations. Simplifications are documented; they do not produce wrong intuitions.

- **No npm dependencies without ADR.** Every npm package added to `package.json` requires an ADR justifying it. The dependency list must remain minimal.

- **JSON data is never transformed by the client.** `data.js` returns data as-is from JSON files. Transformation (filtering, sorting) happens at the call site. The data client is a fetch/cache layer, not a data access object.

---

## §stack

Locked technical choices. Each entry points to its ADR.

| Concern | Choice | ADR |
|---|---|---|
| 3D rendering | Three.js r128, local bundle | ADR-001 |
| Framework | None — vanilla JS | ADR-002 |
| Bundler | Vite | ADR-003 |
| Routing | Hash-based (`#/route`) | ADR-004 |
| Deployment | nginx + Docker Compose | ADR-005 |
| Mission data format | Static JSON files in `data/` | ADR-006 |
| Data serving | Separate nginx volume | ADR-007 |
| Lambert solver execution | Web Worker | ADR-008 |
| Mission scenario type | Free-return flyby (no landing) | ADR-009 |
| Transfer arc computation | Keplerian half-ellipses | ADR-010 |

---

## §map

State board for all RFCs and ADRs.

### RFCs

| RFC | Title | Status | Closes into | Closing evidence |
|---|---|---|---|---|
| RFC-001 | Router design — hash vs history, param handling | Draft v0.1 | ADR (pending) | Slice 1 gate: router handles all six routes + mission ID params |
| RFC-002 | Mission JSON schema — events array, field canonicalisation | Draft v0.1 | ADR (pending) | Slice 4 gate: schema exercised by three mission types in fly screen |
| RFC-003 | Lambert worker — message protocol, progress, cancellation | Draft v0.1 | ADR (pending) | Slice 3 gate: worker running in production with porkchop plot |
| RFC-004 | Mission URL sharing — serialisation, back-button | Draft v0.1 | ADR (pending) | Slice 4 gate: `#/fly?mission=id` works end-to-end |
| RFC-005 | Accessibility — ARIA on canvas screens, reduced-motion | Draft v0.1 | ADR (pending) | Slice 6 gate: all six screens pass WCAG 2.1 AA on nav and panels |

### ADRs

| ADR | Title | Status |
|---|---|---|
| ADR-001 | Three.js r128 as 3D renderer | Accepted |
| ADR-002 | Vanilla JS — no framework | Accepted |
| ADR-003 | Vite as bundler | Accepted |
| ADR-004 | Hash-based client-side routing | Accepted |
| ADR-005 | nginx + Docker Compose deployment | Accepted |
| ADR-006 | JSON files for mission data | Accepted |
| ADR-007 | Separate nginx volume for data directory | Accepted |
| ADR-008 | Lambert solver in Web Worker | Accepted |
| ADR-009 | Free-return flyby as mission scenario | Accepted |
| ADR-010 | Keplerian half-ellipses for transfer arc | Accepted |

---

## Changelog

| Version | Date | Change |
|---|---|---|
| v1.0 | April 2026 | Initial version — components, contracts, constraints, and stack extracted from 04_Technical_Architecture.md and six prototypes |
