# CLAUDE.md — Orrery

Instructions for agentic AI working on this codebase. Read this before touching any file.

---

## What this project is

Orrery is a browser-based solar system explorer and Mars mission simulator. Six screens, real orbital mechanics, 28 historical missions, and a free-return Mars flyby scenario. It runs entirely in the browser, deploys offline with Docker Compose, and has no backend or user accounts.

The six screens:
| Route | Screen | File |
|---|---|---|
| `#/moon` | Moon Map | `src/screens/moon.js` |
| `#/explore` | Solar System Explorer | `src/screens/explore.js` |
| `#/plan` | Mission Configurator | `src/screens/plan.js` |
| `#/fly` | Mission Arc | `src/screens/fly.js` |
| `#/missions` | Mission Library | `src/screens/missions.js` |
| `#/earth` | Earth Orbit | `src/screens/earth.js` |

---

## Stack — locked decisions

These are not open questions. Do not propose alternatives.

| Concern | Decision | ADR |
|---|---|---|
| 3D rendering | Three.js r128, local bundle | ADR-001 |
| Framework | None — vanilla JS | ADR-002 |
| Bundler | Vite | ADR-003 |
| Routing | Hash-based (`#/route`) | ADR-004 |
| Deployment | nginx + Docker Compose | ADR-005 |
| Mission data | Static JSON files in `data/` | ADR-006 |
| Data serving | Separate nginx volume for `data/` | ADR-007 |
| Lambert solver | Web Worker (`src/workers/lambert.worker.js`) | ADR-008 |

If you believe a locked decision needs revisiting, write an ADR superseding the relevant one. Do not change the implementation without a new ADR.

---

## Repository structure

```
/
├── CLAUDE.md               ← this file
├── IMPLEMENTATION.md              ← implementation slices and gates
├── README.md               ← public project introduction
├── LICENSE                 ← MIT
├── .gitignore
│
├── data/                   ← static JSON, live-mounted in Docker
│   ├── missions/
│   │   ├── index.json      ← lightweight manifest (28 entries)
│   │   ├── mars/           ← 14 mission files
│   │   └── moon/           ← 14 mission files
│   ├── planets.json
│   ├── rockets.json
│   └── earth-objects.json
│
├── src/
│   ├── main.js             ← entry point, router initialisation
│   ├── router.js           ← hash router
│   ├── state.js            ← shared session state (no persistence)
│   ├── components/
│   │   ├── nav.js          ← shared 52px nav bar
│   │   └── panel.js        ← shared detail panel (right-side slide-in)
│   ├── screens/            ← one file per screen
│   ├── lib/
│   │   ├── data.js         ← fetch + cache for JSON data files
│   │   ├── orbital.js      ← Keplerian mechanics, vis-viva
│   │   ├── scale.js        ← auToPx(), altToVis()
│   │   └── lambert.js      ← Lambert solver (called from worker)
│   └── workers/
│       └── lambert.worker.js
│
├── public/                 ← static assets (fonts, textures, logos)
│
├── docs/
│   ├── concept/            ← concept package (00–05 .md + screenshots)
│   ├── prototypes/         ← P01–P06 .html (ground truth for all design decisions)
│   ├── prd/                ← Product plane
│   ├── uxs/                ← UX plane
│   ├── rfc/                ← Tech plane — open questions
│   └── adr/                ← Tech plane — locked decisions
│
├── vite.config.js
├── docker-compose.yml
└── nginx.conf
```

---

## Data layer

### The rule: data lives in JSON files, not in JS

Mission data, orbital elements, and rocket specs are in `data/`. They are served statically by nginx. The `data/` directory is mounted as a separate Docker volume from `dist/` — updating a mission JSON file requires a restart, not a rebuild.

### The fetch client

All data access goes through `src/lib/data.js`. Never `fetch` a JSON file directly from a screen. The client caches responses in a `Map` so each file is fetched once per session.

```js
import { getMissionIndex, getMission, planets, rockets } from '../lib/data.js';

// Card grid — lightweight
const missions = await getMissionIndex();

// Detail panel — full record loaded on click
const mission = await getMission('curiosity', 'mars');
```

### Mission JSON schema

Each mission file must include these fields (see `docs/prd/` for full schema):
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
  "first": "First nuclear-powered Mars rover",
  "description": "...",
  "links": [{ "l": "...", "u": "...", "t": "intro|core|deep" }],
  "events": [{ "met": 0, "label": "LAUNCH", "note": "...", "type": "nominal|info" }]
}
```

The `events` array powers CAPCOM mode in the fly screen. `met` is mission elapsed time in days.

---

## Physics — do not change without ADR

### Orbital mechanics

All orbital mechanics use Keplerian two-body formulation. No n-body. No perturbations. This is correct for educational purposes and fast enough for a browser.

```js
// Vis-viva equation — orbital velocity at radius r on orbit with semi-major axis a
// MU in AU³/yr², returns km/s
function visViva(a, r) {
  const MU = 4 * Math.PI * Math.PI;
  return Math.sqrt(MU * (2/r - 1/a)) * 4.7404; // 4.7404 = AU/yr to km/s
}

// Planet position at time t (days from J2000)
function keplerPos(a, e, L0, T, t) {
  const nu = L0 + (2 * Math.PI / T) * t; // mean anomaly approximation
  const r = a * (1 - e*e) / (1 + e * Math.cos(nu));
  return { x: Math.cos(nu) * r, y: Math.sin(nu) * r, r };
}
```

### Transfer arc

The mission arc uses real Keplerian half-ellipses, not Bezier curves. The outbound arc sweeps true anomaly ν: 0→π. The return arc sweeps ν: π→2π on the same transfer ellipse. Do not replace with Bezier approximations.

### Lambert solver

The solver runs in a Web Worker. It computes 11,200 cells (112 departure dates × 100 arrival dates) for the porkchop plot. The main thread posts a message with the date range; the worker posts back the full grid. Never run the Lambert solver on the main thread.

### Constants

```js
const MU_SUN     = 4 * Math.PI * Math.PI; // AU³/yr²
const AU_TO_KM   = 149597870.7;
const AU_TO_LMIN = 8.317;                  // light-minutes per AU
const AUPYR_TO_KMS = 4.7404;               // AU/yr to km/s
```

Source: IAU. Do not change these values.

---

## Design system — do not change without UXS update

### Colours

```js
const BG         = '#04040c'; // background — near-black with blue undertone
const ACCENT     = '#4466ff'; // primary accent — blue
const TEAL       = '#4ecdc4'; // secondary accent — teal
const MARS_RED   = '#c1440e'; // Mars, danger
const EARTH_BLUE = '#4b9cd3'; // Earth, information
const GOLD       = '#ffc850'; // Sun, perihelion, caution
```

### Typography

- `'Bebas Neue'` — screen titles, mission names, nav logo. Letter-spacing 4px.
- `'Space Mono'` — all data, labels, HUD values, UI chrome. Monospace.
- `'Crimson Pro' italic` — editorial descriptions, fact text.

### Layout

- Nav bar: `height: 52px`, `background: rgba(4,4,12,0.92)`, `backdrop-filter: blur(14px)`
- Right panel: `width: 314px`, slides in from right
- Bottom bar (arc screen): `height: 68px`
- Z-index: nav = 20, panel = 10, tooltip = 50

### Three.js

- Always use r128. Import from local bundle, not CDN.
- Scene is in AU units (Earth orbit = 1.0). Do not mix scales.
- Sun sphere radius: 0.06 AU. Camera distance: 3.5 AU default.
- `THREE.AdditiveBlending` for all glow effects.

---

## Documentation system

This project uses a four-artifact documentation system. Before writing code for any feature, check whether a PRD, RFC, UXS, or ADR exists for it.

```
docs/
  prd/    → What changes for the user? One PRD per screen or feature.
  uxs/    → What does it look like? One UXS per screen, verified against prototype.
  rfc/    → Open technical questions. Explores alternatives. Closes into ADR(s).
  adr/    → Locked decisions. Append-only. Never edited after acceptance.
```

### Before making a technical decision

1. Check `docs/adr/` — is it already decided?
2. Check `docs/rfc/` — is it being deliberated?
3. If neither: if the decision is clear, write an ADR. If it has genuine alternatives, open an RFC.

### ADR format (short version)

```markdown
# ADR-NNN — [Decision]
> Status · Accepted
> Date · YYYY-MM-DD

## Context
[1-2 sentences]

## Decision
[The decision, stated clearly.]

## Rationale
[Why.]

## Alternatives considered
- [Option] — [why rejected]

## Consequences
Positive: [benefit]
Negative: [trade-off]
```

### When code and docs disagree

The doc and the code are never both right when they disagree. Find which is wrong. Fix the wrong one. Do not tolerate divergence.

---

## Prototypes as ground truth

The six HTML prototypes in `docs/prototypes/` are the authoritative reference for all design decisions, interaction patterns, and physics implementations. If this file disagrees with a prototype, the prototype is correct and this file needs updating.

When extracting a screen from its prototype into `src/screens/`:
1. Open the prototype and verify current behaviour
2. Extract the relevant functions — do not rewrite the physics
3. Replace embedded data with calls to `src/lib/data.js`
4. Preserve the Three.js camera setup, scale, and lighting exactly

---

## What not to do

- Do not add npm dependencies without an RFC or ADR justifying them
- Do not use `localStorage` or `sessionStorage` (no persistence in v1)
- Do not fetch data directly — always use `src/lib/data.js`
- Do not run the Lambert solver on the main thread
- Do not change physics constants without an ADR
- Do not change colour tokens without a UXS update
- Do not use `console.log` in production code
- Do not add a framework (React, Vue, Svelte) — vanilla JS is the decision

---

*Orrery · CLAUDE.md · April 2026 · Update this file when locked decisions change*
