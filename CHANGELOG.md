# Changelog

All notable changes to Orrery will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches `1.0.0`. Pre-1.0 minor versions may include breaking changes.

For deep-dive engineering rationale, see [`IMPLEMENTATION.md`](IMPLEMENTATION.md). For locked architectural decisions, see [`docs/adr/`](docs/adr/).

## [Unreleased]

### Added
- **Dutch (`nl`) locale** — 14th supported language (issue #72). Full UI bundle (711 keys) at 100% parity with the other 13 locales. Native name **Nederlands**, short tag **NL**, flag 🇳🇱. LocalePicker entry added between Italiano and Српски. Translations follow the ESA-NL physics/astronomy glossary; mission and agency proper nouns kept in original (Curiosity, Apollo, NASA, ESA, JAXA, ISRO, CNSA).
- **`/science` overlay gap closed for es/de/fr/it** — 14 files (history/_intro + 6 history sections + space-stations/_intro + 4 space-stations sections + mission-phases/eva + scales-time/long-duration) translated for the four EU locales that already had partial coverage. Brings es/de/fr/it from 49 → 63 `/science` files each, matching en-US.
- **`iss-visitors/` overlays for all 13 non-en-US locales** — closes the en-US-only gap for cargo_dragon, crew_dragon, cygnus, htv_x, progress_ms, soyuz_ms, starliner. 7 files × 13 locales = 91 new files.
- **Dutch entity overlay tree** — full coverage across missions (mars + moon + outer-system catalogue), planets, sun, rockets, earth-objects, moon-sites, mars-sites, iss-modules, iss-visitors, tiangong-modules, tiangong-visitors, scenarios. Total 161 files — parity with the other 8 fall-back-tier locales (ja, ko, hi, ar, ru, zh-CN, pt-BR, sr-Cyrl). Per ADR-017, Dutch joins those locales in falling back to en-US for the `/science` encyclopedia tree (full coverage stays at en-US/es/de/fr/it).
- **`tests/e2e/i18n-nl.spec.ts`** — locale chip + nav-persistence smoke test mirroring the other per-locale specs.

## [0.5.0] — 2026-05-09

The encyclopedia + explorers release. Three new primary nav routes (`/iss`, `/tiangong`, `/science`), a layered Science Lens of live physics annotations across every 3D scene, and end-to-end outbound-link provenance discipline.

### Added — `/science` encyclopedia (PRD-008 / RFC-011)

- **54 sections across 8 tabs**: Orbits · Transfers · Propulsion · Mission Phases · Scales & Time · Porkchop · Space Stations · History (plus a Space-101 editorial landing page).
- **62 hand-coded SVG diagrams** (54 per-section + 8 tab covers, engineering blueprint style — white-on-black with teal accents) per [ADR-035](docs/adr/ADR-035.md). Fail-closed integrity check chained into `validate-data`.
- **KaTeX server-rendered formulas** per [ADR-034](docs/adr/ADR-034.md) — client receives static HTML, no JS math library.
- **Right-rail navigation**, **Cmd-K search overlay**, narrative_101 lead-ins on every section.
- **Cross-screen `?`-chips** deep-link from every other screen straight to the relevant chapter.

### Added — `/science` integration with the rest of the app

- **`SCIENCE` tab** on every detail panel (MissionPanel, PlanetPanel, SunPanel, SmallBodyPanel, EarthObjectPanel, MoonSitePanel, MarsSitePanel, StationModulePanel).
- **Science Lens toggle** — nav button gates a layer of in-scene physics annotations across every 3D scene. Attribute-on-`<html>` state pattern (mirrors [ADR-029](docs/adr/ADR-029.md) high-contrast toggle).
- **Flight Director banner** on `/fly` — 5-phase narration (Departure · Trans-X Injection · Cruise · Approach · Arrival), each phase deep-linking to the matching `/science` section.
- **Why? popovers** explain individual numeric labels in context across every panel — click-only inline popovers that explain a value (distinct from the `?` chips that navigate to `/science`).
- **Mission Sandbox** layered onto `/plan` porkchop — pin one cell, click another → ΔDEP / ΔTOF / Δ∆v compare panel. Pin clears on destination change.
- **Conic-section side panel** on `/fly` (lens-gated) — classifies the current arc shape (circle / ellipse / parabola / hyperbola) live from specific orbital energy.

### Added — Science Layers (lens-gated)

Twelve sub-toggleable layers behind the lens. Each can be turned on/off independently from the `Science Layers` panel that appears when the lens is on:

- **Spheres of influence** — translucent rings showing where each body's gravity dominates.
- **Hover info cards** — live numbers (heliocentric speed, distance, gravity, light-time) on any planet.
- **Gravity vectors · Velocity vectors · Centripetal arrows** — log-scaled arrows with values printed at the tip so magnitudes can be compared across planets.
- **Apsides + true anomaly** — perihelion / aphelion markers + a live `ν = 42°` callout that travels with the body.
- **Engine-off coast preview** — dotted projection of where the spacecraft would drift if the engine cut right now.
- **Conic-section family panel** — see above.
- **Microgravity axes** — zenith/nadir, prograde/retrograde, port/starboard on `/iss` + `/tiangong`.
- **Atmosphere shells** on `/earth` (Kármán line, 100 km) and `/mars` (~120 km).
- **Tidal-lock indicator** on `/moon` — marks the always-Earth-facing hemisphere.
- **Ozone holes** on `/earth` — polar ozone-depletion zones (Antarctic + Arctic).

### Added — ISS Explorer (`/iss`) — PRD-010 / RFC-013

- **18 modules** (every USOS + ROS module + visitors) with per-module 3D pickability (raycast-driven panel open) plus hover outlines and emissive selection pulse.
- Full module panel: **OVERVIEW · GALLERY · TECHNICAL · ANATOMY · SCIENCE · LEARN** tabs.
- Per-module agency badges in the drawer (NASA · ESA · JAXA · Roscosmos · CSA).
- Sun-tracking solar-array animation.
- Microgravity axes lens-gated overlay.
- Orbit-regime banner with WhyPopovers on altitude / inclination / period.
- Hand-drawn ANATOMY diagrams for 9 visiting spacecraft (Crew Dragon, Cargo Dragon, Cygnus, Soyuz MS, Progress MS, HTV-X, Starliner, Shenzhou, Tianzhou).

### Added — Tiangong Explorer (`/tiangong`) — PRD-011 / RFC-014

- Tianhe core + Wentian + Mengtian lab modules with sun-tracking gallium-arsenide arrays.
- Three docked-vehicle slots (Shenzhou, Tianzhou, plus visiting spot).
- 2D blueprint views (top + side projections).
- Same module-pickability + microgravity-frame overlays as `/iss`.
- ADR-048/049/050 lock the asset pipeline, module pickability rules, and low-end fallback contract.

### Added — LEARN-link stewardship — ADR-051

- **Per-link provenance manifest** (`static/data/link-provenance.json`) — every external LEARN link is sourced + AJV-validated.
- **`LinkCredit.svelte` + `LearnLink.svelte`** components render attribution under outbound links.
- **Agency-portal native-language priority** for non-US entities (Roscosmos before NASA mirror, ISRO before press releases).
- **Public `/library` page** — bill-of-links across the entire app. (Mission Library renamed to Mission Catalog to free the word.)
- **`scripts/check-learn-links.ts`** chained into `npm run fetch` with freshness gating.

### Added — Test infrastructure (e2e hardening)

- **Replaced 8× `waitForTimeout(<magic>)`** with deterministic readiness signals across earth / mars / moon / fly tests: `data-objects-count` / `data-sites-count` / `data-view` / `data-sim-day` / `data-sc-phase` attributes.
- **Canvas-click tests** on `/iss` + `/tiangong` use `window.__pickAt()` test hook + `canvas.click({position})` (bypasses overlays). Replaces a flaky spiral-search pattern that raced GH-Actions software-rasterizer WebGL.
- **`/iss` + `/tiangong` perf-fallback** (FPS<20 → list mode) skipped under `navigator.webdriver` so canvas-click tests don't have the canvas yanked out from under them in CI.
- **e2e job duration** dropped from 25-min timeout to 16-min clean pass.

### Changed

- **`/missions`** rebrand: "Mission Library" → **Mission Catalog** under [ADR-051](docs/adr/ADR-051.md) to free the word _Library_ for the outbound-link inventory at `/library`.
- **`/missions` filter strip + timeline** collapsed by default; auto-expands when the URL carries any filter param so deep links show their state.
- **PlanetPanel LEARN tab** folded into SCIENCE — one tab destination, less duplication.
- **LocalePicker** displays national flag emoji next to native-name + short tag.
- **Banners** (Science Lens, Flight Director, Station Orbit) now collapsible — eyebrow always visible, body folds away on click.
- **/iss + /tiangong drawer** scrolls cleanly on tall lists — explicit `height: auto` override.

### Removed

- **sr-Latn locale** — Serbian Latin dropped; sr-Cyrl is the canonical Serbian. `messages/sr-Latn.json` and `tests/e2e/i18n-sr-Latn.spec.ts` removed.

## [0.4.0] — 2026-05-09

The internationalisation + maps + provenance release. 12 supported locales now at 100% UI parity, full Mars Surface Map, and end-to-end image provenance discipline.

### Added — Languages (Waves 1–3)

UI message bundle (684 keys) translated key-for-key across **all 12 non-en-US locales**, bringing every supported locale to 100% UI parity:

- **Wave 1 continuation** (#36): French · German · Portuguese-BR · Italian.
- **Wave 2 CJK** (#37): Mandarin (zh-CN) · Japanese · Korean.
- **Wave 3** (#38): Hindi · Arabic (RTL) · Russian.

The `/science` encyclopedia overlay tree (542 strings of editorial body text) is shipped for **en-US, es, fr, de, it**. The remaining 8 locales fall back to en-US for that surface per [ADR-017](docs/adr/ADR-017.md).

LocalePicker shows national flags next to native-name + short tag.

### Added — Mars Surface Map (`/mars`) — PRD-009 / RFC-012

- Equirectangular 2D Mars map + 3D globe.
- 16 surface sites (rovers, landers, sample-return) + 11 orbital probes.
- Rover traverse paths overlaid as cross-linked routes (Curiosity, Perseverance, Opportunity, Spirit).
- Per-site GALLERY · TECHNICAL · LEARN tabs.
- Layer chips toggle surface vs orbital separately.
- Atmosphere shell layer (~120 km) lens-gated.

### Added — Image credit rollout — ADR-046 / ADR-047

End-to-end provenance discipline for every pixel in the app:

- **Agency-first build-time imagery sourcing** (NASA = fallback library, not the default).
- **Per-image provenance manifest** (auto-generated by `scripts/build-image-provenance.ts`).
- **Public `/credits` page** with all imagery + text + logo attributions.
- **License allowlist + waivers system**, fail-closed in `validate-data`.
- **Lightbox attribution** on every gallery thumbnail.
- **Honest mixed-source footers** per gallery surface.
- **Non-NASA agency imagery enriched** via partnership-credit queries.

### Added — Other

- **/missions UX cleanup**: filter strip + timeline navigator collapsed by default for a clean grid; auto-expand when filter URL params present.
- **Per-mission flight params** + caveat banners (RECONSTRUCTED / SPARSE / UNKNOWN).
- **Outer-system catalogue**: 4 outer missions (Galileo · Voyager 2 · New Horizons · Dawn) bringing the catalog to 36.
- **v0.1.10 audit drift fixes** carried over (#30).
- **14 new ADRs** (034–047) covering KaTeX, diagram authoring, agency-first imagery, lens-state attribute pattern, station geometry, image provenance.

### Changed

- **`validate-data`** now fails closed on unknown licenses, missing image provenance, broken science overlay schemas.
- **`npm run preflight`** mirrors CI step-for-step locally; pre-push hook self-installs.

## [0.3.0] — 2026-05-04

### Added
- **Spanish locale** — first non-English locale shipped end-to-end. 277 UI strings + 77 editorial overlays (32 missions + 8 planets + 6 rockets + 1 sun + 1 scenario + 13 earth-objects + 16 moon-sites). Mission and agency proper nouns kept in original (Curiosity, Tianwen-1, Apollo, etc.).
- **Locale picker** in the navigation bar (`<LocalePicker>` in `src/lib/components/`) — 44×44 px touch target, native-name labels, URL `?lang=` is the only state. No `localStorage` per CLAUDE.md / RFC-010 maintainer-decisions.
- **Layout-stage locale apply** — `setLanguageTag()` in `$effect.pre` so Paraglide picks up the URL locale BEFORE descendant components render their `m.foo()` calls (no en-US fallback flash on `?lang=es` first paint).
- **`Intl.NumberFormat` helpers** in `src/lib/format.ts` — `formatKm`, `formatKmPerSec`, `formatLightMinutes`, `formatDeltaV`, etc. en-US `1,234.5` vs es `1.234,5`.
- **Four new missions:**
  - **Artemis II** (NASA, FLOWN April 2026 — the project's inspiration)
  - **Inspiration Mars** (Tito 2013 free-return concept)
  - **Starship Mars Crew** (SpaceX crewed Mars round-trip concept)
  - **Blue Moon MK1** (Blue Origin cargo lunar lander)
- **`transferEllipse(p1, p2, steps)`** — true two-point Keplerian arc with Sun at one focus. Both endpoints pin to live planet positions. Replaces the old `outboundArc + post-hoc rotation` that could only pin one endpoint.
- **Heliocentric Apollo / cislunar reframe** — Moon-mode in `/fly` now shows the Sun + Earth orbit + Earth/Moon system at the live heliocentric position; Moon orbits Earth at the exaggerated `MOON_FLY_RADIUS_AU = 0.15`. Camera follows live Earth, zoomed tight (50u). Sim-speed pills swap to `[0.1, 0.5, 1, 3]×` with 1× default.
- **Small bodies clickable in 3D** — 5 dwarfs + 2 comets + 1 interstellar object in `/explore` now have invisible pickAid spheres for click ergonomics. Hover tooltip parity with planets.
- **Gallery floor of 3 photos** for every body — Wikimedia Commons API used to source verified filenames; bumps gaia / tiangong / beidou / galileo / glonass / gps / change3 / luna9 from 0–2 to 3 photos each.
- **`ADR-031`** — i18n language list and rollout waves.
- **`ADR-032`** — Font and script strategy (Wave 1; CJK + RTL deferred).
- **`ADR-033`** — Translation workflow: LLM-only first-pass.
- **`docs/i18n-style-guide.md`** — translator brief with per-language glossary tables.
- **`docs/user-guide.md`** — read-this-first walk-through of the live app, screen by screen, with screenshots.
- **README badges + hero screenshot + 6-screen image grid.**

### Changed
- `/fly` TubeGeometry now uses a custom `PolylineCurve3` instead of `CatmullRomCurve3` so the past-tube `drawRange` progresses in lock-step with the spacecraft sprite. Previously the centripetal parameterisation drifted relative to the `lerpPoint`-based sprite position.
- Round-trip mission timeline: `arr_day = dep + 2 * transit_days` for crewed / sample-return so scrub maps cleanly across the full mission (was squished into one transit).
- 3D `/fly` torus markers thinner (tube radius 0.7 → 0.25) so they no longer dwarf planet meshes.
- 3D `/fly` arrival sprite labelled `ARRIVAL` (matches 2D); the destination identity is conveyed by colour + date stamp.
- `RFC-010` (Translation Strategy) status: Open → Closed by ADR-031 + 032 + 033.

### Fixed
- Svelte 5 `$effect` dep-tracking bug in `/fly`: refs not yet defined on first run prevented `outPts`/`retPts` from being registered as deps; the marker + arc-rebuild effects silently skipped subsequent mission swaps. Fixed by reading state into locals before the early-return.
- Stale leftover return-arc geometry from previous mission persisting after one-way mission load (the "1.5-circle" / "1/3 of tube" bug).
- Mars rendezvous: spacecraft now visibly meets live Mars at arrival (was arriving at empty space because the Hohmann arc terminated at a generic 180° point on the destination's orbit).
- Tiangong + GPS + GLONASS + BeiDou + Galileo + Gaia + Chang'e 3 + Luna 9 had 0–1 gallery photos; all now ≥3.
- Doc-system gating: PRD-007 + RFC-010 missing the "Why this is a PRD/RFC" sentence.
- Concurrency on CI + e2e workflows so the README badge tracks the latest commit's status (was showing "cancelled" when fast-consecutive pushes pre-empted prior runs).
- Branch protection on `main` — 1 required PR review + CI/E2E status checks (admin bypass enabled).

### Tests
- 560/560 unit tests pass (was 251 pre-v0.3 — major expansion: locale + format + i18n harness, gallery harness, transferEllipse, polyline curve).
- 193 e2e tests pass (was 88 pre-v0.3 — added `tests/e2e/i18n-es.spec.ts` per-screen Spanish smoke).
- 198 JSON files schema-valid.
- Doc-system gating + flight-data tcm-count consistency: clean.

## [0.2.0] — 2026-05-02

### Added
- `src/lib/fly-physics.ts` + `fly-physics-constants.ts` — pure-function isolation for all numeric formulas previously inline in `/fly`. Testable independently of Three.js + Canvas2D.
- `src/lib/fly-physics-validation.test.ts` — per-mission peak-heliocentric-speed validation against ground truth from mission flight reports. 10 missions covered (9 measured + 1 sparse) with mission-specific tolerance bands.
- ADR-030 documents the pure-function boundary + tolerance philosophy.
- 37 new unit tests; 251 total.

## [0.1.13] — 2026-05-02

### Added
- `mergeFlightEvents()` in `src/lib/mission-event-merge.ts` — fuses editorial overlay events with `mission.flight.events[]`. Sparse-data missions (Mars 3, Luna 9/17/24, Apollo 17) now show their TCMs + EDL + anomalies in the `/fly` CAPCOM ticker even when their editorial overlay is bare.
- NEXT EVENT row in `/fly` FLIGHT PARAMS HUD.
- Flight-data-quality badge on `/missions` cards (MEASURED / SPARSE / RECONSTRUCTED / UNKNOWN).

## [0.1.12] — 2026-05-02

### Added
- PWA service worker via `@vite-pwa/sveltekit` (ADR-029). Offline-capable after first load.
- High-contrast toggle in nav (`Aa` button) — flips `data-high-contrast` attribute; tokens.css handles palette switch.
- Update toast when a new build is available.

### Removed
- Native browser install nag suppressed (intentional per CLAUDE.md "no surprises"). Users who want to install can still do so via the browser menu.

## [0.1.11] — 2026-05-02

### Added
- Hover thumbnails on `/missions` cards.
- Earth year scrubber on `/earth` — see what was in orbit in any year.

## [0.1.10] — 2026-05-02

### Added
- GALLERY + LEARN tabs for PlanetPanel + SunPanel + `/earth` + `/moon`. New shared CSS extracted to `src/lib/styles/panel-tabs.css` (−723 LOC net).
- `getPlanetGallery / getSunGallery / getEarthObjectGallery / getMoonSiteGallery` in data.ts.

### Fixed
- ~250 LOC of CSS duplicated across 5 surfaces (extracted to shared file).
- Hardcoded `"Close gallery preview"` aria-label in 5 places (i18n keys added).
- Brittle `toHaveCount(5)` e2e assertion.

## [0.1.9] — 2026-04-30

### Added
- Mission flight params (ADR-027 / RFC-009 closure): C3, V∞, periapsis, inclination, total ∆v ledger surfaced on `/missions` FLIGHT tab + `/fly` HUD.
- `flight_data_quality` honesty flag in mission JSON: `measured / reconstructed / sparse / unknown`. Caveat banners surface the level.
- Timeline navigator on `/missions` (1957 → 2030) above the card grid.

## [0.1.6] — 2026-04-29

### Added
- Multi-destination porkchop (ADR-026 / RFC-007 closure): Earth → Mercury / Venus / Mars / Jupiter / Saturn with LANDING / FLYBY toggle. 11,200 cells per destination.
- Pre-computed porkchop grids ship statically per ADR-026; Lambert worker only fires for live recalculation.

## [0.1.0] — 2026-04-28

Initial public release. Six screens, 28 missions, 8 planets, 11 rockets, en-US only. Built on SvelteKit + TypeScript-strict + Three.js r128 + Vite, deployed to GitHub Pages.

See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the full slice-by-slice breakdown of how v0.1.0 was built.

[0.3.0]: https://github.com/chipi/orrery/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/chipi/orrery/compare/v0.1.13...v0.2.0
[0.1.13]: https://github.com/chipi/orrery/compare/v0.1.12...v0.1.13
[0.1.12]: https://github.com/chipi/orrery/compare/v0.1.11...v0.1.12
[0.1.11]: https://github.com/chipi/orrery/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/chipi/orrery/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/chipi/orrery/compare/v0.1.6...v0.1.9
[0.1.6]: https://github.com/chipi/orrery/compare/v0.1.0...v0.1.6
[0.1.0]: https://github.com/chipi/orrery/releases/tag/v0.1.0
