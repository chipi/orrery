# Orrery

The orbital mechanics tools NASA uses to reach Mars, rebuilt for anyone who's curious. Real physics, real missions from Luna 9 to Artemis. Beautiful, educational, self-hostable.

## What it is

Orrery is a browser-based solar system explorer and Mars mission simulator. It uses the same orbital mechanics behind real mission planning — Keplerian orbits, Lambert solvers, porkchop plots — and presents them in a way that a curious person can understand by doing.

The name comes from a mechanical model of the solar system. That is exactly what Orrery does, at the scale of a screen.

## Six screens

| Screen | What it shows |
|---|---|
| **Moon Map** | 16 landing sites across 5 nations — the capability ladder that made Mars possible |
| **Solar System Explorer** | Real-time 3D/2D orrery — planets, Kuiper Belt, comets, Earth orbital neighbourhood |
| **Mission Configurator** | Real Lambert solver, 11,200-cell porkchop plot per destination — Earth → Mercury / Venus / Mars / Jupiter / Saturn with LANDING / FLYBY toggle (ADR-026) |
| **Mission Arc** | Fly your mission — live telemetry, transfer arc, fuel model, timeline scrubber |
| **Mission Library** | 28 historical missions (Mars + Moon) — every agency, every outcome, replayable |
| **Earth Orbit** | ISS to JWST on a logarithmic scale — the infrastructure that makes space possible |

## Try it

**Live:** <https://chipi.github.io/orrery/> — every screen, fully offline-capable after first load.

The original concept-package prototypes still ship in `docs/prototypes/` and open directly in a browser:

```
docs/prototypes/P01_solar-system-explorer.html
docs/prototypes/P02_mission-configurator.html
docs/prototypes/P03_mission-arc.html
docs/prototypes/P04_mission-library.html
docs/prototypes/P05_earth-orbit.html
docs/prototypes/P06_moon-map.html
```

The prototypes pull from CDN; the production build (above) self-hosts every asset per ADR-016.

## Getting started

Requirements: Node 20+, npm 10+.

```bash
git clone https://github.com/chipi/orrery
cd orrery
npm install
```

### Development

```bash
npm run dev              # dev server at http://localhost:5173
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright e2e (build runs first)
npm run typecheck        # svelte-check + i18n compile
npm run lint             # prettier + eslint
npm run validate-data    # ajv schema check + doc-system gating sentences
npm run ci               # everything above except e2e — what GH Actions runs on every PR
```

### Build

```bash
npm run build            # production SPA in ./build (adapter-static)
npm run preview          # serve ./build at http://localhost:4173
npm run docs:build       # VitePress docs site at docs/.vitepress/dist
```

### Deploy

Push to `main` — `.github/workflows/preview.yml` builds the app + docs and publishes to GitHub Pages. A weekly cron rebuild keeps mission imagery fresh (Mondays 06:00 UTC).

## Documentation

The full architecture and concept docs are published at **<https://chipi.github.io/orrery/docs/>** — a VitePress-built site with search, sidebar navigation, and access to the six original prototype HTMLs (see ADR-021 for the docs-site architecture).

Six documents fully specify the concept, data, design, and architecture.

| Document | Contents |
|---|---|
| [00 Introduction](docs/concept/00_Introduction.md) | What this package is and how to read it |
| [01 Vision](docs/concept/01_Orrery_Vision.md) | Why Orrery exists — the Moon-to-Mars narrative, credit philosophy |
| [02 Project Concept](docs/concept/02_Project_Concept.md) | Full synthesis — what Orrery is, does, and means |
| [03 Data Catalog](docs/concept/03_Data_Catalog.md) | Every source, constant, mission schema, and credit format |
| [04 Technical Architecture](docs/concept/04_Technical_Architecture.md) | Stack, repo structure, JSON data layer, Docker Compose |
| [05 Design System](docs/concept/05_Design_System.md) | Colour, typography, components, screen patterns, screenshots |

**If you read one document:** read 02. It is the complete synthesis.

**If you want to add a mission:** read 03. Mission data is plain JSON — no JavaScript required.

**If you want to build:** read 04 for original concept-package context, then `docs/adr/TA.md` and `CLAUDE.md` for the locked production stack: SvelteKit + TypeScript (strict) + Three.js r128 + Vite, deployed as a fully static site (GitHub Pages preview today, production hosting TBD per ADR-014). Concept-package details about Docker Compose / vanilla JS describe Phase 1 and are superseded.

## Physics

- Keplerian orbital mechanics, J2000 epoch (correct enough to teach, fast enough for a browser)
- Lambert solver: Lagrange-Gauss short-way formulation, 52 iterations, 11,200 cells
- Vis-viva equation for heliocentric velocity telemetry
- Tsiolkovsky rocket equation for payload/fuel calculations
- Log scale for Earth orbit: `EARTH_VIS_R + LOG_K × log₁₀(1 + alt_km / 100)`

All constants documented in 03 with IAU sources.

## Data

Mission data lives in plain JSON files — one per mission — served statically. No database. No backend. Adding a mission is editing a JSON file. A pull request for a new mission is a diff of two files.

Images come from NASA's public domain library (live API), ESA CC BY-SA IGO archive, ISRO, CNSA, and Wikimedia Commons. Every image carries a credit. Every credit is accurate.

## Stack (production)

| Concern | Tool |
|---|---|
| Bundler | Vite |
| 3D rendering | Three.js r128 |
| 2D rendering | Canvas API |
| Data | Static JSON files |
| Fonts | Self-hosted (Google Fonts subset) |
| Deployment | GitHub Pages preview on every push to `main`; production hosting TBD per ADR-014 |
| Gallery | NASA Images API (CORS open, degrades gracefully offline) |

## Contributing

Orrery is an open-source project. Contributions welcome in three areas:

**Data** — add a mission, correct a date, update a status. Edit the JSON. No JavaScript knowledge required. See 03 for schema and credit format.

**Physics** — file a correction if a number is wrong. Every constant has a source in 03. Physics corrections take precedence over everything else.

**Code** — new screens, performance improvements, accessibility, mobile layout. Read 04 for architecture and 05 for design conventions before opening a PR.

## License

MIT — see [LICENSE](LICENSE).

All agency logos, mission imagery, and scientific data used in Orrery remain the property of their respective owners. They are used here for educational identification and attribution only, in a non-commercial context. See 03 for full credit format and licensing details per source.
