# OR-04 · Orrery — Technical Architecture
*April 2026 · v1.0 · Part of the Orrery Concept Package (OR-00 through OR-05)*

---

## Purpose

This document defines the technical architecture for building Orrery as a production-grade, self-hostable web application. It is written after the six prototypes (OR-P01 through OR-P06) and after OR-05 Design System — meaning every decision here is grounded in what the UI actually needs, not what was aspirationally planned.

Section 10 of OR-05 identified eight design decisions that create direct technical requirements. This document responds to all eight and organises them into a coherent architecture.

---

## 1. Guiding constraints

Before any stack decision, three constraints bound the architecture completely:

**1. Runs in a browser, offline.** The Docker Compose deployment target means the app must function without external CDN dependencies. Google Fonts, Three.js CDN, NASA logo hotlinks — all must be bundled or self-hosted. The NASA Images API is the one intentional runtime dependency, and it degrades gracefully when unavailable.

**2. No server required for Phase 1.** The six prototype screens are entirely client-side. No database, no auth, no server-side rendering. The Docker Compose target is simply an nginx container serving static files. This is a feature, not a limitation — it means zero backend operational burden for a self-hoster.

**3. The prototypes are the ground truth.** The architecture must not invent new constraints that require rewriting working screens. Everything the prototypes do is correct; the architecture exists to connect them, bundle them, and make them deployable.

---

## 2. Stack decisions

### 2.1 JavaScript — no framework

All six prototype screens are written in vanilla JavaScript. No React, no Vue, no Svelte. This was not an oversight — it was correct.

The primary rendering targets are Three.js (3D) and Canvas 2D (porkchop plot, Moon map flat view). Both are imperative APIs. A declarative component framework adds abstraction without benefit and introduces reconciliation overhead in animation loops that run at 60 fps.

**Decision: vanilla JS throughout Phase 1.** If Phase 2 introduces complex shared state (mission builder, user accounts), evaluate a lightweight state library (Zustand or Nano Stores) without adopting a full framework.

### 2.2 3D rendering — Three.js r128

Three.js r128 is pinned. It is used across four screens (OR-P01, OR-P03, OR-P05, OR-P06). The CDN reference `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` must be replaced with a locally bundled copy in production.

**Why r128 specifically:** Later versions (r140+) introduced breaking changes to `WebGLRenderer` initialisation and `MeshStandardMaterial` defaults. An upgrade would require testing all four 3D screens. This is a Phase 2 task if a specific Three.js feature is needed.

**Decision: bundle `three.min.js` locally at r128. Pin in `package.json`. Do not auto-update.**

### 2.3 2D rendering — Canvas API

The porkchop plot (OR-P02) and Moon map flat view (OR-P06) use raw Canvas 2D. The porkchop heatmap uses `ImageData` for direct pixel manipulation — the only way to render 11,200 cells at interactive speed. This cannot be replaced with SVG or DOM elements.

**Decision: Canvas 2D for all 2D rendering. No charting library.**

### 2.4 CSS — no utility framework

All styling is inline CSS in JavaScript string templates, or `<style>` blocks within each HTML file. This is consistent and correct for the prototype stage. In the production build, these migrate to module CSS or a single shared stylesheet.

**Decision: no Tailwind, no Bootstrap. Module CSS in production build.**

### 2.5 Build tooling — Vite

Vite is the build tool for Phase 1 production. It provides:
- ES module bundling without configuration overhead
- Asset handling for Three.js and font files
- Dev server with hot module replacement for fast iteration
- Static output compatible with nginx serving

**Decision: Vite. `vite.config.js` with `base: '/'` and asset inlining for fonts.**

---

## 3. Repository structure

```
orrery/
├── docker-compose.yml          ← Phase 1 deployment
├── nginx.conf                  ← Static file serving config
├── package.json                ← Vite + dependencies
├── vite.config.js
│
├── public/
│   ├── fonts/                  ← Self-hosted Google Fonts (see section 5.3)
│   │   ├── space-mono-400.woff2
│   │   ├── space-mono-700.woff2
│   │   ├── bebas-neue-400.woff2
│   │   └── crimson-pro-400italic.woff2
│   ├── logos/                  ← Agency logos (see section 5.4)
│   │   ├── nasa.svg
│   │   ├── esa.svg
│   │   ├── cnsa.svg
│   │   └── ...
│   ├── textures/               ← Three.js textures
│   │   ├── earth_atmos_2048.jpg
│   │   └── moon_1024.jpg
│   └── favicon.ico
│
├── data/                       ← Plain JSON — no build step needed
│   ├── missions/
│   │   ├── index.json          ← Lightweight manifest for card grid
│   │   ├── mars/               ← One file per Mars mission
│   │   │   ├── curiosity.json
│   │   │   ├── perseverance.json
│   │   │   └── ...
│   │   └── moon/               ← One file per Moon mission
│   │       ├── apollo-11.json
│   │       ├── chandrayaan-3.json
│   │       └── ...
│   ├── planets.json            ← Orbital elements, physical constants
│   ├── rockets.json            ← Launch vehicle specs
│   └── earth-objects.json      ← ISS, JWST, Hubble, etc.
│
├── src/
│   ├── main.js                 ← Router entry point
│   ├── router.js               ← Client-side router
│   ├── state.js                ← Shared application state (session-only)
│   │
│   ├── workers/
│   │   └── lambert.worker.js   ← Lambert solver (off main thread)
│   │
│   ├── screens/
│   │   ├── explorer/           ← OR-P01 Solar system
│   │   ├── configurator/       ← OR-P02 Porkchop
│   │   ├── arc/                ← OR-P03 Mission arc
│   │   ├── library/            ← OR-P04 Mission library
│   │   ├── earth/              ← OR-P05 Earth orbit
│   │   └── moon/               ← OR-P06 Moon map
│   │
│   ├── components/
│   │   ├── nav.js              ← Shared navigation bar
│   │   ├── panel.js            ← Shared detail panel
│   │   ├── toggle.js           ← 3D/2D view toggle
│   │   ├── logo.js             ← Agency logo component
│   │   └── links.js            ← Educational link rows
│   │
│   └── lib/
│       ├── data.js             ← Fetch + cache layer for JSON data files
│       ├── orbital.js          ← Keplerian mechanics, vis-viva
│       ├── scale.js            ← auToPx(), altToVis() — design constants
│       ├── lambert.js          ← Lambert solver (called from worker)
│       └── images.js           ← NASA Images API client
│
└── docs/
    ├── OR-01_Orrery_Vision.md
    ├── OR-03_Data_Catalog.md
    ├── OR-04_Technical_Architecture.md   ← this file
    └── OR-05_Design_System.md
```

---

## 4. Client-side router

The six screens are currently six independent HTML files. In production they become six routes in a single-page application. The router is simple — no nested routes, no lazy loading complexity in Phase 1.

### 4.1 URL schema

| Route | Screen | Notes |
|---|---|---|
| `/` | Solar system explorer | Default view |
| `/earth` | Earth orbit viewer | |
| `/moon` | Moon map | |
| `/plan` | Mission configurator (porkchop) | |
| `/plan?dep=2026-10-15&tof=280` | Configurator with pre-selected window | URL-serialisable state |
| `/fly` | Mission arc — personal mission | Reads from shared state |
| `/fly?id=curiosity` | Mission arc — historical mission | Direct link |
| `/missions` | Mission library | |
| `/missions?dest=moon` | Library filtered to Moon | |
| `/missions?id=apollo11` | Library with Apollo 11 open | |

### 4.2 Router implementation

Hash-based routing (`/#/fly?id=curiosity`) in Phase 1 — works without server-side configuration and is compatible with static nginx serving. History API routing in Phase 2 when server-side redirects can be configured.

```javascript
// src/router.js
const ROUTES = {
  '/':          () => import('./screens/explorer/index.js'),
  '/earth':     () => import('./screens/earth/index.js'),
  '/moon':      () => import('./screens/moon/index.js'),
  '/plan':      () => import('./screens/configurator/index.js'),
  '/fly':       () => import('./screens/arc/index.js'),
  '/missions':  () => import('./screens/library/index.js'),
};

function route() {
  const path = location.hash.replace('#', '') || '/';
  const [base, query] = path.split('?');
  const params = new URLSearchParams(query);
  const loader = ROUTES[base] || ROUTES['/'];
  loader().then(mod => mod.mount(document.getElementById('app'), params));
}

window.addEventListener('hashchange', route);
route(); // initial load
```

### 4.3 State handoff — configurator to arc

The mission configurator (OR-P02) must pass a trajectory solution to the mission arc (OR-P03). In Phase 1 this uses `sessionStorage`. In Phase 2 it is URL-serialised.

```javascript
// When user confirms a trajectory in OR-P02:
sessionStorage.setItem('orrery:planned-mission', JSON.stringify({
  dep: '2026-10-15',       // ISO date
  tof: 280,                // days
  dv: 5.82,               // km/s
  vehicle: 'falcon-heavy',
  payload: 2500,           // kg
  name: 'ORRERY-1',
}));
location.hash = '/fly';

// OR-P03 reads on mount:
const mission = JSON.parse(sessionStorage.getItem('orrery:planned-mission'));
```

---

## 5. Responding to OR-05 design decisions

OR-05 section 10 identified eight design decisions with technical implications. Each is addressed below.

### 5.1 Lambert solver — Web Worker

**OR-05 finding:** The porkchop plot computes 11,200 Lambert solutions on the main thread, blocking rendering for ~2 seconds at startup.

**Architecture response:** The Lambert solver moves to a dedicated Web Worker in production. The main thread sends grid parameters; the worker returns the completed heatmap as a `Float32Array` of delta-v values; the main thread renders it.

```javascript
// src/workers/lambert.worker.js
self.onmessage = ({ data: { depDays, tofDays, gridW, gridH } }) => {
  const dvGrid = new Float32Array(gridW * gridH);
  for (let i = 0; i < gridW; i++) {
    for (let j = 0; j < gridH; j++) {
      dvGrid[j * gridW + i] = solveLambert(depDays[i], tofDays[j]);
    }
  }
  self.postMessage({ dvGrid }, [dvGrid.buffer]); // transferable
};

// src/screens/configurator/index.js
const worker = new Worker(new URL('../../workers/lambert.worker.js', import.meta.url));
worker.postMessage({ depDays, tofDays, gridW: 140, gridH: 80 });
worker.onmessage = ({ data: { dvGrid } }) => renderHeatmap(dvGrid);
```

The main thread shows a loading state ("Computing 11,200 trajectories…") while the worker runs. This is accurate and educational — it tells the user what is happening.

### 5.2 Three.js — local bundle

**OR-05 finding:** All 3D screens load Three.js from Cloudflare CDN. Offline use fails.

**Architecture response:** `npm install three@0.128.0` (exact version). Vite bundles it. The CDN script tags in the prototype files are replaced with ES module imports.

```javascript
// Before (prototype):
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

// After (production):
import * as THREE from 'three'; // resolved by Vite to node_modules/three
```

**Bundle size impact:** Three.js r128 minified is ~600 KB. With Vite tree-shaking, expected reduction to ~300–400 KB for the modules actually used. Split per-screen so only the screens that need Three.js load it.

### 5.3 Fonts — self-hosted

**OR-05 finding:** Google Fonts are loaded via CDN. Offline deployments will fall back to system monospace/serif — which breaks the typographic character of the product.

**Architecture response:** Download all four weights at build time and serve from `public/fonts/`. Use `@font-face` with `font-display: swap` so text renders immediately in the system fallback and transitions when the custom font loads.

```css
@font-face {
  font-family: 'Space Mono';
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/space-mono-400.woff2') format('woff2');
}
```

Script to download fonts at project setup time (runs once, not at build time):

```bash
# scripts/download-fonts.sh
npx google-fonts-helper \
  --fonts "Space Mono:400,700" \
  --fonts "Bebas Neue:400" \
  --fonts "Crimson Pro:400italic" \
  --output public/fonts/
```

### 5.4 Agency logos — local hosting

**OR-05 finding:** Agency logos are hotlinked from `upload.wikimedia.org`. The text abbreviation fallback is always visible, so this degrades gracefully, but production should not depend on Wikimedia availability.

**Architecture response:** Download SVG/PNG logos to `public/logos/` at project setup. The `logoHTML()` component references `/logos/nasa.svg` instead of the Wikimedia URL. The text fallback remains as a loading state and offline fallback.

```javascript
// src/components/logo.js
const LOGOS = {
  NASA:      { src: '/logos/nasa.svg',      bg: '#0B3D91', abbr: 'NASA' },
  ESA:       { src: '/logos/esa.svg',       bg: '#1C3C8A', abbr: 'ESA'  },
  CNSA:      { src: '/logos/cnsa.svg',      bg: '#DE2910', abbr: 'CNSA' },
  ISRO:      { src: '/logos/isro.svg',      bg: '#1a1a2e', abbr: 'ISRO' },
  ROSCOSMOS: { src: '/logos/roscosmos.svg', bg: '#0d0d1a', abbr: 'RSC'  },
  JAXA:      { src: '/logos/jaxa.svg',      bg: '#0062AC', abbr: 'JAXA' },
  SpaceX:    { src: '/logos/spacex.svg',    bg: '#000000', abbr: 'SX'   },
};
```

Trademark notices are added to every panel footer per OR-03 credit format reference.

### 5.5 NASA Images API — CORS open, graceful degradation

**OR-05 finding:** The gallery tab fetches from `images-api.nasa.gov` at runtime. CORS is open. Offline deployments fail gracefully.

**Architecture response:** No change to the API call pattern. The gallery already shows a placeholder when the fetch fails. In production, add a 5-second timeout and a `try/catch` that renders the placeholder — both are already partially implemented in the prototypes.

```javascript
// src/lib/images.js
export async function fetchNASAImages(query, count = 9) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page_size=${count}`,
      { signal: controller.signal }
    );
    const data = await res.json();
    return (data.collection?.items || []).slice(0, count);
  } catch {
    return []; // caller renders placeholder
  } finally {
    clearTimeout(timeout);
  }
}
```

For non-NASA missions, curated static image URLs are defined in the mission data objects (`gallery_imgs` field per OR-03 schema). These load as regular `<img>` tags with `onerror` fallback.

### 5.6 Client-side router and shared state

**OR-05 finding:** No shared state between screens. Mission planned in OR-P02 is not passed to OR-P03 automatically.

**Architecture response:** The router (section 4) and `sessionStorage` state handoff (section 4.3) solve this for Phase 1. Shared state that persists across sessions is a Phase 2 requirement.

```javascript
// src/state.js — Phase 1 (session-only)
export const state = {
  get plannedMission() {
    return JSON.parse(sessionStorage.getItem('orrery:planned-mission') || 'null');
  },
  set plannedMission(v) {
    sessionStorage.setItem('orrery:planned-mission', JSON.stringify(v));
  },
  get selectedWindow() {
    return JSON.parse(sessionStorage.getItem('orrery:window') || 'null');
  },
  set selectedWindow(v) {
    sessionStorage.setItem('orrery:window', JSON.stringify(v));
  },
};
```

### 5.7 URL-serialisable state — mission sharing

**OR-05 finding:** `simT` is local state. Mission sharing requires URL-serialisable parameters.

**Architecture response:** The URL schema in section 4.1 defines the serialisation format. A planned mission can be encoded as:

```
/fly?dep=2026-10-15&tof=280&dv=5.82&vehicle=falcon-heavy&payload=2500&name=ORRERY-1
```

The arc screen reads these parameters on mount and reconstructs the trajectory. This enables direct sharing of a mission link. Implementation is Phase 2 — Phase 1 uses `sessionStorage` handoff.

### 5.8 Scale functions — design constants in code

**OR-05 finding:** The `auToPx()` and `altToVis()` functions contain magic numbers that are design constants, documented in OR-03 but not isolated in code.

**Architecture response:** Both functions live in `src/lib/scale.js` with explicit documentation linking to OR-03.

```javascript
// src/lib/scale.js

/**
 * Maps an orbital radius in AU to a visual pixel radius.
 * Uses manually compressed scale anchors to keep all planets
 * visible on screen while preserving relative ordering.
 * See OR-03 section 1.7 for the full anchor table.
 */
export function auToPx(au) {
  const ANCHORS = [
    [0.387, 52],  // Mercury
    [0.723, 83],  // Venus
    [1.000, 113], // Earth (reference)
    [1.524, 155], // Mars
    [5.203, 248], // Jupiter
    [9.537, 320], // Saturn
    [19.19, 378], // Uranus
    [30.07, 430], // Neptune
  ];
  // Linear interpolation between anchors
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [a0, p0] = ANCHORS[i], [a1, p1] = ANCHORS[i + 1];
    if (au >= a0 && au <= a1) return p0 + (au - a0) / (a1 - a0) * (p1 - p0);
  }
  return au < ANCHORS[0][0] ? ANCHORS[0][1] : ANCHORS.at(-1)[1];
}

/**
 * Maps an orbital altitude in km to a visual pixel radius for the
 * Earth orbit viewer. Logarithmic scale to show ISS through JWST
 * on the same screen (3,750× range).
 * Formula: EARTH_VIS_R + LOG_K × log₁₀(1 + alt_km / 100)
 * See OR-03 section 1.8 for derivation.
 */
const EARTH_VIS_R = 38; // px — visual Earth radius
const LOG_K       = 54; // px per decade of altitude
export function altToVis(alt_km) {
  return EARTH_VIS_R + LOG_K * Math.log10(1 + alt_km / 100);
}
```

---

## 6. Data layer

Data and code are separate things. Mission records, orbital elements, rocket specs, and Earth orbit objects all live as plain JSON files, served statically by nginx alongside the application bundle. No database. No backend. A contributor who wants to add a mission or correct a date edits a JSON file — they do not touch JavaScript, do not understand the build, and do not need to trigger a rebuild.

This is the right approach for a curated catalogue of 30 missions that changes slowly and deliberately. It will remain correct even as the catalogue grows to 100 missions.

### 6.1 Data directory structure

```
data/
├── missions/
│   ├── index.json              ← Lightweight manifest — card grid data only
│   ├── mars/
│   │   ├── curiosity.json
│   │   ├── perseverance.json
│   │   ├── mars-3.json
│   │   ├── mars-express.json
│   │   ├── hope-probe.json
│   │   ├── tianwen-1.json
│   │   ├── maven.json
│   │   ├── insight.json
│   │   ├── viking-1.json
│   │   ├── pathfinder.json
│   │   ├── spirit.json
│   │   ├── opportunity.json
│   │   ├── mangalyaan.json
│   │   ├── mariner-4.json
│   │   ├── mars-sample-return.json
│   │   └── starship-mars.json
│   └── moon/
│       ├── apollo-11.json
│       ├── apollo-17.json
│       ├── luna-9.json
│       ├── lunokhod-1.json
│       ├── luna-24.json
│       ├── clementine.json
│       ├── lro.json
│       ├── chandrayaan-1.json
│       ├── chandrayaan-3.json
│       ├── change-4.json
│       ├── change-5.json
│       ├── change-6.json
│       ├── slim.json
│       └── artemis-3.json
├── planets.json                ← Orbital elements + physical constants
├── rockets.json                ← Launch vehicle specs
└── earth-objects.json          ← ISS, JWST, Hubble, etc.
```

### 6.2 The index manifest

`missions/index.json` contains only the fields needed to render the card grid and power filtering. Full mission detail is fetched on demand when a card is clicked.

```json
[
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
    "first": "First nuclear-powered Mars rover · Still active after 12 years"
  },
  {
    "id": "apollo-11",
    "name": "Apollo 11",
    "agency": "NASA",
    "dest": "MOON",
    "status": "FLOWN",
    "year": 1969,
    "type": "CREWED LANDER",
    "sector": "gov",
    "color": "#0B3D91",
    "first": "First humans on the Moon"
  }
]
```

This keeps the initial page load fast. Fetching 30 lightweight index entries is trivial; fetching 30 full mission objects with descriptions, link arrays, and gallery data on every page load is wasteful.

### 6.3 Individual mission file

Each mission file is the full record conforming to the OR-03 schema. Example:

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
  "j2000": 4347,
  "vehicle": "Atlas V 541",
  "payload": "899 kg",
  "dv": "~6.1 km/s",
  "collabs": [],
  "first": "First nuclear-powered Mars rover · Still active after 12 years",
  "description": "The only nuclear-powered rover on Mars. Has driven 31+ km across Gale Crater, climbed 700 m up Mount Sharp, and confirmed that Mars once had conditions suitable for microbial life. Still active after 12 years — the longest-running Mars surface mission ever.",
  "data_quality": "good",
  "credit": "© NASA/JPL-Caltech — U.S. Government work · Public domain",
  "gallery_query": "Curiosity rover Mars Gale Crater",
  "links": [
    { "l": "Curiosity — Wikipedia",          "u": "https://en.wikipedia.org/wiki/Curiosity_(rover)", "t": "intro" },
    { "l": "Mars Science Laboratory — NASA", "u": "https://mars.nasa.gov/msl/",                      "t": "intro" },
    { "l": "MSL science results (JGR 2014)", "u": "https://doi.org/10.1002/2014JE004612",            "t": "deep"  }
  ]
}
```

Adding a new mission means creating one new JSON file and adding one entry to `index.json`. No JavaScript is touched. No rebuild is required — nginx serves the new file immediately on next request.

### 6.4 Orbital and reference data

Physics constants and planetary elements are also JSON, not JavaScript. They change only when IAU updates a constant — which is rare and deliberate.

```json
// data/planets.json
{
  "constants": {
    "mu_sun_au3_yr2": 39.4784,
    "au_to_km": 149597870.7,
    "au_to_light_minutes": 8.3167,
    "aupyr_to_kms": 4.7404
  },
  "planets": [
    { "name": "Mercury", "a": 0.387, "T": 87.97,  "L0": 0.5,   "incl": 7.00 },
    { "name": "Venus",   "a": 0.723, "T": 224.70, "L0": 1.2,   "incl": 3.39 },
    { "name": "Earth",   "a": 1.000, "T": 365.25, "L0": 1.753, "incl": 0.00 },
    { "name": "Mars",    "a": 1.524, "T": 686.97, "L0": 6.203, "incl": 1.85 },
    { "name": "Jupiter", "a": 5.203, "T": 4332.59,"L0": 0.6,   "incl": 1.30 },
    { "name": "Saturn",  "a": 9.537, "T": 10759.2,"L0": 1.2,   "incl": 2.49 },
    { "name": "Uranus",  "a": 19.19, "T": 30688.5,"L0": 2.8,   "incl": 0.77 },
    { "name": "Neptune", "a": 30.07, "T": 60182.0,"L0": 3.1,   "incl": 1.77 }
  ]
}
```

### 6.5 Data client — thin fetch layer

The front end has a single data module that knows how to fetch and cache. It does not transform data — it returns it as-is from the JSON files.

```javascript
// src/lib/data.js

const cache = new Map();

async function get(url) {
  if (cache.has(url)) return cache.get(url);
  const data = await fetch(url).then(r => {
    if (!r.ok) throw new Error(`Data fetch failed: ${url}`);
    return r.json();
  });
  cache.set(url, data);
  return data;
}

// Mission index — used by card grid and filters
export async function getMissionIndex() {
  return get('/data/missions/index.json');
}

// Full mission record — fetched on card click
export async function getMission(id, dest) {
  return get(`/data/missions/${dest.toLowerCase()}/${id}.json`);
}

// Filter on the client — index is small enough
export async function filterMissions({ dest, status, agency } = {}) {
  const index = await getMissionIndex();
  return index.filter(m =>
    (!dest   || m.dest   === dest)   &&
    (!status || m.status === status) &&
    (!agency || m.agency === agency)
  );
}

// Reference data
export const planets      = () => get('/data/planets.json');
export const rockets      = () => get('/data/rockets.json');
export const earthObjects = () => get('/data/earth-objects.json');
```

The `cache` map means each JSON file is fetched at most once per session. No library needed — browser `fetch` plus a Map is sufficient.

### 6.6 Nginx — serving data files

The data directory is mounted directly into the nginx container alongside the built app. No rebuild is needed to update data.

```yaml
# docker-compose.yml
services:
  orrery:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./dist:/usr/share/nginx/html:ro        ← built JS/CSS/assets
      - ./data:/usr/share/nginx/html/data:ro   ← JSON files, live-mounted
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

The key detail: `data/` is a separate volume from `dist/`. Updating a mission JSON file and running `docker compose restart` (or nothing, if nginx serves the file fresh on each request with no-cache headers for JSON) takes effect immediately. No rebuild, no redeploy of the application bundle.

Add this to the nginx config:

```nginx
# Serve JSON data files — short cache so updates are visible quickly
location /data/ {
  expires 5m;
  add_header Cache-Control "public, must-revalidate";
  add_header Content-Type "application/json";
}
```

### 6.7 Contributing a mission — workflow

This is what the data layer makes possible. From the contributor's perspective:

```bash
# 1. Copy the template
cp data/missions/mars/curiosity.json data/missions/moon/my-new-mission.json

# 2. Edit the JSON file with the mission details
# (No JavaScript knowledge required)

# 3. Add one line to the index
# data/missions/index.json — add the lightweight entry

# 4. Done. Restart or the next request picks it up automatically.
docker compose restart
```

A pull request for a new mission is a diff of two JSON files. It can be reviewed by anyone who knows the mission, regardless of whether they can read JavaScript.

---

## 7. Docker Compose deployment

### 7.1 Nginx configuration

```nginx
# nginx.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # SPA routing — all paths serve index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache static assets aggressively
  location ~* \.(js|css|woff2|jpg|png|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # No cache for HTML (so deployments take effect immediately)
  location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-store";
  }

  # JSON data files — short cache so mission updates are visible quickly
  # data/ is a live-mounted volume, separate from the built app bundle
  location /data/ {
    expires 5m;
    add_header Cache-Control "public, must-revalidate";
  }

  # Security headers
  add_header X-Frame-Options SAMEORIGIN;
  add_header X-Content-Type-Options nosniff;
  add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

The critical detail: `data/` is mounted as a separate volume from `dist/`. This means updating a mission JSON file and running `docker compose restart` takes effect immediately — no application rebuild required.

```yaml
# docker-compose.yml
services:
  orrery:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./dist:/usr/share/nginx/html:ro        # built JS/CSS/assets — needs rebuild to update
      - ./data:/usr/share/nginx/html/data:ro   # JSON data — edit and restart, no rebuild
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

### 7.2 Build pipeline

```bash
# One-time setup
npm install
bash scripts/download-fonts.sh
bash scripts/download-logos.sh
bash scripts/download-textures.sh

# Development
npm run dev       # Vite dev server at localhost:5173
                  # data/ files served directly — no build needed for data changes

# Production build
npm run build     # Outputs to dist/ — only needed for JS/CSS/asset changes

# Deploy
docker compose up

# Update mission data without rebuilding
vim data/missions/mars/curiosity.json   # edit the JSON
docker compose restart                  # nginx picks up changes immediately
```

### 7.3 Environment variables

The NASA Images API requires no key. No environment variables are needed for Phase 1. If a future API requires authentication, variables are injected at build time via Vite's `import.meta.env`:

```
# .env (not committed)
VITE_NASA_API_KEY=DEMO_KEY
```

---

## 8. Phase 1 vs Phase 2 scope

### Phase 1 — what gets built first

Phase 1 is the six prototype screens, connected by a router, bundled for offline use, deployable with Docker Compose.

| Deliverable | Description |
|---|---|
| Router | Hash-based, six routes, URL params for mission IDs |
| Shared components | Nav, panel, toggle, logo, links — extracted from prototypes |
| JSON data layer | 30 mission files + index + planets/rockets/earth-objects — no JS |
| Data client | `src/lib/data.js` — fetch, cache, filter |
| Lambert worker | Solver moved off main thread |
| Asset bundling | Three.js, fonts, logos, textures — all local |
| Docker deployment | Single `docker compose up` installs and runs |

### Phase 2 — what comes after

Phase 2 is explicitly out of scope for the initial build. It is listed here so architectural decisions in Phase 1 do not accidentally prevent it.

| Feature | Technical prerequisite |
|---|---|
| Mission sharing via URL | URL serialisation of arc state (section 5.7) |
| Rocket configurator | Form state, validation, Tsiolkovsky solver (already in OR-P02) |
| Moon arc screen | New screen, Earth-Moon Lambert variant, shorter timescale telemetry |
| User-saved missions | LocalStorage or server-side persistence; requires auth design |
| History API routing | Server-side redirect config added to nginx |
| Mobile layout | CSS breakpoints, touch-first interaction redesign |
| Accessibility | ARIA roles, keyboard navigation, `prefers-reduced-motion` |
| Three.js upgrade | Full audit of four 3D screens, breaking change testing |

---

## 9. Performance targets

| Metric | Target | How achieved |
|---|---|---|
| First contentful paint | < 1.5s | Vite code splitting, font `display: swap` |
| Time to interactive | < 3s | Lambert solver in Web Worker, non-blocking |
| 3D frame rate | 60 fps | `devicePixelRatio` capped at 2×, hit mesh optimisation |
| 2D canvas frame rate | 60 fps | Canvas cleared and redrawn per frame, no DOM diff |
| Porkchop computation | < 100ms (worker) | Off main thread, typed arrays, 52 iterations |
| Bundle size (initial) | < 500 KB gzipped | Three.js tree-shaking, per-screen code splitting |
| Offline availability | Full (minus gallery) | All assets local; NASA Images API degrades gracefully |

---

## 10. Open questions for Phase 2

These are not blockers for Phase 1 but must be resolved before Phase 2 begins:

1. **Moon arc telemetry model.** The mission arc (OR-P03) uses a solar-system-scale vis-viva model. A Moon arc needs an Earth-Moon scale, different Δv ranges, and a 3-day transit rather than 259 days. It is a new screen, not a variation of OR-P03.

2. **Mission sharing format.** URL parameters work for simple missions. A complex configured mission (custom vehicle, custom payload, multi-burn trajectory) needs a more compact serialisation — possibly base64-encoded JSON.

3. **Offline gallery strategy.** The NASA Images API requires internet. For a fully offline deployment, a curated subset of images (5 per mission, pre-downloaded) could be bundled. This is a content decision, not a technical one — but it requires a policy choice.

4. **Legal review for production.** Agency logo nominative use and NASA public domain claims are well-established. CNSA and ISRO imagery is less clearly licensed. A legal review of the credit format before any public launch is recommended.

5. **Data update cadence.** Static mission data goes stale when missions launch, land, or are cancelled. A lightweight data update mechanism — even a manually edited JSON file outside the main bundle — would allow mission status updates without a full rebuild.

---

*Orrery · OR-04 Technical Architecture · April 2026 · Living document*
*← OR-03 Data Catalog · OR-05 Design System →*
