# TA — Technical Authority
*Orrery · Reference document · v1.9 · May 2026*

This is the reference document for the technical plane. RFCs anchor to it by section. ADRs update §stack and §map when decisions are locked. Authoritative listings: [`index.md`](index.md) (ADRs), [`../rfc/index.md`](../rfc/index.md) (RFCs).

---

## §components

The subsystems of the production application.

**Router** — SvelteKit's built-in router using the History API. File-based routing in `src/routes/`. Clean URLs: `/explore`, `/fly?mission=curiosity`, `/missions?dest=MARS`. GitHub Pages deploy uses a `404.html` SPA-redirect workaround per ADR-014. See ADR-012, ADR-013.

**Data client** (`src/lib/data.ts`) — fetch and cache layer for all JSON under `static/data/` (runtime URLs `/data/...` with SvelteKit `base` prefix). Returns parsed JSON with **locale-overlay shallow merge** for missions and other localized records per ADR-017 (not a general-purpose ORM). Cache is a `Map` keyed by URL, session-only. See ADR-006, ADR-017.

**Nav bar component** (`src/lib/components/Nav.svelte`) — shared across all six screens. Renders the 52px bar with wordmark, screen links, and a slot for screen-specific right-region controls. Active screen highlighted in blue. All other screens link to their route via `<a href>`.

**Right panel component** (`src/lib/components/Panel.svelte`) — shared detail panel used by explore, missions, and moon screens. Bottom sheet on mobile, right drawer on desktop per ADR-018. Renders header, tab strip (OVERVIEW/TECHNICAL/LEARN/SIZES), scrollable content area, and optional action footer. Panel content is injected by each screen.

**Orbital library** (`src/lib/orbital.ts`) — Keplerian mechanics. `keplerPos(a, e, L0, T, t)` returns position at time t (days from J2000). `visViva(a, r)` returns orbital velocity in km/s. All constants from IAU; see §contracts.

**Scale library** (`src/lib/scale.ts`) — rendering scale helpers. `auToPx(a_au)` — compressed log-linear scale for solar system 2D. `altToOrbitRadius(alt_km)` — maps satellite altitude (km) to radial distance in the `/earth` 3D scene (replaced the legacy 1D `altToVis` stack from early slices).

**Lambert library** (`src/lib/lambert.ts`) — Lagrange-Gauss short-way Lambert solver. Called only from the Lambert worker, never from the main thread. See ADR-008, RFC-003.

**Lambert worker** (`src/workers/lambert.worker.ts`) — runs the Lambert solver off the main thread. Receives a message with departure date range, arrival date range, step counts, and an optional `destinationId` ('mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn'; defaults to 'mars' for back-compat). Posts back the full porkchop grid (delta-v values for each cell). See RFC-003 + ADR-026.

**Primary route pages** (`src/routes/{explore,plan,fly,missions,earth,moon}/+page.svelte`) — one SvelteKit page per main-nav screen. Additional routes (e.g. `mars/+page.svelte`) ship per PRD without changing the six-screen IA. Each page initialises its canvas/renderer in `onMount()` where needed, loads data via the data client, handles user interaction, and owns HUD or panel state. Pages do not share mutable state directly — they use the data client and URL search params (`$page.url.searchParams`).

---

## §contracts

Data shapes between components.

### Mission index entry (from `static/data/missions/index.json`)

Lightweight manifest for the library grid — **language-neutral fields only** (no `name`, `type`, `first`; those come from locale overlays).

```json
{
  "id": "curiosity",
  "agency": "NASA",
  "dest": "MARS",
  "status": "ACTIVE",
  "year": 2011,
  "sector": "gov",
  "color": "#0B3D91"
}
```

### Full mission record (base file `static/data/missions/<dest_lower>/[id].json` + overlay merge)

Base file holds mechanics + citations; editorial strings and CAPCOM notes are merged from `static/data/i18n/<locale>/missions/<dest>/[id].json` per ADR-017. Shapes are locked by `static/data/schemas/mission.schema.json` (ADR-020).

```json
{
  "id": "curiosity",
  "agency": "NASA",
  "agency_full": "National Aeronautics and Space Administration / Jet Propulsion Laboratory",
  "sector": "gov",
  "dest": "MARS",
  "color": "#0B3D91",
  "year": 2011,
  "status": "ACTIVE",
  "departure_date": "2011-11-26",
  "arrival_date": "2012-08-06",
  "transit_days": 254,
  "vehicle": "Atlas V 541",
  "payload": "3839 kg launch mass (899 kg rover on surface)",
  "delta_v": "~6.1 km/s",
  "data_quality": "good",
  "credit": "© NASA / JPL-Caltech — …",
  "links": [{ "l": "…", "u": "https://…", "t": "intro|core|deep" }],
  "flight_data_quality": "measured",
  "flight": { "launch": {}, "cruise": {}, "arrival": {}, "totals": {}, "events": [] }
}
```

Overlay adds: `name`, `type`, `first`, `description`, `events[].note` (and any other editorial fields the schema allows). `events` (CAPCOM) uses `met` in days. Structured flight timeline: ADR-027.

### Planet record (from `static/data/planets.json`)

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

Locked by ADR-022 (closes RFC-003); generalised over destination by
ADR-026 (closes RFC-007). Every message carries a monotonic `id` so a
new request implicitly cancels any in-flight computation — the main
thread discards stale messages, the worker bails before posting stale
results.

**Main → Worker (request):**
```json
{
  "id": 1,
  "depRange": [0, 1460],
  "arrRange": [80, 520],
  "steps": [112, 100],
  "destinationId": "mars"
}
```

`destinationId` is optional (defaults to `"mars"` for back-compat with
the pre-v0.1.6 contract); valid values: `"mercury" | "venus" | "mars"
| "jupiter" | "saturn" | "uranus" | "neptune" | "pluto" | "ceres"`. The worker reads the destination's
heliocentric ephemerides (a, T, L0) from `static/data/planets.json`
via `lambert-grid.constants.ts`.

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

**Note (v0.1.6):** the worker is dormant for the 5 default destinations
because their grids are pre-computed at build time and committed to
`static/data/porkchop/earth-to-{id}.json` per ADR-016 + ADR-026. The
worker stays in the bundle for any future custom-range computation
(e.g. user-driven date-range editor).

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

- **No hidden business logic in the data client.** Parsed JSON is returned as fetched, except for **documented** shallow merges (missions and other localized records per ADR-017). Filtering, sorting, and physics live at call sites. The client is not an ORM.

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
| Mission data format | Static JSON under `static/data/` (served as `/data/...`) | ADR-006 |
| Data serving | Same static host as the bundle (GH Pages today); separate nginx volume optional for self-hosted nginx per ADR-007's scope note | ADR-007 |
| Lambert solver execution | Web Worker | ADR-008 |
| Lambert worker contract | id-based cancellation, every-10-row progress, single result message; `destinationId` parameter for multi-destination | ADR-022, ADR-026 |
| Porkchop grids | Pre-computed at build time per ADR-016; 9 destinations × 11,200 cells at `static/data/porkchop/` (ADR-026 inner five + ADR-028 outer four) | ADR-026, ADR-028 |
| Default `/fly` scenario | ORRERY-1 free-return Mars flyby | ADR-009 |
| Transfer + mission arcs | Keplerian half-ellipses (heliocentric); lunar segments in `mission-arc` / `fly-physics`; library missions supply distinct geometry (landings, cislunar) | ADR-010 |

---

## §map

State board for all RFCs and ADRs.

### RFCs

| RFC | Title | Status | Closes into | Closing evidence |
|---|---|---|---|---|
| RFC-001 | Router design — hash vs history, param handling | Closed · superseded by ADR-013 | ADR-013 | Pre-empted by ADR-013 (SvelteKit router); see RFC-001 closure note |
| RFC-002 | Mission JSON schema — events array, field canonicalisation | Closed · superseded by ADR-020 | ADR-020 | Closed early at Slice 2 entry to lock schema before mission files were written (28 at v0.1, 36 at v0.3 after ADR-028 catalogue slice) |
| RFC-003 | Lambert worker — message protocol, progress, cancellation | Decided · closed by ADR-022 | ADR-022 | Closed at Slice 3 (3a-8) |
| RFC-004 | Mission URL sharing — serialisation, back-button | Decided · closed by ADR-024 | ADR-024 | Closed at Slice 4 (4a-6) |
| RFC-005 | Accessibility — ARIA on canvas screens, reduced-motion | Decided · closed by ADR-025 | ADR-025 | Closed at Slice 6 (6a-4) |
| RFC-006 | Porkchop plot mobile interaction model | Decided · closed by ADR-023 | ADR-023 | Closed at Slice 3 (3a-8) |
| RFC-007 | Multi-destination porkchop — destination scope, mission-type semantics, transfer-time ranges | Decided · closed by ADR-026 | ADR-026 | Closed at v0.1.6 |
| RFC-008 | Outer planets + dwarf planets in /plan | Decided · closed by ADR-028 | ADR-028 | Tracked for v0.3.0 in RFC index; implementation status coordinated via project issue tracker |
| RFC-009 | Mission flight params + timeline navigator | Closed · closed by ADR-027 | ADR-027 | v0.1.9 |
| RFC-010 | Translation & internationalisation strategy | Closed · closed by ADR-031 / ADR-032 / ADR-033 | ADR-031 / 032 / 033 | v0.3.x |
| RFC-011 | Science page · render pipeline & content authoring | Open | ADR-034 / 035 / 036 (planned) | v0.4 |
| RFC-012 | Mars Surface Map · technical strategy | Open | ADR-037 / 038 / 039 (planned) | v0.4 |
| RFC-013 | ISS Explorer · 3D model pipeline & module pickability | Closed · ADR-040 / 041 / 042 | ADR-040 / 041 / 042 | v0.4 |

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
| ADR-025 | Accessibility tier-1 contract | Accepted (closes RFC-005) |
| ADR-026 | Multi-destination porkchop — data, semantics, selectors | Accepted (closes RFC-007) |
| ADR-027 | Mission flight params + timeline navigator | Accepted (closes RFC-009) |
| ADR-028 | Outer planets + dwarf planets in /plan | Accepted (closes RFC-008) |
| ADR-029 | Service worker via @vite-pwa/sveltekit | Accepted |
| ADR-030 | /fly trajectory math: pure-function isolation + per-mission validation | Accepted |
| ADR-031 | i18n language list and rollout waves | Accepted (closes RFC-010) |
| ADR-032 | Font and script strategy (Wave 1) | Accepted (closes RFC-010) |
| ADR-033 | Translation workflow: LLM-only first-pass | Accepted (closes RFC-010) |

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
| v1.7 | April 2026 | RFC-005 closed by ADR-025 (accessibility tier-1: prefers-reduced-motion stops auto-orbit/auto-rotate/auto-play across canvas screens; nav aria-label; panel focus management + role=tablist/tab/tabpanel; canvas aria-labels direct screen-reader users to detail panels; tier-2 work — canvas-object keyboard nav, full screen-reader description, high-contrast mode — explicitly deferred to v2). Lands with Slice 6. §map updated. |
| v1.8 | April 2026 | RFC-007 closed by ADR-026 (multi-destination porkchop — Earth → 5 destinations: Mercury, Venus, Mars, Jupiter, Saturn; LANDING + FLYBY for inner planets, FLYBY-only for gas giants with disabled-LANDING tooltip; per-destination transfer-time ranges; Y-axis auto-switches days→years above 730d; URL contract `?dest=...&type=...`; pre-computed grids at build time per ADR-016 (~610 KB total); Lambert worker generalised over destinationId). Uranus, Neptune, Pluto, dwarf planets deferred to v0.3.0 + RFC-008. §components/Lambert-worker contract updated; §constraints stack row reflects multi-destination. Lands with v0.1.6. |
| v1.9 | May 2026 | §map extended through RFC-013 and ADR-033 (aligned with index files). §contracts: `static/data/` paths, lightweight `missions/index.json`, schema-accurate mission example + ADR-027 flight block. §components: data-client merge clarification; `altToOrbitRadius` for `/earth`; primary vs extra routes. §constraints: overlay merge exception. §stack: `static/data/` serving; split default scenario vs arc math. RFC-008 closing evidence defers implementation tracking to project issues. |
