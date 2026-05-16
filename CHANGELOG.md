# Changelog

All notable changes to Orrery will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches `1.0.0`. Pre-1.0 minor versions may include breaking changes.

For deep-dive engineering rationale, see [`IMPLEMENTATION.md`](IMPLEMENTATION.md). For locked architectural decisions, see [`docs/adr/`](docs/adr/).

## [Unreleased]

## [0.6.2] — 2026-05-16

Reliability + release-tooling pass on top of v0.6.1. Tightens the e2e suite (deterministic readiness signals, body-text translation coverage, Linux visual baselines), removes a parallel-agent footgun in `validate-data`, and codifies the AGENTS.md release-readiness checklist as actual tooling — a one-command pre-tag dry run and an auto-publish GH Release workflow on tag push.

### Added

- **`npm run release:rehearsal vX.Y.Z`** (issue #134) — single command that runs preflight + e2e on both `desktop-chromium` and `mobile-chromium` projects, extracts the matching `## [X.Y.Z]` block from `CHANGELOG.md`, and creates a DRAFT GH Release. Fail-closed on any step. Codifies the AGENTS.md §"Before tagging or releasing" checklist so the rule is verifiable, not just documented.
- **`.github/workflows/release.yml` — auto-publish GH Release on tag push** (issue #135). Fires on any `v*` tag push. Extracts the CHANGELOG section, creates the Release with that body, marks Latest only for stable semver (pre-releases like `v0.6.2-rc1` don't bump the homepage marker). Idempotent — re-runs on a re-tagged commit update the existing Release. Eliminates the "tagged but no Release" failure mode that hit v0.6.0 + v0.6.1.
- **Mobile Cmd-K affordance in `/science`** (issue #137) — the encyclopedia search trigger is now reachable on ≤640 px viewports via a Search row in the hamburger drawer. Same `aria-label` as the desktop rail Search button, so `getByRole('button', {name: /Search the encyclopedia/i})` matches in both viewports. New `nav_search` paraglide key in all 14 locales.
- **`scripts/regenerate-visual-baselines-linux.sh` + `npm run regen-visual-baselines-linux`** (issue #132). Runs the pinned Playwright Docker image with a host-side `.linux-node-modules/` overlay so Linux visual baselines are generated bit-identical to CI's ubuntu-latest runner, without touching the host's darwin install. Six new `*-linux.png` baselines committed; the `test.skip(process.platform !== 'darwin')` guard from v0.6.1 is dropped.
- **`docs/guides/visual-regression-baselines.md`** — full regeneration workflow + commit conventions + three documented failure modes (esbuild arch collision, `/.npm` EACCES, non-deterministic renders). Cross-linked from `visual.spec.ts`.
- **`tests/e2e/i18n-body-text-desktop.spec.ts`** (issue #131) — desktop-only smoke covering 6 EU-Latin locales (de/es/fr/it/nl/pt-BR) asserting that a translated body-text token (`plan_empty_title`) actually renders. Closes the coverage gap the v0.6.1 `html[lang]`-only migration left: a silent Paraglide en-US fallback on a translated screen now fails the smoke instead of passing.

### Fixed

- **`/fly` 3D ↔ 2D hash-invariant flake — deterministic readiness signal** (issue #133). Replaces the v0.6.1 `data-out-vertex-hash` stability poll with ADR-056 hooks: `window.__flyArcHash()` + `window.__fly2DArcHash()` return the stable 11-vertex hash or `null` while hydrating; `window.__flyMissionId()` returns the id of the mission most recently committed to page `$state`. Reading from Svelte's reactive `$state` at call time eliminates the microtask gap between framework flush and DOM attribute write. Targeted run (12 cases): 5 consecutive runs, zero flake. Full suite: 62/62 in 1.3 min.
- **`validate-data` no longer scans untracked PRD/RFC drafts** (issue #136). Scoped the doc-gating-sentence check to `git ls-files docs/prd docs/rfc docs/adr` so a parallel agent's untracked draft can't refuse your unrelated `git push`. Staged-but-uncommitted files still get gated. Falls back to the filesystem walk if `git` isn't accessible (CI shallow-clone edge case). The stash-and-restore workaround from AGENTS.md §"Pre-push hook quirks" + CLAUDE.md §"Untracked PRD/RFC drafts" is dropped.

### Changed

- **AGENTS.md + CLAUDE.md** updated with v0.6.2 references: the new pre-push behaviour (#136), the release rehearsal script (#134), the auto-publish workflow (#135), and the linux visual baseline workflow (#132).

## [0.6.1] — 2026-05-16

A patch landing the day after v0.6.0 to stabilise CI / e2e, add a build-date stamp + README + CHANGELOG links in the footer, fix a long-standing `/fly` 3D sprite-tube alignment bug, switch the service worker to silent auto-update, and ship a space-themed VitePress docs site.

### Added

- **Footer build date + README + CHANGELOG links** — the footer now reads `Gallery | Credits | Library | License | README | v0.6.1 · 2026-05-16`. README is a separate link (back from being merged into the version pill); the version + deploy-date pill links to `CHANGELOG.md` on GitHub instead of the README. Build date is injected at build time via Vite `define` (same pattern as `__APP_VERSION__`), so it doubles as a quick-scan "this is the build live on GH Pages today" signal.
- **VitePress docs site — space theme + guides folder** — full `docs/` rewrite with a custom theme (`docs/.vitepress/theme/custom.css`) matching the production app palette (`--orrery-bg #04040c`, gold `#ffc850`, teal `#4ecdc4`, mars `#c1440e`); Bebas Neue + Space Mono + Crimson Pro from Google Fonts; static starfield + radial-gradient glow on the home hero (pure CSS, no images). Navigation revised: Home / Guides (user + translator) / Decisions (TA / ADR / RFC / PRD indices) / ↗ Live App. Footer + sidebar + tables + code blocks + custom blocks re-tinted; local-search input + outline-on-right + 640 px mobile breakpoint tuned. `npm run docs:build` green after fixing 15 dead links surfaced by the guide move.

### Changed

- **PWA service worker → silent auto-update** — `vite.config.ts` switches `registerType: 'prompt'` to `'autoUpdate'`. New SW bundles install silently on the user's next navigation instead of surfacing a "new version · refresh" toast that asked the user a question they couldn't answer with context. Modern PWA default (Twitter / Slack / Discord behaviour). Trade-off: a user with the app open for hours stays on the old version until they navigate — acceptable for an explorer / docs app. Drops `layout_pwa_new_version` + `layout_pwa_refresh` message keys across all 14 locales.

### Fixed

- **`/fly` 3D sprite-tube tip alignment** — the red dot lagged on outbound and led on return because `spacecraftPos()` and the in-frame `snapTubeTip()` lerp re-derived the spacecraft's position from the same waypoints through two independent code paths; algebraically identical, visually drifty under sustained playback. Refactored `snapTubeTip` to translate the tip cross-section directly to `sc.pos × SCALE_3D` (single source of truth), so the tube cone tip and the sprite are guaranteed to coincide every frame, on both arcs.
- **Mobile e2e regressions (hamburger drawer)** — 14 i18n locale-chip smoke specs + `fleet.spec` (`nav exposes the FLEET link`) + `smoke.spec` (`nav bar is visible …`) targeted the desktop `.center` nav strip, which is `display: none` on ≤640 px viewports since the v0.6.0 mobile-nav overhaul. New `tests/e2e/_helpers/nav.ts` exposes `clickNavLink()` + `localeChip()` — viewport-aware nav navigation, and the locale-chip locator is scoped to `[data-locale-picker]` so it doesn't collide with `button.chip` filter chips on screens like `/fly`. The remaining 2 affected suites (`fleet.spec` + `smoke.spec`) open the menu inline.
- **`/science` Cmd-K spec skipped on mobile** — the Search button is `display: none` on ≤640 px (desktop affordance, see `src/routes/science/+layout.svelte`); the two Cmd-K specs now `test.skip()` on mobile viewports.
- **Visual-regression baselines skipped on non-darwin** — `visual.spec.ts` baselines are committed as `*-darwin.png` (maintainer's machine); CI Linux looks for `*-linux.png` and reports "missing baseline" on every run. Suite now `test.skip()`s on non-darwin until linux baselines are committed too. Local darwin runs still execute the assertions.
- **`/library` axe scan timeout in CI** — 678 outbound-link rows × every axe rule exceeded the per-test 30 s playwright budget on cold Ubuntu runners (35–43 s in failing runs). Bumped to 90 s for `/library` specifically; other a11y-pilot routes stay on the default.
- **`missions.spec` count drift** — Apollo 13 shipped as the 37th mission (17th Moon entry) in v0.6.0, but the spec was still asserting 36 / 16. Bumped to 37 / 17 to match.
- **`fly-render-validation` 3D ↔ 2D hash-invariant flake** — Mariner 4, Apollo 11, and Apollo 17 occasionally failed on the first run and passed on retry. Bumped the `data-view='2d'` wait from 5 s to 10 s; swapped the locator to `[data-testid="fly-view-toggle"]` (more stable than a label regex now that the toggle row has five sibling panel-visibility buttons).
- **e2e workflow timeout 40 → 60 min** — the suite is 23–30 min steady-state, but flaky retries plus the `/library` axe scan push the worst case past 40. 60 min gives 2× margin without masking a runaway hang.

### Internal

- **`@playwright/test` 1.59.1 → 1.60.0** — dedup `playwright-core` to a single version so svelte-check no longer sees two distinct `Page` types (was blocking CI typecheck after `@axe-core/playwright` landed and pulled `playwright-core@1.60.0`).
- **`package-lock.json` regenerated with `--cpu=x64 --os=linux --include=optional`** — keeps the Linux-only native deps (`@emnapi/core`, `@emnapi/runtime`, `esbuild@0.28.0`, `yaml@2.9.0`) in the lockfile so GH Actions runners' `npm ci` doesn't reject the sync.

## [0.6.0] — 2026-05-15

The cislunar release. `/fly` learns Moon-mission geometry — every Apollo-class free-return, Artemis hybrid free-return, Chandrayaan-3 spiral, and Chang'e LOR rendered as its own per-profile trajectory in an Earth-centred view. The `/science` encyclopedia grows two new tabs (Observation + Life in Space). A new top-level `/fleet` explorer ships. And the visit starts on a real landing page at `/` instead of an explore-redirect.

### Added — cislunar `/fly` view (ADR-058)

- **Per-mission cislunar trajectory machinery** — `buildCislunarTrajectory()` parses each Moon mission's new `flight.cislunar_profile` (parking orbit, TLI ∆v + C3, translunar type, lunar arrival altitude / periselene, return ∆v) and produces a typed phase sequence (parking → tli_coast → lunar_arrival → tei_coast → reentry). 17 Moon missions populated (Apollo 11/13/17 + Artemis 2/3 + Luna 9/17/24 + LRO + Clementine + Chandrayaan 1/3 + Chang'e 4/5/6 + SLIM + Blue Moon Mk1).
- **Earth-Centred Inertial scene** at true Earth-Moon scale (`SCALE_CISLUNAR = 1/10 000`) — auto-engages for any mission whose `dest === 'MOON'`. Phase-coloured trajectory lines, ∆v annotation sprites, real Earth + Moon textures, moon-frame group that tracks lunar drift so lunar-orbit / descent / ascent phases anchor to the Moon as it moves.
- **Auto-zoom across phases** — camera close to Earth during parking / spiral_earth / reentry, pulled back across translunar coast, lerped in toward the Moon during lunar_orbit / lunar_flyby / descent / ascent. Mouse-wheel during a phase wins; next phase transition re-arms the lerp.
- **Moon-proximity override** — flyby-only profiles (Artemis II, Apollo 13) have no explicit `lunar_flyby` phase, so the camera now zooms whenever the spacecraft computes to within 80 000 km of the Moon centre, regardless of phase type.
- **8 science layers wired into the cislunar scene** at parity with heliocentric — hover, soi, gravity, velocity, centripetal, apsides, coast, conics. SoI rings sized to Earth (924 000 km) + Moon (66 100 km). Coast preview integrates a two-body Earth-gravity prediction forward 33 h.
- **Heliocentric auto-zoom** (interplanetary missions) — DEPARTURE close-up on Earth → wide cruise framing on the Earth↔destination midpoint → APPROACH close-up on the live destination. Mirror sub-phases for round-trips. Tube `drawRange` round-snaps to whole segments so the sprite stays aligned with the trajectory tip under close-up zoom.
- **2D cislunar fallback** for the `/fly` 2D toggle — same per-mission geometry rendered to canvas with Earth at centre and an auto-zoom on lunar phases.
- **Apollo 13** added as the 37th mission — free-return flyby with aborted LOI.

### Added — `/science` Observation + Life in Space tabs

- **Observation tab** (S1–S3 / issues #80 #81) — 7 sections covering Adaptive Optics · Black Holes · Coronagraphs · Interferometry · Space Photography · Spectroscopy · Wormholes. New ObservatoryShowcase strip on the space-photography section gallery imagery expanded to 96 observatory images across the fleet gallery pipeline.
- **Life in Space tab** (S2 / issue #80) — sections covering microgravity, radiation, IVA, EVA, lunar suits, long-duration life support, and crew-health topics. Three new suit-family sections (IVA / EVA / lunar suits) cross-link to `/fleet`.
- **`/science` now spans 85 sections across 10 tabs** (was 54 / 8). **71 hand-coded SVG diagrams** (was 62) — one per section + 10 tab covers, with the fail-closed integrity gate enforcing the count on every build.
- **Diagram polish pass** — S6 wave repaints 50+ existing diagrams across orbits / transfers / propulsion / mission-phases / porkchop / scales-time to match the latest design-system tokens (flag flips, blueprint accents).
- **`photo` field wired into section pages** — high-value imagery embedded on 18 sections (NASA / ESA observatory + agency photography), all with full image-provenance coverage.

### Added — `/fleet` explorer + space-suit category

- **New top-level `/fleet` route** — bill-of-materials view across the fleet (rockets, capsules, landers, rovers, orbiters, observatories) and now space-suits. Selection halos, per-planet pill colors on filters, Mars labels.
- **Space-suit category** — 13 suit-family entries (en-US) with full provenance + i18n wave 2/3 across 12 locales + sr-Cyrl manual overlays for the 3 new suit sections. Wired into `validate-data` + schemas. Krechet placeholder + sokol-m fallbacks. `linked_missions` use real mission IDs.

### Added — root `/` landing page (PRD-013 / UXS-013 / Issue #74)

- **Real landing replacing the `/ → /explore` 307 redirect** — hero (`ORRERY` 96 px wordmark + tagline + two CTAs), what-is-this section, why-this-exists section, multi-paragraph guided tour, 11-card grid covering every primary nav destination + `/fleet`, footer block linking to GitHub / README / License / Credits / Library / Technical Authority. Long-form scrollable single column, mobile-first (375 px → 1-col cards). 49 new `landing_*` keys translated to all 14 supported locales. Browser-locale auto-detection on first paint. 10 e2e tests on desktop + mobile.

### Added — Dutch locale + i18n coverage

- **Dutch (`nl`) locale** — 14th supported language (issue #72). Full UI bundle (711 keys) at 100% parity with the other 13 locales. Native name **Nederlands**, short tag **NL**, flag 🇳🇱. LocalePicker entry added between Italiano and Српски. Translations follow the ESA-NL physics/astronomy glossary; mission and agency proper nouns kept in original.
- **Dutch entity overlay tree** — full coverage across missions / planets / sun / rockets / earth-objects / moon-sites / mars-sites / iss-modules / iss-visitors / tiangong-modules / tiangong-visitors / scenarios (161 files).
- **`/science` overlay gap closed for es/de/fr/it** — 14 files (history/_intro + 6 history sections + space-stations/_intro + 4 space-stations sections + mission-phases/eva + scales-time/long-duration) translated for the four EU locales that already had partial coverage. Brings es/de/fr/it from 49 → 63 `/science` files each.
- **`iss-visitors/` overlays for all 13 non-en-US locales** — closes the en-US-only gap for cargo_dragon, crew_dragon, cygnus, htv_x, progress_ms, soyuz_ms, starliner. 7 files × 13 locales = 91 new files.
- **i18n wave 2/3 for 28 new sections + 13 suit entries** across the 12 non-en-US locales.

### Added — Mobile + Browser-locale ergonomics (ADR-057)

- **Browser-locale URL canonicalisation** (Issue #73 Gap 1) — auto-detected locales rewrite the URL to the canonical `?lang=de` form via `replaceState`, so bookmarks and share-links carry the locale. 10 unit + 5 e2e tests.
- **`orrery_locale` cookie for explicit locale overrides** (Issue #73 Gap 2 / ADR-057 Accepted) — single functional cookie (`SameSite=Lax`, 1-year, no PII), written only on explicit LocalePicker click. Sits between URL and `navigator.language` in the resolution chain. Auto-detect paths never write the cookie.
- **Mobile UX overhaul** — hamburger nav, collapsible `/fly` HUD on narrow viewports, compact `/science` section rail, footer-overlay improvements, per-planet pill colors.
- **Build version in footer** — `Credits | Library | v0.6.0` strip; version injected via Vite `define` from `package.json`.
- **Nav wordmark polish** — bumped to 36 px, vertically centred within the 52 px nav bar.

### Added — Documentation + tooling

- **Tech BOM generator** (closes #92) — `scripts/build-tech-bom.ts` writes [`docs/TECH-BOM.md`](docs/TECH-BOM.md) listing every npm package shipped or used at build time, with version + license. License-audited fail-closed in CI.
- **PRD-014 + RFC-017 — Surface Hotspots** (progressive landing-site exploration).
- **ADR-055, ADR-056, ADR-057, ADR-058** — `i18n` cookie scope, surface-map design, locale persistence cookie scope, cislunar `/fly` architecture.

### Changed

- **`/fly` left rail consolidated** — identity / navigation / flight-params / systems / spacecraft-state stack flush in one column. Top-controls bar puts FlightDirectorBanner + ScienceLayersPanel side-by-side instead of stacked vertically.
- **Solar / Cislunar `/fly` toggle de-scoped** (ADR-058 amendment) — Moon missions render exclusively in cislunar view; heliocentric Moon-mode no longer toggleable. The PiP context inset was also dropped during smoke-testing.
- **Mars + maps polish** — selection halos on `/mars` / `/moon`, label rendering for Mars sites, drop redundant README footer link.

### Fixed

- **CI e2e timeout** bumped 25 → 40 min for the v0.6 suite size.
- **`apollo13.jpg`** sourced + suit-diagram spec-panel fixes; `sokol-m` placeholder.
- **Tech BOM** GitHub-shorthand + LICENSE URL — unblocks the deploy.
- **Heliocentric tube/sprite alignment** under close-up auto-zoom — round-snap fixes the visible offset.
- **Artemis II cislunar zoom** — Moon-proximity check now fires for hybrid-free-return profiles that skip the explicit `lunar_flyby` phase.

### Dependencies

- **Bulk Dependabot bump** — vitest 2 → 4 · svelte 5.16 → 5.55 + 4 minor.

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
- **`docs/guides/i18n-style-guide.md`** — translator brief with per-language glossary tables.
- **`docs/guides/user-guide.md`** — read-this-first walk-through of the live app, screen by screen, with screenshots.
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
