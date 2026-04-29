# TA — Technical Authority
*Orrery · Reference document · v1.4 · April 2026*

This is the reference document for the technical plane. RFCs anchor to it by section. ADRs update §stack and §map when decisions are locked.

---

## §components

The subsystems of the production application.

**Router** — SvelteKit's built-in router using the History API. File-based routing in `src/routes/`. Clean URLs: `/explore`, `/fly?mission=curiosity`, `/missions?dest=MARS`. GitHub Pages deploy uses a `404.html` SPA-redirect workaround per ADR-014. See ADR-012, ADR-013.

**Data client** (`src/lib/data.ts`) — fetch and cache layer for all JSON data files. Returns JSON as-is, except for the locale-overlay merge for mission content per ADR-017. Cache is a `Map` keyed by URL, session-only. Exposes: `getMissionIndex()`, `getMission(id, dest)`, `filterMissions({dest, status, agency})`, `planets()`, `rockets()`, `earthObjects()`. See ADR-006, ADR-017.

**Nav bar component** (`src/lib/components/Nav.svelte`) — shared across all six screens. Renders the 52px bar with wordmark, screen links, and a slot for screen-specific right-region controls. Active screen highlighted in blue. All other screens link to their route via `<a href>`.

**Right panel component** (`src/lib/components/Panel.svelte`) — shared detail panel used by explore, missions, and moon screens. Bottom sheet on mobile, right drawer on desktop per ADR-018. Renders header, tab strip (OVERVIEW/TECHNICAL/LEARN/SIZES), scrollable content area, and optional action footer. Panel content is injected by each screen.

**Orbital library** (`src/lib/orbital.ts`) — Keplerian mechanics. `keplerPos(a, e, L0, T, t)` returns position at time t (days from J2000). `visViva(a, r)` returns orbital velocity in km/s. All constants from IAU; see §contracts.

**Scale library** (`src/lib/scale.ts`) — rendering scale functions. `auToPx(a_au)` — compressed log-linear scale for solar system 2D. `altToVis(alt_km)` — logarithmic scale for Earth orbit viewer: `38 + 54 * log10(1 + alt_km / 100)`.

**Lambert library** (`src/lib/lambert.ts`) — Lagrange-Gauss short-way Lambert solver. Called only from the Lambert worker, never from the main thread. See ADR-008, RFC-003.

**Lambert worker** (`src/workers/lambert.worker.ts`) — runs the Lambert solver off the main thread. Receives a message with departure date range, arrival date range, and step counts. Posts back the full porkchop grid (delta-v values for each cell). See RFC-003.

**Six route pages** (`src/routes/[moon|explore|plan|fly|missions|earth]/+page.svelte`) — one SvelteKit page component per screen. Each initialises its canvas/renderer in `onMount()`, loads data via the data client, handles user interaction, and owns its HUD or panel state. Pages do not share mutable state directly — they use the shared data client and URL search params (`$page.url.searchParams`).

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

Locked by ADR-022 (closes RFC-003). Every message carries a monotonic
`id` so a new request implicitly cancels any in-flight computation —
the main thread discards stale messages, the worker bails before
posting stale results.

**Main → Worker (request):**
```json
{ "id": 1, "depRange": [0, 1460], "arrRange": [80, 520], "steps": [112, 100] }
```

**Worker → Main (progress, every 10 rows):**
```json
{ "id": 1, "progress": 0.42 }
```

**Worker → Main (final result):**
```json
{ "id": 1, "grid": [[dv, ...], ...], "depDays": [...], "arrDays": [...] }
```

Failed cells (Lambert solver returned no solution) carry the sentinel
`28` km/s — clamps into the deepest red of the colour scale so they
render as visually unreachable.

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

- **Browser-only.** No server-side logic. No backend. No API server. The host (GitHub Pages today; nginx, Cloudflare Pages, or any static host in future per ADR-014) serves static files only. The application must work as `http://localhost` and from any static host.

- **No user data.** No accounts. No login. No `localStorage`. No `sessionStorage`. No cookies for user preferences. State is session-only and resets on reload.

- **Three.js r128.** Not r129, not r130. r128 is the pinned version. `THREE.CapsuleGeometry` does not exist in r128 — use `CylinderGeometry` or `SphereGeometry` instead. CDN URL: `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` (CDN only in prototypes; production bundles locally).

- **AU units in 3D scenes.** All 3D coordinates are in astronomical units. Earth orbit = 1.0 AU. Sun sphere radius = 0.06 AU. Do not mix pixel-scale coordinates into 3D scenes.

- **Keplerian two-body mechanics only.** No n-body simulation. No perturbations. Simplifications are documented; they do not produce wrong intuitions.

- **No npm dependencies without ADR.** Every npm package added to `package.json` requires an ADR justifying it. The dependency list must remain minimal.

- **JSON data is never transformed by the client.** `data.js` returns data as-is from JSON files. Transformation (filtering, sorting) happens at the call site. The data client is a fetch/cache layer, not a data access object.

- **No runtime third-party URLs.** All external assets (fonts, textures, logos, mission imagery) are resolved at build time. The production bundle fetches nothing from external URLs at runtime. See ADR-016.

- **Mobile-first.** All UI components are designed at mobile size first. The base CSS targets viewports below 768px. Desktop is a progressive enhancement. See ADR-018.

- **i18n from the start.** No hardcoded UI strings in component files. All user-facing text goes through Paraglide-js. Mission content strings live in locale overlay files, never in base data files. See ADR-017.

- **TypeScript strict mode.** `strict: true` in `tsconfig.json`. No `any` types without explicit justification. See ADR-011.

---

## §stack

Locked technical choices. Each entry points to its ADR.

| Concern | Choice | ADR |
|---|---|---|
| Language | TypeScript, strict mode | ADR-011 |
| Framework | SvelteKit | ADR-012 |
| 3D rendering | Three.js r128, local bundle | ADR-001 |
| Bundler | Vite (via SvelteKit) | ADR-012 |
| Routing | History API via SvelteKit router | ADR-013 |
| CI + preview hosting | GitHub Actions + GitHub Pages | ADR-014 |
| Unit / integration tests | Vitest | ADR-015 |
| End-to-end tests | Playwright | ADR-015 |
| External assets | Resolved at build time via GH Actions | ADR-016 |
| i18n | Paraglide-js (UI) + locale overlay files (content) | ADR-017 |
| Design approach | Mobile-first, bottom sheet panels | ADR-018 |
| Data validation | ajv JSON schema on PR | ADR-019 |
| Mission data format | Static JSON files in `data/` | ADR-006 |
| Data serving | Same static host as the bundle (GH Pages today); separate nginx volume optional for self-hosted nginx per ADR-007's scope note | ADR-007 |
| Lambert solver execution | Web Worker | ADR-008 |
| Mission scenario type | Free-return flyby (no landing) | ADR-009 |
| Transfer arc computation | Keplerian half-ellipses | ADR-010 |

---

## §map

State board for all RFCs and ADRs.

### RFCs

| RFC | Title | Status | Closes into | Closing evidence |
|---|---|---|---|---|
| RFC-001 | Router design — hash vs history, param handling | Closed · superseded by ADR-013 | ADR-013 | Pre-empted by ADR-013 (SvelteKit router); see RFC-001 closure note |
| RFC-002 | Mission JSON schema — events array, field canonicalisation | Closed · superseded by ADR-020 | ADR-020 | Closed early at Slice 2 entry to lock schema before 28 mission files written |
| RFC-003 | Lambert worker — message protocol, progress, cancellation | Decided · closed by ADR-022 | ADR-022 | Closed at Slice 3 (3a-8) |
| RFC-004 | Mission URL sharing — serialisation, back-button | Decided · closed by ADR-024 | ADR-024 | Closed at Slice 4 (4a-6) |
| RFC-005 | Accessibility — ARIA on canvas screens, reduced-motion | Draft v0.1 | ADR (pending) | Slice 6 gate: all six screens pass WCAG 2.1 AA on nav and panels |
| RFC-006 | Porkchop plot mobile interaction model | Decided · closed by ADR-023 | ADR-023 | Closed at Slice 3 (3a-8) |

### ADRs

| ADR | Title | Status |
|---|---|---|
| ADR-001 | Three.js r128 as 3D renderer | Accepted |
| ADR-002 | Vanilla JS — no framework | Superseded by ADR-011, ADR-012 |
| ADR-003 | Vite as bundler | Superseded by ADR-012 |
| ADR-004 | Hash-based client-side routing | Superseded by ADR-013 |
| ADR-005 | nginx + Docker Compose deployment | Superseded by ADR-014 |
| ADR-006 | JSON files for mission data | Accepted |
| ADR-007 | Separate nginx volume for data directory | Accepted |
| ADR-008 | Lambert solver in Web Worker | Accepted |
| ADR-009 | Free-return flyby as mission scenario | Accepted |
| ADR-010 | Keplerian half-ellipses for transfer arc | Accepted |
| ADR-011 | TypeScript throughout | Accepted |
| ADR-012 | SvelteKit as application framework | Accepted |
| ADR-013 | History API routing | Accepted |
| ADR-014 | GitHub Actions CI + GitHub Pages preview | Accepted |
| ADR-015 | Vitest + Playwright testing | Accepted |
| ADR-016 | All external assets resolved at build time | Accepted |
| ADR-017 | Paraglide-js i18n + locale overlay architecture | Accepted |
| ADR-018 | Mobile-first design, bottom sheet panels | Accepted |
| ADR-019 | JSON schema validation on PR via ajv | Accepted |
| ADR-020 | Canonical mission JSON schema | Accepted (closes RFC-002) |
| ADR-021 | Documentation site at /docs/ via VitePress | Accepted |
| ADR-022 | Lambert worker message protocol | Accepted (closes RFC-003) |
| ADR-023 | Porkchop plot mobile interaction (RFC-006 Option C) | Accepted (closes RFC-006) |
| ADR-024 | Mission URL sharing | Accepted (closes RFC-004) |

---

## Changelog

| Version | Date | Change |
|---|---|---|
| v1.0 | April 2026 | Initial version — components, contracts, constraints, and stack extracted from 04_Technical_Architecture.md and six prototypes |
| v1.1 | April 2026 | Stack updated: TypeScript (ADR-011), SvelteKit (ADR-012), History API routing (ADR-013), GitHub Actions + GH Pages (ADR-014), Vitest + Playwright (ADR-015), build-time assets (ADR-016), Paraglide i18n (ADR-017), mobile-first (ADR-018), ajv validation (ADR-019). ADR-002/003/004/005 marked superseded. |
| v1.2 | April 2026 | §components rewritten to match post-pivot stack: SvelteKit router (ADR-013), TypeScript file extensions, `src/routes/*/+page.svelte` page modules, Svelte components for Nav and Panel. §map updated: RFC-001 closed (superseded by ADR-013); RFC-004 closing-evidence URL corrected to History API form. |
| v1.3 | April 2026 | RFC-002 closed early at Slice 2 entry into ADR-020 (canonical mission JSON schema). §map updated; data-serving §stack row reflects ADR-007's self-hosted-nginx-only scope note; §constraints "browser-only" reworded to be host-agnostic. |
| v1.4 | April 2026 | ADR-021 added: documentation site at /docs/ via VitePress, deployed alongside the app on GitHub Pages. Scope expansion outside the original six slices. |
| v1.5 | April 2026 | RFC-003 closed by ADR-022 (Lambert worker message protocol — id-based cancellation, every-10-row progress, single result message). RFC-006 closed by ADR-023 (porkchop mobile interaction — Option C magnifier with 5×5 cell window, 140 px bubble). Both closures land alongside the /plan implementation in slice checkpoint 3a-8. §map updated. |
| v1.6 | April 2026 | RFC-004 closed by ADR-024 (mission URL sharing — `/fly?mission=id` and `/missions?dest=...&status=...` URL contract, replaceState for filter toggles, no localStorage). Lands with /missions + /fly in Slice 4. §map updated. |
