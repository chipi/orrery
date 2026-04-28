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
| **Mission Configurator** | Real Lambert solver, 11,200-cell porkchop plot, launch window selection |
| **Mission Arc** | Fly your mission — live telemetry, transfer arc, fuel model, timeline scrubber |
| **Mission Library** | 28 historical missions (Mars + Moon) — every agency, every outcome, replayable |
| **Earth Orbit** | ISS to JWST on a logarithmic scale — the infrastructure that makes space possible |

## Try it

Open any prototype directly in a browser — no server required:

```
docs/prototypes/P01_solar-system-explorer.html
docs/prototypes/P02_mission-configurator.html
docs/prototypes/P03_mission-arc.html
docs/prototypes/P04_mission-library.html
docs/prototypes/P05_earth-orbit.html
docs/prototypes/P06_moon-map.html
```

An internet connection is required for full fidelity (Three.js CDN, Google Fonts, NASA Images API). The production build described in 04 self-hosts all dependencies for offline use.

## Documentation

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

**If you want to build:** read 04. The production stack is Vite + vanilla JS + Three.js r128, deployable as a single nginx container.

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
| Deployment | Docker Compose + nginx |
| Gallery | NASA Images API (CORS open, degrades gracefully offline) |

## Contributing

Orrery is an open-source project. Contributions welcome in three areas:

**Data** — add a mission, correct a date, update a status. Edit the JSON. No JavaScript knowledge required. See 03 for schema and credit format.

**Physics** — file a correction if a number is wrong. Every constant has a source in 03. Physics corrections take precedence over everything else.

**Code** — new screens, performance improvements, accessibility, mobile layout. Read 04 for architecture and 05 for design conventions before opening a PR.

## License

MIT — see [LICENSE](LICENSE).

All agency logos, mission imagery, and scientific data used in Orrery remain the property of their respective owners. They are used here for educational identification and attribution only, in a non-commercial context. See 03 for full credit format and licensing details per source.
