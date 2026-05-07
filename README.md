# Orrery

The orbital mechanics tools NASA uses to reach Mars, rebuilt for anyone who's curious. Real physics, real missions from Luna 9 to Artemis II. Beautiful, educational, self-hostable.

[![CI](https://github.com/chipi/orrery/actions/workflows/ci.yml/badge.svg)](https://github.com/chipi/orrery/actions/workflows/ci.yml)
[![E2E](https://github.com/chipi/orrery/actions/workflows/e2e.yml/badge.svg)](https://github.com/chipi/orrery/actions/workflows/e2e.yml)
[![Live Preview](https://img.shields.io/badge/live-chipi.github.io%2Forrery-4ecdc4?style=flat)](https://chipi.github.io/orrery/)
[![Latest tag](https://img.shields.io/github/v/tag/chipi/orrery?label=release&color=4ecdc4)](https://github.com/chipi/orrery/tags)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8)](docs/adr/ADR-029.md)
[![No tracking](https://img.shields.io/badge/tracking-none-success)](#privacy)
[![i18n](https://img.shields.io/badge/i18n-en--US%20%7C%20es-blue)](docs/i18n-style-guide.md)

![Orrery — solar system explorer](docs/screenshots/hero-explore-3d.png)

## What it is

A browser-based solar system explorer and Mars / lunar mission simulator. It uses the same orbital mechanics behind real mission planning — Keplerian orbits, Lambert solvers, porkchop plots — and presents them in a way that a curious person can understand by doing.

The name comes from a mechanical model of the solar system. That is exactly what Orrery does, at the scale of a screen.

**No backend. No database. No tracking.** A static SPA you can self-host, install as a PWA, and use offline after first load.

## Live

**<https://chipi.github.io/orrery/>** — every screen, fully offline-capable after first load. Available in **English** and **Spanish** (more locales planned per [ADR-031](docs/adr/ADR-031.md)).

## Six screens

| Screen | What it shows |
|---|---|
| **Solar System Explorer** (`/explore`) | Real-time 3D / 2D orrery — 8 planets + 5 dwarf planets + 2 comets + ʻOumuamua, with togglable visibility layers and clickable bodies. Detail panels: OVERVIEW · GALLERY · TECHNICAL · REFERENCES · LEARN |
| **Mission Configurator** (`/plan`) | 11,200-cell Lambert porkchop plot per destination — Earth → Mercury / Venus / Mars / Jupiter / Saturn with LANDING / FLYBY toggle. 13 rockets to choose from, real ∆v budget |
| **Mission Arc** (`/fly`) | Fly a mission — live telemetry, transfer arc as a true Keplerian two-point ellipse with Sun at focus, fuel model, timeline scrubber. CAPCOM panel with mission events |
| **Mission Library** (`/missions`) | **32** historical and planned missions across Mars + Moon — every agency, every outcome, replayable. Timeline navigator (1957 → 2030) above the card grid scrubs the year window |
| **Earth Orbit** (`/earth`) | ISS, Tiangong, Hubble, JWST, Gaia, Chandra, XMM, LRO + the four GNSS constellations on a logarithmic scale. Real inclinations, real altitudes |
| **Moon Map** (`/moon`) | 16 landing sites across 5 nations — Apollo through Chandrayaan-3, the capability ladder that made Mars possible |

| Explorer | Configurator | Mission Arc |
|---|---|---|
| ![](docs/screenshots/01-explore.png) | ![](docs/screenshots/02-plan.png) | ![](docs/screenshots/03-fly-curiosity.png) |
| **Library** | **Earth Orbit** | **Moon Map** |
| ![](docs/screenshots/04-missions.png) | ![](docs/screenshots/05-earth.png) | ![](docs/screenshots/06-moon.png) |

## Try a mission

The 36 missions in the library include flown classics, outer-system landmarks, recent flights, and a handful of concept missions:

| Pick | Why |
|---|---|
| `?mission=apollo11` | First crewed lunar landing — see the free-return trajectory in heliocentric frame |
| `?mission=artemis2` | The 2026 lunar flyby that inspired this project |
| `?mission=curiosity` | One-way Mars landing — watch the live Mars dot meet the spacecraft at arrival |
| `?mission=mariner4` | First Mars flyby (1964) — short transit, real launch window |
| `?mission=inspiration-mars` | Tito's 2013 free-return Mars flyby concept (501 days) |
| `?mission=starship-mars-crew` | SpaceX's long-term crewed Mars round-trip architecture |
| `?mission=tianwen1` | China's first Mars mission |

## Why it matters

Orrery makes a few claims a screen reader can verify:

- **Real physics.** Keplerian two-body orbital mechanics. Lagrange-Gauss short-way Lambert solver. Vis-viva for heliocentric velocity. Tsiolkovsky for fuel. All constants from IAU + JPL + agency mission reports — every number cited.
- **Real missions.** 36 base mission JSON files with 36 en-US editorial overlays + 36 es overlays. ∆v ledgers from NASA mission reports, JPL trajectory reconstructions, agency press kits. Every entry has a `data_quality` honesty flag.
- **Real images.** NASA Images API + curated Wikimedia Commons. Every body has at least 3 photos. Every credit is accurate.
- **Real translation.** Spanish content uses the convention from each language's space-agency glossaries (ESA Spanish, NASA-JPL Spanish), not literal machine translation. See [`docs/i18n-style-guide.md`](docs/i18n-style-guide.md).

## Privacy

No analytics. No tracking. No third-party fonts at runtime (every asset resolved at build time per [ADR-016](docs/adr/ADR-016.md)). No cookies. No `localStorage`. Locale preference lives in the URL — bookmark `?lang=es` and you have your locale; share it and they have theirs.

## Getting started

Requirements: Node 20+, npm 10+.

```bash
git clone https://github.com/chipi/orrery
cd orrery
npm install
```

### Development

```bash
npm run dev              # dev server at http://localhost:5273
npm run test             # Vitest unit tests (560 tests)
npm run test:e2e         # Playwright e2e (build runs first)
npm run check            # svelte-check + i18n compile
npm run lint             # prettier + eslint
npm run validate-data    # ajv schema + doc-system gating + flight-data consistency
npm run ci               # everything above except e2e — what GitHub Actions runs on every PR
```

### Build

```bash
npm run build            # production SPA in ./build (adapter-static)
npm run preview          # serve ./build at http://localhost:5273
npm run docs:build       # VitePress docs site at docs/.vitepress/dist
```

### Deploy

Push to `main` — `.github/workflows/preview.yml` builds the app + docs and publishes to GitHub Pages. A weekly cron rebuild keeps mission imagery fresh (Mondays 06:00 UTC).

## Documentation

The full architecture and concept documentation is published at **<https://chipi.github.io/orrery/docs/>** — VitePress with local search and sidebar navigation.

| Document | Read it for |
|---|---|
| [User guide](docs/user-guide.md) | How each screen works — the read-this-first guide for the live app |
| [00 Introduction](docs/concept/00_Introduction.md) | What this package is and how to read it |
| [01 Vision](docs/concept/01_Orrery_Vision.md) | Why Orrery exists — the Moon-to-Mars narrative |
| [02 Project Concept](docs/concept/02_Project_Concept.md) | Full synthesis — what Orrery is, does, and means |
| [03 Data Catalog](docs/concept/03_Data_Catalog.md) | Every source, constant, mission schema, credit format |
| [04 Technical Architecture](docs/concept/04_Technical_Architecture.md) | Stack, repo structure, JSON data layer |
| [05 Design System](docs/concept/05_Design_System.md) | Colour, typography, components, screen patterns |
| [i18n style guide](docs/i18n-style-guide.md) | Per-language glossary for translators |
| [`docs/adr/`](docs/adr/) | 33 ADRs (ADR-001–033) plus TA — locked decisions (Status / Decision / Rationale / Consequences) |
| [`docs/rfc/`](docs/rfc/) | RFC-001–013 — technical questions; three still open (see [`docs/rfc/index.md`](docs/rfc/index.md)) |
| [`docs/prd/`](docs/prd/) | Product requirements per screen |
| [`docs/uxs/`](docs/uxs/) | UX specifications per screen |
| [`CLAUDE.md`](CLAUDE.md) | Engineering constraints + locked decisions for AI / human contributors |

**If you read one document:** read [02 Project Concept](docs/concept/02_Project_Concept.md). It is the complete synthesis.

**If you want to add a mission:** read [03 Data Catalog](docs/concept/03_Data_Catalog.md). Mission data is plain JSON.

**If you want to translate Orrery:** read [the i18n style guide](docs/i18n-style-guide.md) and follow the Spanish entry in `static/data/i18n/es/` as a template.

## Physics

- Keplerian orbital mechanics, J2000 epoch (correct enough to teach, fast enough for a browser)
- Lambert solver: Lagrange-Gauss short-way formulation, 52 iterations, 11,200 cells
- Two-point Keplerian transfer ellipse with Sun at focus (`transferEllipse`) — both endpoints pin to live planet positions
- Vis-viva for heliocentric velocity telemetry
- Tsiolkovsky rocket equation for payload / fuel calculations
- Logarithmic radial scale for Earth orbit: `EARTH_VIS_R + LOG_K × log₁₀(1 + alt_km / 100)`

All constants documented in [03 Data Catalog](docs/concept/03_Data_Catalog.md) with IAU sources.

## Data

Mission data lives in plain JSON files — one per mission — served statically. No database, no backend. Adding a mission is editing a JSON file. Adding a language is adding a folder under `static/data/i18n/<code>/`.

Image sourcing: NASA Images API (live), ESA CC BY-SA IGO archive, ISRO, CNSA, JAXA, and Wikimedia Commons. Every image carries a credit. Every credit is accurate.

## Stack (production)

| Concern | Tool | ADR |
|---|---|---|
| Framework | SvelteKit (adapter-static) | [ADR-012](docs/adr/ADR-012.md) |
| Language | TypeScript, `strict: true` | [ADR-011](docs/adr/ADR-011.md) |
| Bundler | Vite | [ADR-012](docs/adr/ADR-012.md) |
| 3D rendering | Three.js r128, local bundle | [ADR-001](docs/adr/ADR-001.md) |
| 2D rendering | Canvas API |  |
| Mission data | Static JSON files | [ADR-006](docs/adr/ADR-006.md) |
| Schema validation | ajv | [ADR-019](docs/adr/ADR-019.md) |
| i18n | Paraglide-js + locale-overlay JSON | [ADR-017](docs/adr/ADR-017.md) |
| Lambert solver | Web Worker | [ADR-008](docs/adr/ADR-008.md) |
| External assets | Resolved at build time | [ADR-016](docs/adr/ADR-016.md) |
| Tests | Vitest unit + Playwright e2e | [ADR-015](docs/adr/ADR-015.md) |
| Deployment | GitHub Actions + Pages | [ADR-014](docs/adr/ADR-014.md) |

## Contributing

Orrery is open source. Contributions welcome in three areas:

**Data** — add a mission, correct a date, update a status. Edit the JSON; no JavaScript required. See [03 Data Catalog](docs/concept/03_Data_Catalog.md).

**Translation** — add a locale by adding `messages/<code>.json` plus `static/data/i18n/<code>/`. The [i18n style guide](docs/i18n-style-guide.md) is the binding glossary.

**Physics + code** — file a correction if a number is wrong (every constant has a source in 03). New screens, performance improvements, accessibility, mobile layout. Read [04 Technical Architecture](docs/concept/04_Technical_Architecture.md) and [`CLAUDE.md`](CLAUDE.md) before opening a PR.

## License

MIT — see [LICENSE](LICENSE).

All agency logos, mission imagery, and scientific data used in Orrery remain the property of their respective owners. They are used here for educational identification and attribution only, in a non-commercial context. See [03 Data Catalog](docs/concept/03_Data_Catalog.md) for full credit format and licensing details per source.
