---
layout: home
title: Orrery
titleTemplate: Documentation

hero:
  name: 'ORRERY'
  text: 'Mission control for the curious.'
  tagline: 'The orbital mechanics tools NASA uses to reach Mars, rebuilt for anyone who is curious. Real physics, real missions from Sputnik to Artemis II, in 14 languages. Beautiful, educational, self-hostable.'
  image:
    src: /screenshots/hero-explore-3d.png
    alt: 'Orrery — solar system explorer'
  actions:
    - theme: brand
      text: ↗ Launch the app
      link: https://chipi.github.io/orrery/
    - theme: alt
      text: User guide
      link: /guides/user-guide
    - theme: alt
      text: Architecture
      link: /adr/TA

features:
  - icon: 🌌
    title: 12 routes · real physics
    details: 'Solar System Explorer · Mission Configurator · Mission Arc · Mission Catalog · Earth / Moon / Mars surface maps · ISS + Tiangong explorers · Science encyclopedia · Spaceflight Fleet. Keplerian orbits, Lambert porkchops, vis-viva, Tsiolkovsky — the math behind real mission planning, presented so a curious person can understand by doing.'
  - icon: 🛰️
    title: 37 missions · 137 fleet entries
    details: 'Every flown crewed and robotic mission from Luna 9 to Chandrayaan-3, replayable with real flight parameters. Cross-referenced bidirectionally to a curated inventory of every machine used in spaceflight — launchers, capsules, stations, rovers, landers, orbiters, observatories, suits.'
  - icon: 🌍
    title: 14 locales · 100% UI parity
    details: 'English, Español, Français, Deutsch, Português (BR), Italiano, Nederlands, 中文, 日本語, 한국어, हिन्दी, العربية (RTL), Русский, Српски (Cyrillic). Browser locale auto-detected on first visit. No backend, no database, no personal data — a static PWA that works offline after first load.'
  - icon: 🔬
    title: The Science Lens
    details: 'Toggle the lens icon and every 3D scene gets live physics annotations: gravity / velocity / centripetal arrows, sphere-of-influence rings, apsides and true anomaly, engine-off coast preview, conic-section family detection, microgravity axes, atmosphere shells, tidal-lock and ozone indicators. Casual users see clean scenes; curious users opt into the entire physics layer.'
  - icon: 📚
    title: 85 encyclopedia sections
    details: '/science is a 10-tab encyclopedia covering every term, formula, and named law the simulator references — Orbits · Transfers · Propulsion · Mission Phases · Scales & Time · Porkchop · Space Stations · History · Observation · Life in Space. KaTeX-rendered math, 71 hand-coded SVG diagrams, Cmd-K search. Every "?" chip elsewhere in the app deep-links straight to the relevant chapter.'
  - icon: 🛡️
    title: Honest provenance
    details: 'Every image, every outbound link, every paraphrased text fragment has a provenance row with source, license, and last-verified date. Agency-first sourcing prioritises operator-published material; failures are surfaced (Apollo 1, Challenger, Columbia, N1) with the same editorial weight as successes. /credits and /library make the bill of materials public.'
---

<div class="orrery-landing-body">

## The repo

Source: **[github.com/chipi/orrery](https://github.com/chipi/orrery)**

Live build: **[chipi.github.io/orrery](https://chipi.github.io/orrery/)** — every screen, fully offline-capable after first load. First-time visitors land on a 30-second orientation page; returning users skip past in one click via the nav.

## Documentation layout

This is the architecture and design documentation, not the user-facing help. Read order depends on what you are trying to do.

### Start here

- **[User guide](/guides/user-guide)** — read-this-first walk-through of the live app, screen by screen, with screenshots for all 11 primary nav routes plus the read-only provenance pages.
- **[Architecture (TA.md)](/adr/TA)** — single-page architecture map. Every route, subsystem, 3D scene, asset pipeline, contract, and constraint with the ADR that locked it.
- **[Translator guide](/guides/i18n-style-guide)** — binding glossary for translators, per ADR-033.

### Decision history

- **[ADRs](/adr/)** — 58 Architecture Decision Records, the load-bearing decisions of the project. Three of these (ADR-052/053/054) document the Spaceflight Fleet schema retrospectively.
- **[RFCs](/rfc/)** — 17 RFCs, the open architectural questions before they became ADRs. RFC-017 (Surface Hotspots) is currently open and gates v0.7.
- **[PRDs](/prd/)** — 14 Product Requirements Documents, the user-value arguments for every shipped feature.

### Concept package

The founding narrative documents (00–05) — the original "what is Orrery and why" essays from prototyping. Worth reading for context on the design philosophy. Start with `02_Project_Concept.md`.

The six working HTML prototypes (P01–P06) are preserved as ground truth for the original physics and visual decisions.

### Reference

- **Provenance manifests** (`docs/provenance/`) — image, link, and text-source audit logs.
- **Research** (`docs/research/`) — exploratory notes that haven't graduated to decisions yet.
- **[Tech BOM](/TECH-BOM)** — license audit of every npm dependency.

## The Science Lens

The lens (top-nav icon) is what turns the simulator into a textbook.

When off, every 3D scene reads clean — Sun, planets, ships, trajectories. When on, the scene gains:

| Layer | What it shows |
|---|---|
| **Sphere of influence** | translucent rings showing where each body's gravity dominates |
| **Gravity / velocity / centripetal arrows** | log-scaled so all are visible at once, with values printed at the tip |
| **Apsides** | perihelion / aphelion markers + a live `ν = 42°` true-anomaly callout |
| **Engine-off coast** | dotted projection of where the ship would drift if engines cut now |
| **Conic-section family** | names the current arc (circle / ellipse / parabola / hyperbola) live from specific orbital energy |
| **Microgravity axes** | zenith / nadir, prograde / retrograde, port / starboard on station scenes |
| **Atmosphere / tidal-lock / ozone** | atmospheric shells, tidal-lock hemisphere, ozone-hole zones |

The **Flight Director banner** on `/fly` narrates 5 physics phases (Departure · TLI · Cruise · Approach · Arrival), each phase deep-linking to the corresponding `/science` chapter. Eight lens layers wire into both `/fly` scenes — heliocentric for interplanetary, cislunar for Moon missions — so the same physics overlay reads correctly whether you're watching Curiosity coast to Mars or Apollo 17 swing around the far side of the Moon.

## How it's built

**Stack:** SvelteKit + Three.js r128 + TypeScript (strict) + Vite. No backend, no database. Pure static SPA. PWA-installable, offline-capable after first paint. Hosted free on GitHub Pages.

**Data:** All static JSON under `static/data/`. 33 ajv schemas validate every file fail-closed at build time. Locale overlays for 14 languages. Pre-computed Lambert porkchop grids for 9 destinations.

**Testing:** ~1 000 unit tests (94.5 % statement coverage, 79.7 % branch, 89.2 % function, 96.3 % line — gated in CI). 57 Playwright e2e specs across desktop + mobile-chromium projects. Nightly e2e + weekly asset rebuild keep external drift in check.

**Honesty:** Every image, every outbound LEARN link, every paraphrased text fragment carries a provenance row. Agency-first sourcing per ADR-046; no artist's impressions of flown vehicles; per-language native-source priority per ADR-051; symmetric-link validator catches bidirectional fleet-reference drift fail-closed per ADR-052.

For the full architecture map, decisions, and contracts, see **[TA.md](/adr/TA)**.

</div>
