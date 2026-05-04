# Changelog

All notable changes to Orrery will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches `1.0.0`. Pre-1.0 minor versions may include breaking changes.

For deep-dive engineering rationale, see [`IMPLEMENTATION.md`](IMPLEMENTATION.md). For locked architectural decisions, see [`docs/adr/`](docs/adr/).

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
