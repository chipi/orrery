# AGENTS.md — Orrery

Instructions for any AI / coding agent working on this codebase. Read this before touching any file.

This is the **canonical** instruction file. `CLAUDE.md` and `.cursor/rules/orrery.mdc` are thin pointers to this document so there's a single source of truth — no 2-way drift between tool-specific copies. Tool-specific notes (e.g. a Claude Code bash-output caveat) live in those thin files when they only apply to one agent.

---

## Where to start — read these before touching code

**Single-page architecture map: [`docs/adr/TA.md`](docs/adr/TA.md).** v2.7 is current as of v0.8; it documents every route, subsystem, 3D scene, asset pipeline, contract, and constraint, each with the ADR that locked it. Read it first when a task touches anything outside one file.

Then drill into the matching doc by question type:

| Question | Where to look |
|---|---|
| Why was X chosen? What are the alternatives? | `docs/adr/` — locked decisions (ADR-001 through ADR-058) |
| What is the user value? What's the v1 scope? | `docs/prd/` — product requirements (PRD-001 through PRD-014) |
| What is the open architecture question being deliberated? | `docs/rfc/` — RFCs in flight (RFC-001 through RFC-017) |
| What does the UI look like? | `docs/uxs/` — UX specifications |
| Per-language translation rules? | `docs/guides/i18n-style-guide.md` (binding per ADR-033) |
| Image / link / text provenance? | `static/data/{image,link}-provenance.json` + ADR-046 / ADR-047 / ADR-051 |
| How is a specific 3D scene built? | TA.md §rendering + `src/routes/<route>/+page.svelte` |
| How does the build pipeline work? | TA.md §pipelines (10 pipelines documented) |

**Anti-drift rule:** when code and TA.md disagree, one is wrong — fix it. The same applies to README, CHANGELOG, and TECH-BOM. Do not tolerate divergence.

---

## What this project is

Orrery is a browser-based solar system explorer, mission simulator, encyclopedia, station explorer, and spaceflight fleet inventory rolled into one. Eleven primary nav destinations, real orbital mechanics, **113 missions** in the catalog (Moon + Mars + inner-planet + outer-system probes), **251 fleet entries** across 9 categories cross-linked bidirectionally to the rest of the corpus, and a canonical **ORRERY-1** free-return Mars flyby scenario for generic `/fly` runs. It runs entirely in the browser, deploys offline, and has no backend or user accounts. Built for millions of users worldwide — mobile-first, internationalised in **14 locales** at 100% UI parity (en-US + es / fr / de / pt-BR / it / nl / zh-CN / ja / ko / hi / ar / ru / sr-Cyrl).

The eleven primary nav destinations:

| Route | Screen | File |
|---|---|---|
| `/explore` | Solar System Explorer | `src/routes/explore/+page.svelte` |
| `/plan` | Mission Configurator (Earth → 9 destinations, LANDING/FLYBY) | `src/routes/plan/+page.svelte` |
| `/fly` | Mission Arc (heliocentric + cislunar Earth-centered scenes) | `src/routes/fly/+page.svelte` |
| `/missions` | Mission Catalog | `src/routes/missions/+page.svelte` |
| `/earth` | Hybrid scene — default orbital mode (ISS, Tiangong, satellites, LEO/MEO/GEO regime rings, atmosphere shell, ozone overlay) + surface mode (`?mode=surface`) with 14 launchpad markers via shared `SurfaceScene` per ADR-072. Mode toggle top-center. | `src/routes/earth/+page.svelte` (router) + `src/routes/earth/EarthOrbitalScene.svelte` (bespoke orbital scene) |
| `/moon` | Lunar surface map — rectangular hotspot regions (ADR-061), per-mission lander glyphs, lunar orbiters, tidal-lock overlay, sphere → flat-patch view at deep zoom (ADR-062) | `src/routes/moon/+page.svelte` (thin shell over `src/lib/surface-scene/SurfaceScene.svelte` per ADR-072) |
| `/mars` | Martian surface map — rectangular hotspot regions, per-mission lander glyphs, rover traverses with curated stops, atmosphere shell, 25.19° axial tilt, sphere → flat-patch view at deep zoom | `src/routes/mars/+page.svelte` (thin shell over `src/lib/surface-scene/SurfaceScene.svelte` per ADR-072) |
| `/iss` | ISS Explorer (18 pickable modules + visiting spacecraft) | `src/routes/iss/+page.svelte` |
| `/tiangong` | Tiangong Explorer (Tianhe + Wentian + Mengtian with module overlays) | `src/routes/tiangong/+page.svelte` |
| `/science` | Encyclopedia (85 sections × 10 tabs + Space-101 landing) | `src/routes/science/+page.svelte` |
| `/fleet` | Spaceflight Fleet (166 entries × 11 categories — `launcher`, `crewed-spacecraft`, `cargo-spacecraft`, `station`, `rover`, `lander`, `orbiter`, `observatory`, `space-suit`, `constellation`, `launch-site` — with bidirectional cross-links) | `src/routes/fleet/+page.svelte` |

Plus three read-only pages: `/credits` (per-image provenance + text-source attributions), `/library` (bill-of-links across the entire app — every outbound LEARN link with provenance), and `/posters` (Orrery art-print gallery — 11 hand-authored SVG posters across three style families: JPL travel-poster, era-matched, indie-pop).

Other routes under `src/routes/` are landing pages or experiments (see repo layout).

---

## Stack — locked decisions

Do not propose alternatives. If a locked decision needs revisiting, write an ADR superseding the relevant one.

| Concern | Decision | ADR |
|---|---|---|
| Language | TypeScript, `strict: true` | ADR-011 |
| Framework | SvelteKit | ADR-012 |
| 3D rendering | Three.js r128, local bundle | ADR-001 |
| Bundler | Vite (via SvelteKit) | ADR-012 |
| Routing | History API via SvelteKit router | ADR-013 |
| CI + staging | GitHub Actions + GitHub Pages (staging tier; dev → staging → prod) | ADR-014 |
| Unit tests | Vitest | ADR-015 |
| E2e tests | Playwright | ADR-015 |
| External assets | Resolved at build time | ADR-016 |
| Imagery sourcing | Agency-first fetch priority; NASA as fallback library | ADR-046 |
| Outbound LEARN links | Agency-first per-link provenance; native-language priority; `rel="noopener noreferrer external"` + `hreflang` everywhere; public `/library` bill-of-links; link-checker chained into `npm run fetch` | ADR-051 |
| Provenance + license stewardship | Per-image manifest + text manifest + fail-closed validate-data; public `/credits` page | ADR-047 |
| i18n | Paraglide-js + locale overlay files | ADR-017 |
| Design approach | Mobile-first, bottom sheet panels | ADR-018 |
| Data validation | ajv JSON schema on PR | ADR-019 |
| Mission data | Static JSON under `static/data/` (served as `/data/...`) | ADR-006 |
| Mission flight params | Optional `flight` sub-object + `flight_data_quality` honesty flag | ADR-027 |
| Panel tabs + galleries | Tabbed detail panels (OVERVIEW · GALLERY · TECHNICAL · SIZES · LEARN · FLIGHT); GALLERY is always the 2nd tab when present (conditional on per-category manifest); LEARN links in locale overlays | ADR-017, ADR-016 |
| Lambert solver | Web Worker | ADR-008 |
| Default fly scenario | ORRERY-1 free-return flyby (library missions add landings / cislunar arcs) | ADR-009 |
| Transfer arc | Keplerian half-ellipses | ADR-010 |
| `/science` math rendering | KaTeX server-rendered at build; client receives plain HTML, no JS math library | ADR-034 |
| `/science` diagrams | Hand-coded SVG sources committed under `static/diagrams/science/`; fail-closed `validate-diagrams.ts` integrity check chained into `validate-data` | ADR-035 |
| `/science` cross-screen `?` chips | Click navigates to `/science/[tab]/[section]`; desktop hover shows section intro_sentence as `title` tooltip; min 24×24px hit area | ADR-036 |
| Service worker / PWA | `@vite-pwa/sveltekit`; offline shell after first paint; `data-high-contrast` attribute on `<html>` is the pattern Science Lens copies | ADR-029 |
| Translation workflow | LLM-direct (in the Claude Code session — no offline-NMT pipeline, no model downloads); sr-Cyrl hand-authored | ADR-033 |
| Fonts + script strategy | Wave 1 (Latin+Cyrillic) bundled Inter + Crimson Pro; Wave 2 CJK Noto Sans/Serif CJK; RTL Arabic via `dir="rtl"`; sr-Cyrl Cyrillic gate | ADR-032, ADR-043, ADR-044, ADR-045 |
| `/fly` trajectory math | Pure-function isolation + per-mission validation harness; committed expected values catch regressions | ADR-030 |
| `/fly` cislunar view | Earth-centered second camera + per-mission `flight.cislunar_profile` block on Moon missions; auto-switches when destination is MOON | ADR-058 |
| Science Lens + multi-layer state | Attribute-on-`<html>` + MutationObserver subscription; 12 per-layer toggles gated on the master lens; CSS reacts via `:global([data-science-layer-*='on'])` with zero imports | ADR-055 |
| Fleet schema + cross-refs | Per-category folders + generated index manifest; bidirectional `fleet_refs` ↔ `linked_missions`/`linked_sites` enforced by symmetric-link validator (fail-closed) | ADR-052 |
| Fleet imagery + i18n | Same agency-first pipeline as the rest of the corpus; 251 entries × 14 locales = 3,514 overlay files translated in-session by the LLM | ADR-053, ADR-054 |
| E2e readiness signals | Every canvas route exposes `window.__pickAt(x, y)` + `data-route-ready` + `data-loading` attributes; no `sleep(N)` polling in Playwright tests | ADR-056 |
| Locale persistence | Single `orrery_locale` cookie is the ONLY exception to "no client storage"; everything else stays runtime-only | ADR-057 |

For the complete locked-decision matrix (all 58 ADRs, every component, every contract, every constraint, every 3D scene, every pipeline), see [`docs/adr/TA.md`](docs/adr/TA.md). This table is the dev-facing day-to-day reference; TA.md is the authoritative architectural map.

Superseded (do not use): ADR-002 (vanilla JS), ADR-003 (Vite standalone), ADR-004 (hash routing), ADR-005 (Docker Compose only).

---

## Repository structure

```
/
├── AGENTS.md               ← this file (canonical universal AI / agent instructions)
├── CLAUDE.md               ← thin pointer to AGENTS.md + Claude-Code-specific notes
├── .cursor/rules/orrery.mdc ← thin pointer to AGENTS.md for Cursor
├── IMPLEMENTATION.md       ← implementation slices and gates
├── README.md               ← public project introduction
├── LICENSE                 ← MIT
├── .gitignore
│
├── src/
│   ├── routes/             ← SvelteKit file-based routing (11 primary nav + 3 read-only)
│   │   ├── +layout.svelte  ← nav bar, i18n provider, locale picker, footer
│   │   ├── explore/+page.svelte
│   │   ├── plan/+page.svelte
│   │   ├── fly/+page.svelte           ← v0.5.0 cislunar Earth-centered scene (ADR-058)
│   │   ├── missions/+page.svelte
│   │   ├── earth/+page.svelte
│   │   ├── moon/+page.svelte
│   │   ├── mars/+page.svelte           ← v0.4.0 (PRD-009 / RFC-012)
│   │   ├── iss/+page.svelte            ← v0.5.0 (PRD-010 / RFC-013)
│   │   ├── tiangong/+page.svelte       ← v0.5.0 (PRD-011 / RFC-014)
│   │   ├── science/                    ← v0.5.0 (PRD-008 / RFC-011) — encyclopedia
│   │   ├── fleet/+page.svelte          ← v0.6.0 (PRD-012 / RFC-016 / ADR-052/053/054)
│   │   ├── credits/+page.svelte        ← v0.4.0 (ADR-047) — image provenance
│   │   └── library/+page.svelte        ← v0.5.0 (ADR-051) — outbound link inventory
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Nav.svelte                     ← shared 52px nav bar + locale picker
│   │   │   ├── AudioOverlay.svelte            ← v0.7 audio narration overlay (PRD-016 / RFC-019)
│   │   │   ├── ScienceLensBanner.svelte       ← collapsible banner (ADR-055)
│   │   │   ├── ScienceLayersPanel.svelte      ← per-layer sub-toggles (12 layers)
│   │   │   ├── ScienceChip.svelte             ← cross-screen `?` chip (ADR-036)
│   │   │   ├── FlightDirectorBanner.svelte    ← /fly 5-phase narration
│   │   │   ├── WhyPopover.svelte              ← inline value-explanations
│   │   │   ├── StationModulePanel.svelte      ← shared by /iss + /tiangong
│   │   │   ├── ObservatoryShowcase.svelte     ← /science 12-shot strip (v0.6)
│   │   │   └── ...
│   │   ├── data.ts                       ← fetch + cache + i18n shallow merge (ADR-017)
│   │   ├── orbital.ts                    ← keplerPos(), visViva()
│   │   ├── scale.ts                      ← auToPx(), altToOrbitRadius()
│   │   ├── lambert.ts                    ← solver (worker only)
│   │   ├── fly-physics.ts                ← transfer ellipse + Tsiolkovsky + per-mission validation (ADR-030)
│   │   ├── cislunar-geometry.ts          ← Earth-Centered Inertial trajectory builder (ADR-058)
│   │   ├── science-lens.ts               ← attribute-on-<html> lens state (ADR-055)
│   │   ├── science-layers.ts             ← multi-flag layer state (12 layers, ADR-055)
│   │   ├── orbit-overlays.ts             ← lens-layer 3D helpers (gravity arrows, conics, …)
│   │   ├── microgravity-axes.ts          ← /iss + /tiangong axis overlay
│   │   ├── station-geometry.ts           ← shared mesh helpers (ADR-049)
│   │   ├── katex.ts                      ← KaTeX server-rendered wrapper (ADR-034)
│   │   ├── earth-satellite-models.ts     ← 20 per-mission /earth + lunar-orbiter builders
│   │   ├── moon-lander-models.ts         ← 11 per-mission /moon surface builders (v0.6.0)
│   │   ├── mars-lander-models.ts         ← 9 per-mission /mars surface builders
│   │   ├── surface-scene/                 ← canonical /moon + /mars renderer (ADR-072)
│   │   │   ├── SurfaceScene.svelte       ← shared 3D scene + animation loop + HUD + panel state
│   │   │   ├── SurfaceFlatPatch.svelte   ← flat 2D ground-patch view at deep zoom (ADR-062)
│   │   │   ├── types.ts                  ← SurfaceSceneConfig — 8 body-justified knobs
│   │   │   ├── README.md                 ← contract: before adding a 9th knob, read this
│   │   │   └── debug-info.ts, register-{moon,mars}-hotspot-builders.ts
│   │   ├── iss-proxy-model.ts            ← ISS proxy model + module pickability (ADR-040/041)
│   │   ├── tiangong-proxy-model.ts       ← Tiangong proxy model (ADR-049)
│   │   ├── moon-marker-category.ts       ← category fallback for unknown lunar mission ids
│   │   ├── link-provenance.ts            ← LEARN-link locale fallback chain (ADR-051)
│   │   ├── image-credits.ts              ← per-image TASL parsing for lightbox
│   │   ├── credits-grouping.ts           ← /credits page section grouping
│   │   ├── library-grouping.ts           ← /library page section grouping
│   │   └── license-allowlist.ts          ← canonical license allowlist (ADR-047)
│   ├── workers/
│   │   └── lambert.worker.ts
│   └── types/
│       ├── mission.ts      ← Mission, MissionIndex interfaces
│       ├── science.ts
│       ├── iss-module.ts
│       ├── tiangong-module.ts
│       └── planet.ts
│
├── static/                 ← SvelteKit static dir (copied to build/ root)
│   ├── fonts/              ← self-hosted (fetched at build)
│   ├── textures/           ← planet textures (fetched at build)
│   ├── logos/              ← agency logos (fetched at build, Wikimedia Commons)
│   ├── images/missions/    ← build-time fetch (agency-first per ADR-046; Wikimedia + NASA fallback)
│   ├── images/rockets/     ← Wikimedia rocket reference photos
│   ├── diagrams/
│   │   ├── science/        ← 71 hand-coded SVGs (61 sections + 10 covers, ADR-035)
│   │   └── spacecraft/     ← 9 visiting-craft ANATOMY diagrams
│   ├── images/fleet-galleries/         ← per-fleet-entry hero + gallery (ADR-053)
│   ├── images/crew/                    ← per-flight crew portraits (ADR-053)
│   ├── data/               ← all app JSON: missions, fleet, i18n overlays, schemas, planets, porkchop, …
│   │   ├── missions/
│   │   │   ├── index.json  ← lightweight manifest (42 entries)
│   │   │   ├── mars/       ← base mission files (language-neutral) — `flight.interplanetary_profile` per ADR-058 third amendment
│   │   │   ├── moon/       ← Moon missions (incl. `flight.cislunar_profile` per ADR-058)
│   │   │   ├── ceres/ jupiter/ neptune/ pluto/  ← outer-system missions (`flight.interplanetary_profile`)
│   │   ├── fleet/          ← 137 entries × 9 categories (ADR-052; PRD-012 / RFC-016)
│   │   │   ├── index.json                    ← generated manifest (drives /fleet card grid)
│   │   │   ├── launcher/                     ← per-entry base files (language-neutral)
│   │   │   ├── crewed-spacecraft/
│   │   │   ├── cargo-spacecraft/
│   │   │   ├── station/  rover/  lander/  orbiter/  observatory/  space-suit/
│   │   ├── mars-traverses/ ← rover route polylines (Curiosity, Perseverance, Opportunity, Spirit)
│   │   ├── scenarios/      ← ORRERY-1 free-return + others
│   │   ├── science/        ← 10 tab folders × ~7 sections each (ADR-034); 85 sections total
│   │   ├── i18n/
│   │   │   ├── en-US/      ← English overlays (source language)
│   │   │   ├── es/  fr/  de/  pt-BR/  it/  nl/  ← Wave 1 locales (Latin)
│   │   │   ├── zh-CN/  ja/  ko/                ← Wave 2 (CJK, ADR-044)
│   │   │   └── hi/  ar/  ru/  sr-Cyrl/         ← Wave 3 (RTL + Devanagari + Cyrillic, ADR-043/045)
│   │   ├── schemas/                  ← 33 ajv schemas (mission, fleet, surface-site, science-section, provenance, …)
│   │   ├── porkchop/                 ← pre-computed grids (ADR-026 + ADR-028); 9 destinations
│   │   ├── image-provenance.json     ← per-image manifest (ADR-047, auto-generated)
│   │   ├── link-provenance.json      ← per-link manifest (ADR-051, auto-generated)
│   │   ├── license-waivers.json      ← image-license waivers (ADR-047)
│   │   ├── text-sources.json         ← per-text editorial provenance (ADR-047)
│   │   ├── source-logos.json         ← 28 publisher logo + license entries (ADR-047)
│   │   ├── iss-modules.json
│   │   ├── tiangong-modules.json
│   │   ├── moon-sites.json           ← surface sites (`fleet_refs` per ADR-052)
│   │   ├── mars-sites.json           ← surface sites (`fleet_refs` per ADR-052)
│   │   ├── earth-objects.json        ← satellites + observatories (`fleet_refs` per ADR-052)
│   │   ├── planets.json
│   │   └── rockets.json
│   └── .nojekyll           ← required for GitHub Pages
│
├── scripts/                            ← standing build-time tools (full map: docs/reference/tooling/)
│   │                                      one-shots live in scripts/_archive/ (see tooling/archive.md)
│   ├── fetch-assets.ts                  ← agency-first imagery fetch, staging-by-default (ADR-046 / RFC-029)
│   ├── score-images.ts                  ← vision scoring → image-vision.json (scripts/vision/)
│   ├── build-image-provenance.ts        ← writes static/data/image-provenance.json + diff report (ADR-047)
│   ├── build-link-provenance.ts         ← writes static/data/link-provenance.json (ADR-051)
│   ├── check-learn-links.ts             ← outbound-link freshness gate (ADR-051 L-E)
│   ├── audit-fleet-heroes.ts            ← flags low-quality fleet heroes; output to docs/provenance/ (ADR-053)
│   ├── fix-fleet-heroes.ts              ← Wikipedia-API filename substitution helper (ADR-053)
│   ├── license-allowlist.ts             ← canonical license allowlist + normaliser (ADR-047)
│   ├── precompute-porkchops.ts          ← pre-computes 9 per-destination porkchop grids (ADR-026 + ADR-028)
│   ├── build-science-index.ts           ← Cmd-K search index + ?-chip vocabulary for /science
│   ├── validate-data-runner.ts          ← orchestrates every validate-* gate (npm run validate-data)
│   ├── validate-data.ts                 ← ajv validation + provenance + diagram integrity + symmetric fleet cross-refs
│   ├── validate-diagrams.ts             ← SVG integrity gate (ADR-035)
│   ├── build-tech-bom.ts                ← license audit of npm deps; writes docs/TECH-BOM.md
│   ├── capture-screenshots.ts           ← Playwright-driven README + user-guide screenshot regeneration
│   ├── audio/  vision/  hotspots/  lib/  cislunar/  wave23/   ← subdir pipelines (see tooling/)
│   └── _archive/                        ← 135 retired one-shots (migrations, slice fetches, translation passes)
│
├── tests/                  ← Playwright e2e tests
├── docs/                   ← all documentation
│
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── playwright.config.ts
└── .github/workflows/
    ├── ci.yml
    ├── docker-e2e.yml         # canonical Playwright gate + GHCR publish (ADR-071 supersedes ADR-066 trigger surface)
    ├── deploy-docs.yml        # docs site, CI-gated (ADR-070)
    ├── preview.yml            # full app+docs, docker-e2e-gated (ADR-070, retargeted by ADR-071)
    ├── deploy-prod.yml        # tailnet VPS deploy, manual (#260)
    ├── refresh-launches.yml   # cron — launches.json refresh
    ├── regen-snapshots.yml    # manual — visual-baseline regen
    └── release.yml            # tag → GitHub Release
```

---

## Tooling index — what to run, and when

**Before reaching for a script, check [`docs/reference/tooling/`](docs/reference/tooling/README.md)** — the canonical map of every *standing* tool (build/CI, data validation, image pipeline, content pipelines) with what/when/gotchas. It supersedes guessing from `scripts/` filenames: one-shot wave/slice/migration scripts now live in `scripts/_archive/` (don't re-run them — read for the recipe, then use the standing tool). Deep end-to-end references stay authoritative: [TA.md §pipelines](docs/adr/TA.md), [`scripts/IMAGE-PIPELINE.md`](scripts/IMAGE-PIPELINE.md), the `docs/guides/` runbooks.

Highest-frequency surface: `npm run preflight` (pre-push gate, no e2e), `npm run validate-data` (data gates), `npm run validate-prod` (**post-deploy** live-site validator — browser-based, ~60 checks incl. a regression guard per prod fix; `VALIDATE_URL=…` to target staging/local; see `docs/wip/2026-07-22-prod-validator.md`), `npm run audit:images` (every shipped image is used), `npm run fetch-assets` (stages to `_staging/` → review at `/dev/staging` → `npm run build-image-provenance -- --offline`), `npm run images:hotspots` (Mars/Moon surface detail, Node 20 + gdal). New standing tool → add a row to the matching tooling page; retired tool → move to `_archive/` + note in `tooling/archive.md`.

---

## Audio narration — read before touching `src/lib/audio-*` or `scripts/audio/`

v0.7 ships an in-overlay narrated episode system (PRD-016 / RFC-019). en-US only — v0.8 adds the Anthropic translation pipeline + 12-locale Curator Tour.

- **Source of truth.** Episode scripts live in `content/episodes/<locale>/<episode-id>.md` (YAML frontmatter + SSML body). Voice ID map: `static/data/audio/voices.json`. Generated assets: `static/audio/<locale>/<persona>/<id>.<hash8>.{mp3,vtt,txt}` (content-addressed). Manifest: `static/data/audio/audio-provenance.json` (schema: `static/data/schemas/audio-provenance.schema.json`).
- **Pipeline triggers.** Operator-only: `npm run audio:generate -- --episode <id> [--locale en-US] [--provider google|elevenlabs]`. Cost ledger gates at $50/mo soft, $200/mo hard. `npm run audio:check-cost` is wired into `npm run preflight` so an over-cap state blocks pushes.
- **Runtime contract.** AudioOverlay reads the manifest via `src/lib/audio-registry.svelte.ts`. Adding/renaming an episode without regenerating provenance leaves it invisible to the runtime. The Curator Tour playlist + cue-banner stage hooks live in `src/lib/audio-tour.ts` — every id in `CURATOR_FULL_TOUR` and every key in `EPISODE_STAGES` MUST resolve to a provenance row (unit test enforces).
- **Transparency.** Every audio asset's text authorship + voice provider + tts_model + voice id surface on `/credits`. Provider/model/voice-id never elided.
- **Operator runbook:** [docs/guides/audio-pipeline-setup.md](docs/guides/audio-pipeline-setup.md). Adding a new provider: implement `TtsProvider`, list it in `PROVIDER_NAMES` + `PROVIDER_MODELS` (`scripts/audio/generate.ts`), add a voices.json key, update `ProviderName` in `src/lib/audio-types.ts`. Pipeline picks up the rest.

### Tour cue authoring — rules for `EPISODE_STAGES`

Cues + DOM actions in `src/lib/audio-tour.ts` are the interaction layer that runs over an episode's narration. The audio bundle is frozen ground truth — you can re-time and add actions, but never to compensate for SSML you'd rather have written differently. Edits to SSML require a full audio re-render.

- **Time against the VTT, not the SSML target.** Frontmatter `duration_target_sec` is the author's intention; the `.vtt` last-cue end-timestamp is reality. ElevenLabs renders 30–45 % faster than SSML targets for guide-tier episodes. Anchor every `at_sec` against a specific VTT line and note it inline (e.g. `// VTT § 00:00:48.9 "Click Curiosity"`).
- **The screen does what the voice says.** Every imperative ("click X / drag / look at") gets a stage within ±3 s. Every named entity that has a `data-audio-stage` hook on the route should be flashed or clicked when its name is spoken — even when the narration doesn't say "click" out loud. Add per-card / per-marker hooks before adding the stages.
- **1 s cue→click default.** Cue banner shows ~1 s before the click that demonstrates it; cue stays visible (default 6000 ms) through and after the click. Hold 2 s only for cues > 8 words or when a `drag`/`zoom` follows (the eye needs to find the canvas first).
- **Cue text is directive, not subtitle.** "Click any planet — like this." beats "We now click on a planet." The cue tells the user what's about to happen; don't repeat the narration verbatim.
- **No overlap.** Don't replace a cue banner mid-read (Δt < banner duration), don't stomp a flash with another flash within 1.8 s, don't yank a scroll-to with another scroll-to within ~2 s, don't fire a click while a panel from a previous click is still animating.
- **Roll-calls get per-item hooks.** When narration names a sequence ("Vostok → Voskhod → Mercury → Gemini → CSM → Soyuz"), add a `data-audio-stage` hook to each card and flash them in order. A single container-flash is the wrong answer when the script is a roll-call.
- **`navigate` for URL-bound state.** Use the `navigate` action (not `click`) to demo search/filter affordances on routes whose state lives in the URL (`/missions`, `/fleet`, `/launches`). Target is the URL path/query (`/missions?q=apollo`), NOT a CSS selector.
- **Panorama / assembly playback opportunities.** /moon and /mars sites with `hotspot_tier3_panorama` can be entered via `data-audio-stage="surface-stand-at-site"`. /iss and /tiangong have a fixed-duration assembly playback (50 s / 24 s); only wire it into episodes whose narration covers a window of at least that length, with the assembly narrative content matching what plays.
- **Verify in a real browser.** A failing selector silently no-ops — preflight won't catch it. After authoring, play the episode through with the AudioOverlay open and watch every stage fire.

---

## i18n rules — follow these exactly

**Translation model tier (cost policy).** Default the `scripts/translate-*.mjs`
LLM calls to **Haiku** (`claude-haiku-4-5`) — it is the workhorse for all bulk
i18n: UI strings, mission/science/fleet/earth-object/planet overlays, dispatch
lines, alt-text. Reserve **Sonnet** (`claude-sonnet-4-5`) only for the *big
long-form editorial pieces* where prose register carries real weight — **essays
and `/programs`**. That's it. Never default a translation script to Sonnet (let
alone Opus) "for quality" on ordinary overlays — Haiku is the standing choice.
Always run the translators with a **concurrency pool** (≈6-wide), never a bare
sequential `for await` loop. Current wiring: gaps / v07-ui / dispatch / alt-text
→ Haiku; programs → Sonnet.

**UI strings:** never hardcode user-facing text in `.svelte` files. All UI strings go through Paraglide-js.

```typescript
import { t } from '$lib/i18n'
// correct
<button>{t('nav.fly')}</button>
// wrong
<button>FLY</button>
```

**Mission content:** base mission files (`static/data/missions/`) contain only language-neutral data. Editorial strings (name display, description, first-line, type label, CAPCOM event notes) live in locale overlay files (`static/data/i18n/[locale]/missions/`). The data client merges them at fetch time.

**Fallback:** always fall back to `en-US` for missing translations. Never show a translation key to the user.

---

## Data layer rules

All data access goes through `src/lib/data.ts`. Never `fetch` a JSON file directly.

```typescript
import { getMissionIndex, getMission, planets } from '$lib/data'

const missions = await getMissionIndex()              // card grid
const mission  = await getMission('curiosity','mars') // detail panel
```

Base mission files contain: `id`, `agency`, `dest`, `status`, `year`, `sector`, `color`, `departure_date`, `arrival_date`, `transit_days`, `vehicle`, `payload`, `delta_v`, `data_quality`, `credit`, `links`, `flight` (per ADR-027 — includes optional `flight.cislunar_profile` for Moon missions per ADR-058), `fleet_refs[]` (forward pointer to fleet entries per ADR-052).

Locale overlay files add: `name`, `description`, `first`, `type`, `events[].note`.

Fleet entries, surface sites, and other localised records follow the same base + overlay pattern. Full contract shapes live in `docs/adr/TA.md` §contracts and in `static/data/schemas/`. For fleet specifically: bidirectional `fleet_refs` ↔ `linked_missions`/`linked_sites` is enforced by the symmetric-link validator (ADR-052).

**NON-NEGOTIABLE — overlay-completeness rule.** When you add a new ID to any base-data registry, you MUST create the matching en-US overlay file in the same commit:

| Base registry | Required en-US overlay |
|---|---|
| `static/data/earth-objects.json` (any new id) | `i18n-src/en-US/earth-objects/{id}.json` |
| `static/data/fleet/index.json` (any new id) | `static/data/fleet/{category}/{id}.json` + `i18n-src/en-US/fleet/{category}/{id}.json` |
| `static/data/moon-sites.json` (any new id) | `i18n-src/en-US/moon-sites/{id}.json` |
| `static/data/mars-sites.json` (any new id) | `i18n-src/en-US/mars-sites/{id}.json` |
| `static/data/science/{tab}/_index.json` (any new id) | `i18n-src/en-US/science/{tab}/{id}.json` + `static/data/science/{tab}/{id}.json` |
| `static/data/iss-modules.json` / `static/data/tiangong-modules.json` (any new id) | `i18n-src/en-US/{file}/{id}.json` |
| `static/data/launches.json` (any new id) | (no overlay required — schema is monolingual) |

`validate-data` enforces this at preflight (and pre-push) — missing overlays will fail before push. Other locales fall back to en-US, so en-US alone is enough to ship; translations follow in a separate commit per the i18n pipeline. **History note:** GH #83 (May 2026) shipped 11 constellation entries without overlays, causing CI e2e failures + a follow-up fix commit. Layer 1 validator (added that same day) prevents recurrence.

---

## Image pipeline — gotchas

> **Full pipeline reference:** [`scripts/IMAGE-PIPELINE.md`](scripts/IMAGE-PIPELINE.md) — end-to-end flow, every script's role, the "Adding a new gallery image" runbook, worked example, ADR cross-refs. Sub-pipeline READMEs: [`scripts/vision/README.md`](scripts/vision/README.md) (WebP ladder + vision) · [`scripts/hotspots/README.md`](scripts/hotspots/README.md) (surface deep-zoom). This section is **the gotchas** (what NOT to do); read those for the happy path.

**Display images are WebP, derived from `masters/` (RFC-030 / ADR-080) — the biggest trap.** Served display images are WebP-only (`NN.webp` base + `NN-<w>.webp` rungs), derived by `scripts/vision/build-display-ladder.mjs` from the git-LFS **`masters/`** store (`git lfs pull -I 'masters/**'` to smudge). **Never hand-place a display `.jpg` under `static/images/`** — it fails the ladder-contract test. A source `.jpg` goes to `masters/<rel>/` (drop `static/images/`, prepend `masters/`); the served tree gets `.webp`; `hotspots/` + `posters/` are the only `.jpg` survivors. Consequences learned in the 2026-07 main→mobile rebase:
> - **Any image that enters outside the fetch pipeline** (hand-added, or merged/rebased from a pre-WebP branch) needs the full derive: move `.jpg` → `masters/`, run `cap-display-images` + `build-display-ladder`, merge + rekey its provenance (`rekey-provenance-webp.mjs`, keyed on the `.webp` path), rebuild counts. 0.7.3 shipped 30 gallery `.jpg`s that arrived on the WebP branch with no masters/tiers/provenance.
> - **`rebuild-gallery-manifests.ts` counts `NN.webp`, not `NN.jpg`** (fixed 2026-07-10 — it was writing `0` for every gallery post-#383). `validate-gallery-counts` is the webp-aware oracle; keep the rebuilder matched to it.
> - **A rebase drops mobile-only files silently.** Resolving binary image conflicts to the overhaul branch can lose `.1x1` thumbnails + hotspot tiers that exist only there; after a big rebase, `git diff --diff-filter=D <backup> HEAD -- static/images` and restore.

**Never run a whole-file regenerator to add a few images — they DEGRADE on LFS stubs.** `scripts/build-image-provenance.ts` and `scripts/compute-phash.ts` **rewrite their entire output file** by walking `masters/`, which is `fetchexclude`d (`.lfsconfig`) — so on any un-pulled tree every master is a ~130-byte pointer stub. Running either then silently rewrites the file *degraded*: the 2026-07-20 incident lost **64,858 lines** of real credits from `image-provenance.json` ("walker-fallback" everywhere) and collapsed `image-phashes.json` **2560 → 5**. To add N images, **edit the N rows surgically** in the per-image data files (`fleet-image-sources.json` sidecar, `image-phashes.json`, `image-provenance.json` keyed by `.webp` path but id-hashed on the `.jpg` path, `image-ladder.json` — **merge**, preserving its pretty-print). A full rebuild is legitimate **only** after `git lfs pull -I 'masters/**'` (+ online Commons for provenance). Both scripts now **guard**: compute-phash aborts if sampled masters are stubs; both refuse to write output that drops >10% of existing entries (`--allow-shrink` to override). And always **`git diff --numstat`** a regenerated data file before staging — a `+80 / −64858` is a stop sign, not a commit.

**Staging ground (RFC-029 / #363).** New image fetches do NOT ship straight to the site. `fetch-assets.ts` stages by default: gallery-slot downloads (`/images/<category>/<id>/<NN>.<ext>`) land in `static/images/_staging/` (gitignored, **not** on `/credits`, pruned from the prod build) and gallery-count manifests are left untouched. Review + ship them at **`/dev/staging`** (dev-only): filter, bulk-mark Promote/Prune, then "Apply marked actions" — promote moves the file into the shipped tree, appends it to `image-approved.json` (the durable allowlist), and bumps the id's gallery count to its contiguous main-slot count. `/credits` + `build-image-provenance.ts` intersect the allowlist (scoped to `/images/`; logos/textures bypass), so an unapproved/staged image can never be credited and a used one can never be silently dropped. After promoting, run `npm run build-image-provenance` (add `--offline` to skip the Wikimedia enrichment, which can hang) to credit it. `--no-stage` on `fetch-assets` restores the legacy write-straight-to-main behaviour. Never hand-move images between `_staging/` and main + counts yourself — moving *middle* gallery slots out is how galleries end up with 404 gaps; use the review surface.

**Native-language sourcing for non-Western agencies (MANDATORY, 2026-06-29).** When re-sourcing imagery for a non-Western agency, search the **agency's native-language** Wikipedia/Commons FIRST — English-keyword Commons search returns garbage for sparse-coverage entities (Taiyuan LC-9 in English → CRS PDFs + Alaska sounding rockets; in Chinese `太原卫星发射中心`/`长征四号` → real CC-BY-SA Long March 4 launch photos credited to 中国新闻社). Two API paths: (1) Commons `list=search&srnamespace=6` with native keywords; (2) the native-lang Wikipedia article's `prop=images` (embedded files are Commons-hosted + freely licensed). Order: **native-language Commons/Wiki → English → generic-but-honest** (real-but-not-pad-specific, captioned honestly) as last resort. Per agency: CMSA/CASC → `zh.wikipedia.org`; Roscosmos → `ru.wikipedia.org`; JAXA → `ja.wikipedia.org`. Still enforce the freely-licensed bar (CC/PD only — local-Wikipedia fair-use uploads are NOT usable) AND the no-text/no-watermark/no-logo bar: many CC-BY-SA Chinese launch images are broadcaster video-frame grabs (中新视频 watermark + baked captions) — reject those. This is NOT "web-searching for image URLs" (forbidden) — it's the curated Commons/Wikipedia API in another language.

The image sourcing + dedup + attribution pipeline has four parts that have to stay in lockstep. Skip any of them and you'll re-learn one of the bugs below.

**Sidecar surface routing.** Each surface has a specific sidecar manifest:

| Surface | Sidecar | Key shape |
|---|---|---|
| `missions/` | `static/data/mission-image-sources.json` | `<id>/<slot>` (no ext) |
| `fleet-galleries/` | `static/data/fleet-image-sources.json` | `<id>/<slot>.jpg` |
| `moon-sites/` / `mars-sites/` / `earth-objects/` | `static/data/panel-image-sources.json` | `<surface>/<id>/<slot>` (no ext) |
| `iss-modules/` | (none — `buildIssEntries` walks disk + uses `WIKIMEDIA_ISS_MODULE_GALLERY` constants in `scripts/fetch-assets.ts`) |
| `tiangong-modules/` | (none — `buildTiangongEntries` walks disk + uses `WIKIMEDIA_TIANGONG_*` constants) |
| `rockets/`, `science/` | (none — credits-grouping path prefixes only; not gallery-loaded) |

**Routing a file to the wrong sidecar produces a duplicate manifest entry** because two code paths in `scripts/build-image-provenance.ts` cover the same file. June 2026 example: `scripts/backfill-sidecar-from-report.ts` routed `iss-modules/unity/0X.jpg` to `panel-image-sources.json` AND `buildIssEntries` walked it from disk → two entries → `validate-data` failed with `duplicate manifest entry`. Backfill now refuses to route iss-modules/tiangong-modules.

**Cache-staleness after slot rename.** `static/data/image-phashes.json` is the on-disk pHash cache, keyed by URL path. Renaming `unity/03.jpg → unity/02.jpg` does NOT update the cache key — the cache still says `/images/iss-modules/unity/03.jpg → <old hash>`. Any subsequent fill-script run loads that stale cache into its localCache for the entity and lets near-duplicate candidates through the source-time pHash guard. **Always run `npx tsx scripts/compute-phash.ts --force` between `delete-intra-entity-dupes` and any fill script.** Round 1 of D shipped 26 residual dupes because this step was missed.

**Walker-fallback agency lookup.** `scripts/build-image-provenance.ts buildWalkerFallbackEntries` (line ~2375) generates a manifest row for every disk file not covered by a declared source. The `agency` field comes from a catalog lookup (missions/index.json, fleet-image-sources, earth-objects.json, moon-sites.json, mars-sites.json) before falling through to the surface default. If the surface default fires for a non-NASA entity, /credits will incorrectly attribute the photo to NASA. Keep the per-catalog HUMAN map in sync with whatever name conventions the catalog uses (`ROSCOSMOS` ALL-CAPS vs `Roscosmos` proper-case is the gotcha — `scripts/build-image-provenance.ts loadMissionAgency` has fallbacks for legacy ids not in `missions/index.json`).

**pHash baseline snapshotting.** `scripts/snapshot-phash-baseline.ts` writes the residual pairs that pass through to `static/data/phash-baseline-allowlist.json`. It MUST read `INLINE_ALLOWLIST` from `scripts/validate-image-phash-dupes.ts` and exclude those pairs — otherwise re-running the snapshot after categorisation re-bloats the baseline JSON with the same pairs you just moved inline. The snapshot script parses the TS source as text for the keys; this is brittle but avoids a circular import.

**Gallery count manifests** (`static/data/fleet-galleries.json`, `mission-galleries.json`) are `<id, slot-count>` maps the gallery loader uses to enumerate URLs. **Drift produces silent 404s** when manifest > disk, or hidden images when manifest < disk. `validate-gallery-counts` (in preflight as of 2026-06-14) catches drift. If you ever delete or rename gallery slots, sync the count manifest in the same commit.

**Spacecraft anatomy art is a SEPARATE pipeline** — AI-generated watercolor cutaways / pencil sketches under `static/images/anatomy/*.webp`, surfaced on the fleet DETAIL tab + `/colophon` (#367). To generate more **without style drift**, follow [`docs/anatomy-art-runbook.md`](docs/anatomy-art-runbook.md) — the verbatim prompt recipes, fixed model/aspect, reference-image anti-drift, the auto-derived `anatomy-ids.json` manifest, and the remaining-craft list. Do NOT hand-edit `src/lib/anatomy-ids.json` (regenerated by `scripts/build-anatomy-webp.mjs`).

**Orbital surface imagery is its OWN sub-pipeline under `scripts/hotspots/` (#309/#360)** — HiRISE/CTX crops for Mars landing zones AND along rover traverses, run under Node 20 (`~/.nvm/versions/node/v20.20.2/bin/node`, needs gdal-async binding `node-v115`). Key scripts: `fetch-mars-traverse.ts` (samples stops + ~0.5 km along `<rover>.json`, magnifies each by tpos M≈22×, crops 512 m HiRISE @1024², writes `static/data/mars-traverses/<rover>.route-patches.json`, and **self-credits** provenance via `buildHiriseProvenanceEntry` + `upsertProvenanceEntries`); `fetch-mars-ctx.ts` (`cropCentre` = arc-length midpoint of the traverse → one regional CTX patch); `backfill-imagery-provenance.ts` (one-shot — patches existing entries' spacecraft fields + mints route-patch provenance from manifests). Provenance entries carry `spacecraft_id` / `spacecraft_name` / `instrument` (declared in `static/data/schemas/image-provenance.schema.json` — `additionalProperties:false`, so any new field MUST be added there or `validate-data` fails). `/credits` groups by `provenanceSourceId` (`src/lib/credits-grouping.ts`): `instrument==='HiRISE'→'nasa-hirise'`, `'CTX'→'nasa-ctx'`, each its own section (labels in `static/data/source-logos.json`), with a 📡 spacecraft chip linking to `/mars?site=<spacecraft_id>`. Rovers wired: Curiosity, Perseverance, Opportunity, Spirit, Zhurong. Polylines are V1 approximations (#362); Moon equivalent is #361.

**Moon REGIONAL layer = Kaguya TC, monoscopic-first (#361).** The Moon has no global CTX-style mosaic. The 12 detail-only landers (Luna 9/16/17/21/24, Chang'e 3/4/5/6, Chandrayaan-3, SLIM, Beresheet) get their CTX-equivalent regional patch from JAXA's **SELENE (Kaguya) Terrain Camera** via `scripts/hotspots/fetch-moon-kaguya-regional.ts`: STAC-search the USGS Astrogeology ARD collections (`kaguya_terrain_camera_{monoscopic,stereoscopic,spsupport}_uncontrolled_observations`) by bbox, `gdal /vsicurl/` **window-crop** a 2560² (~16 km) patch from the public S3 COG (`image` asset, ~6–12 m/px) — no full-file downloads. Writes `tier2-regional.jpg` + self-credits `buildKaguyaTcProvenanceEntry` (JAXA, `JAXA-OPEN`, `instrument:'Kaguya TC'`). `/credits` routes `instrument==='Kaguya TC'→'jaxa-kaguya-tc'`. **CRITICAL — `rankScore` weights collection ×1e6 so MONOSCOPIC always wins:** monoscopic is the nominal full-MTF mapping product (genuinely sharp at its GSD); stereoscopic/**spsupport** (Spectral-Profiler support) frames are off-nominal and SOFT — a crop from one is full pixel-count but reads like an upscaled thumbnail (the "pixelated /moon" bug). Only luna9/16/17 have no monoscopic coverage → stereoscopic fallback. Adding the regional source flips `haloHasRegional` (selection bracket sizes to the 3.0u patch).

**Moon DETAIL layer = LROC Featured Images + guard + Kaguya failover (B+C, #361).** There is **no programmatic sharp NAC** for these sites — verified: USGS STAC has no NAC collection, ODE `SDPPHO` (map-projected NAC) returns 0 at every robotic site (99 at Apollo), only raw `EDRNAC4` (~1 m/px) which needs ISIS map-projection (not installed). So `scripts/hotspots/fetch-moon-featured-images.ts` downloads LROC's published **Featured Images** (pre-cropped annotated PNGs from lroc.im-ldi.com, hand-typed URLs) and: (1) **orbital-surface guard** — rejects any crop >40 % near-black (a hardware/studio photo has a black background; orbital terrain doesn't — this is what caught luna17 once shipping a *rover photo*); (2) **Kaguya failover** — a guard rejection / download failure / no-Featured-Image site (luna9) copies that site's Kaguya regional as the detail (softer but real, never the wrong subject). Provenance: `buildLrocProvenanceEntry` (NASA/GSFC/ASU) for Featured, `buildKaguyaTcProvenanceEntry` for failover. Apollo + 4 mare-region sites instead use curated BDR NAC ROI ids in `lroc-products.ts` (`fetch-moon.ts`, no ISIS). Co-scale extents (`hotspot_tier2_ground_m` + `_regional_ground_m`) are authored for all 17 Moon Tier-2 sites so the detail patch sizes to a small window → Mars-style progressive zoom flow.

**Moon TRAVERSES + along-route imagery (#361).** Five rover drives — Lunokhod 1 (luna17), Lunokhod 2 (luna21), Yutu (change3), Yutu-2 (change4), Pragyan (chandrayaan3). `scripts/hotspots/build-moon-traverses.mjs` writes V1 `moon-traverses/<rover>.json` polylines (procedural, anchored at real landing coords, honest V1 stub like Mars); `getMoonTraverse` + `/moon`'s `loadMoonTraverses` wire them into the same planet-agnostic `loadTraverses` path Mars uses. `scripts/hotspots/fetch-moon-traverse.ts` (the lunar `fetch-mars-traverse`) samples each polyline and crops a Kaguya patch per sample → `moon-traverses/<rover>.route-patches.json`. The magnified-traverse render (magnification reads `hotspot_tier2_regional_ground_m`) is shared with Mars — it just needed the Moon ground extents + the prop.

**Surface select-landing zoom + Tier reveal + blink (#361).** Selecting a surface site flies to `faceCameraAtSite` default `targetR = 37` (was 50 — landed before the regional ramp started → bare globe). Regional ramp `regionalFadeStart 44 → 33` (was 50→33), detail `33 → 30.32`, flat-patch `30.1`; both `regionalFadeStartTop` (labels) and `regionalFadeStart` (patch) must stay in lock-step. The closer landing exposed an LRU-thrash blink: at camR 37 most of a body's hotspots project past the tier threshold at once, so `HOTSPOT_LRU_CEILING` (was 16) capped them and the LRU demoted+re-promoted 2/frame → `fadeProgress` reset every frame → the tier-2 patch flickered. Raised to **28** (clears moon's 18 + mars's 13). `image-provenance.json` is a concurrent-write hotspot — `build-image-provenance.ts` preserves existing covered entries but a parallel run can clobber fresh upserts via a load-snapshot race; re-run + verify before committing.

**MANDATORY — re-fetching a hotspot base image MUST regenerate its variants (the half-baked-tile trap, 2026-06-26).** The /moon + /mars deep-zoom DETAIL + REGIONAL patches (both the 3D sphere quad in `hotspot-surface-patch.ts` AND the 2D `SurfaceFlatPatch.svelte`) resolve their texture through `image-vision.json`'s `variants['1x1']` (`pickVariant(entry, 'thumbnail')`), falling back to the raw `hotspot_tier2_source` path **only when that variant is empty/absent**. The fetch scripts (`fetch-moon-featured-images.ts`, `fetch-moon-kaguya-regional.ts`, `fetch-mars-*.ts`) write **only the 2048² base `.jpg`** — they do NOT regenerate the `.1x1` variant. So if you re-point or re-fetch a base image and stop there, the manifest keeps pointing at the now-stale (or now-missing) `*.1x1.jpg`: the loader 404s and the patch renders an **empty placeholder tile at deepest zoom** (this bit us on 6 re-pointed moon sites — change3/4, luna16/17/21/24 — after the 2026-06-25 clean-frame swap). After ANY hotspot base change, you MUST run:

```bash
node scripts/hotspots/regenerate-tier3-variants.mjs static/images/hotspots/<body>/<site>/tier2-lroc.jpg [...more bases]
```

(despite the `tier3` name it regenerates the `.1x1` variant — the **only** ratio we generate since 2026-06-26, when `4x3`/`16x9` were retired as dead code; see §"Variant policy" below — for any base via the same `generateVariants()` the vision step uses; no vision-API cost, no manifest rewrite; the manifest already references the path). The `1x1` is what the surface scene consumes; the regional layer falls back to the base when its `1x1` is absent, but regenerate both layers' bases for consistency. **This is now gated:** `validate-data.ts` mirrors the runtime resolve for every `surface-hotspots.json` Tier-2 source and fails preflight if a consumed variant is missing on disk — so a half-baked re-fetch can no longer reach origin. Don't `--no-verify` past it; run the regenerate command it prints.

**Variant policy — `1x1` is the only ratio we generate (2026-06-26).** The image pipeline used to emit three crops per base (`1x1`, `4x3`, `16x9`) — `pickVariant`'s `thumbnail`/`card`/`hero` surfaces. Only `thumbnail`→`1x1` was ever wired: every `pickVariant` call site in `src/` passes `'thumbnail'`, and the surface scenes read `1x1` exclusively. `4x3`/`16x9` were 494 dead files + ~1k dead `image-vision.json` refs that regenerated on every run. Retired: `VARIANT_RATIOS` in `scripts/vision/crop-variants.ts` is now `[1x1]` (the single lever — feeds `build-manifest.ts`, `score-images.ts`, `regenerate-tier3-variants.mjs`); `pickVariant` returns `undefined` for non-thumbnail surfaces (caller falls back to the raw source path, which is the correct full-res image anyway). To re-introduce an aspect crop, add it back to `VARIANT_RATIOS` **and wire a real consumer first** — don't let it become dead output again. Note: `/textures/*.4x3.jpg` + `*.16x9.jpg` are a SEPARATE pipeline (planet-texture cards on `/credits`, still consumed) and were intentionally left alone.

**Tier-3 panoramas (`tier3-pan.jpg`) — padding, centering, gap recovery (2026-06-28).** Surface panoramas are partial-FOV strips padded to 4096×2048 equirectangular by `scripts/hotspots/panorama-padder.ts` (driven by `fetch-{moon,mars}-panoramas.ts`; sources cached in `.image-cache/hotspots/panoramas/`, so a re-pad is **offline** — no network). Sky above the horizon = gradient (black for the Moon); ground below the source band = **regolith fading to shadow toward the nadir** (`groundColourAtRow`, `NADIR_DARKEN=0.84`) — NOT a flat grey slab. The straight-down nadir is genuinely unimaged by mast cameras, so it MUST be synthetic; gradient-to-shadow is the honest fill (a flat slab reads as a dead void). Each site's real vertical extent is `srcElevationTopDeg/BottomDeg` — these should match the source's **isotropic vFOV = (srcH/srcW) × azimuthDeg**, split at the source's horizon row. Under-setting them squishes AND crops the source (change4 was ±11° vs a real ±~44°, cropping the lander deck into a thin band; corrected to 9/36 → gap 79°→54°). To recover a gap: open the cached source, confirm real below-horizon content exists, set `bottom` to the true horizon split, re-pad — but the implied vFOV is only valid for clean cylindrical sources; stitched mosaics (most Mars pans) give >90° nonsense, so tune those by eye, not formula. The skybox opens centred on **yaw 0 (= panorama centre) / horizon** when entered without a `?pano=` deep-link (`enterPanorama` in `SurfaceScene.svelte`) — never inherit the oblique orbital camera angle. Sites with no distinct surface panorama (beresheet/change3/luna16) ship a `tier3-pan` phash-identical to `missions/<id>/01.jpg` by design → allowlist the pair in `validate-image-phash-dupes.ts`.

**Provenance/attribution verification — targeted, never a full rebuild.** The fetch scripts (`fetch-*-panoramas.ts`, `fetch-{moon,mars}-traverse.ts`) **upsert their own provenance entries** (`upsertProvenanceEntries`) as they run, so freshly-fetched images are already credited. Do NOT run `build-image-provenance` to "check" a handful of changes — it re-hashes all ~9,600 images, is slow (minutes), and rewrites the whole file (churning other agents' entries + risking the clobber race noted above). The read-only gate is **`npm run validate-data`**: it validates every provenance entry's license/attribution/on-disk/no-dupes + phash near-dupes + gallery counts without writing anything — that is how you confirm "everything added/deleted is covered," for the whole repo, not just your own files. To scope-check yourself, diff changed image paths against `image-provenance.json` paths **and** `static/data/original-work.json` — generated/AI art (mission trajectory thumbnails, `/posters`, anatomy webp) lives in original-work, NOT provenance, so its absence from `image-provenance.json` is expected, not a gap. phash-dupe allowlist additions auto-land up to **5 per branch** (`validate-allowlist-discipline`); beyond that needs an `ALLOWLIST_AUTHORIZED` token in the commit message.

---

## Mobile-first rules

Design at 375px first. Desktop is progressive enhancement.

```css
/* correct — mobile base, desktop enhancement */
.panel { position: fixed; bottom: 0; width: 100%; }
@media (min-width: 768px) { .panel { right: 0; width: 314px; top: 52px; bottom: 0; } }

/* wrong — desktop base, mobile override */
.panel { position: fixed; right: 0; width: 314px; }
@media (max-width: 767px) { .panel { bottom: 0; width: 100%; } }
```

Touch targets: minimum 44×44px. Three.js screens: single-finger orbit, two-finger zoom. Bottom sheet dismisses with swipe-down.

---

## Physics — do not change without ADR

All orbital mechanics use Keplerian two-body formulation. Constants from IAU:

```typescript
const MU_SUN      = 4 * Math.PI ** 2  // AU³/yr²
const AU_TO_KM    = 149597870.7        // IAU 2012
const AU_TO_LMIN  = 8.317
const AUPYR_TO_KMS = 4.7404

function keplerPos(a: number, e: number, L0: number, T: number, t: number) {
  const nu = L0 + (2 * Math.PI / T) * t
  const r  = a * (1 - e*e) / (1 + e * Math.cos(nu))
  return { x: Math.cos(nu) * r, y: Math.sin(nu) * r, r }
}

function visViva(a: number, r: number): number {
  return Math.sqrt(MU_SUN * (2/r - 1/a)) * AUPYR_TO_KMS
}
```

Transfer arc: Keplerian half-ellipses, not Bezier. Do not replace. 3D scene units: AU. Do not mix pixel scale.

---

## Performance — 3D scene discipline (do not regress)

The `/earth /moon /mars /iss /tiangong /explore /fly` scenes are GPU- and main-thread-sensitive. A v0.7 regression made planets take *seconds* to load and leaked *multi-GB* of GPU memory that throttled the whole app (post-mortem + deferred follow-ups: issue #364). These are hard rules — breaking one degrades every page, not just the route you touched:

1. **Teardown MUST release the WebGL context.** `renderer.dispose()` frees Three's bookkeeping but NOT the GL context — you must also call `renderer.forceContextLoss()` on unmount. Use the shared `disposeSceneRenderer` (`src/lib/three/scene-renderer.ts`), or mirror it on routes that build their own renderer. Skipping it leaks the context (Chrome pools them) → GBs of GPU pressure that throttles *every* page. Verify: a `webglcontextlost` listener fires on navigation away.

2. **Dispose textures, not just materials.** `material.dispose()` does NOT free its bound textures. Use `disposeObject3d` / `disposeScene` (`src/lib/three/dispose-object3d.ts`) which dispose the map slots too. Guard async `TextureLoader.load` callbacks against teardown-in-flight (drop the texture if the owner was disposed).

3. **Load heavy imagery lazily + per landing zone — NEVER eagerly at mount.** Tier-2 / panorama / route-patch textures (multi-MB each) build only for the zone you actually zoom into or select — tier-2 via the LOD dispatcher's on-promotion `ensureTierBuilt`, route patches on rover select. Building all sites' imagery at mount floods network+GPU and stalls first paint. The base planet texture loads 2K first, 4K on zoom — keep it that way.

4. **No allocations in the animate/rAF loop.** No `new THREE.*`, `Array.filter`, `new Map`, `querySelectorAll`, or JSON ops *per frame* — hoist or cache them. Per-frame allocations cause GC hitches.

5. **Prove perf changes with measurements.** `tests/e2e/surface-mount-perf.spec.ts` is the guard: mount-time hotspot image requests must stay ~0 and time-to-interactive under a few seconds. Measure before/after in Playwright's OWN clean browser — the dev / chrome-devtools-mcp browser gets bogged by accumulated GPU pressure and can't measure reliably (and HMR can't reclaim already-leaked contexts; restart Chrome to clear). Watch live GPU counts via `?debug=1` → Render tab (GPU textures / geometries — they should be bounded, not climbing).

---

## Debugging — `?debug=1` is the in-app inspector

Every route surfaces a built-in DebugPanel when you append `?debug=1` to the URL (e.g. `/fly?debug=1`, `/mars?debug=1`, `/?debug=1`). Mounted from the root layout (`src/routes/+layout.svelte`) via Svelte context, so it's available on every page. Use it instead of bolting on ad-hoc `console.log` calls or one-off panels.

**Saving screenshots.** The `chrome-devtools` MCP screenshot tool can only write inside the repo workspace root, so capture to a repo-local temp path (e.g. `.shots-tmp/`) and then **copy any keepers to `~/Desktop/`** — Marko's convention for screenshots he wants to hold onto. Delete the repo-temp copies afterwards so nothing untracked is left in the working tree.

Tabs:

- **Page** — page-specific instrumentation. Only shown when the route registered content (today: `/fly` exposes the 2D `FlybyDebugViewer` for camera-math iteration). Add this tab to a page when you're solving a hard visual / spatial / interaction problem that's faster to debug against a derived 2D / numeric view than in the live 3D scene.
- **Perf** — live FPS + frame time. Use when you're investigating perceived jank or a quality-tier downgrade. Stub for rolling avg / low-1% — extend it when needed rather than spinning up an external profiler for routine work.
- **i18n** — current locale + (stub) key-resolution warnings. Extend when triaging translation regressions.
- **Route** — `pathname` / `search` / `hash`. Useful when chasing a routing or deep-link bug.

Wiring a page-specific tab:

```svelte
<!-- in your page -->
<script lang="ts">
  import DebugPanelRegistrar from '$lib/components/DebugPanelRegistrar.svelte';
  // ...
</script>

<!-- label-only (header shows "DEBUG · MARS", no Page tab) -->
<DebugPanelRegistrar label="MARS" />

<!-- with a Page-tab snippet (e.g. /fly + FlybyDebugViewer) -->
{#snippet pageDebugContent()}
  <MyPageInspector ... />
{/snippet}
<DebugPanelRegistrar label="FLY" content={pageDebugContent} />
```

The registrar handles cleanup on navigation — no stale labels leak across routes. Context lives in `src/lib/components/debug-panel-context.ts`; panel in `src/lib/components/DebugPanel.svelte`.

**Use this proactively.** When you hit a visual or timing problem that's hard to reason about in the live scene — camera math, spatial composition, animation phase, perf jank, locale bleed, deep-link state — your first move should be: can I add a Page tab here, or extend Perf/i18n/Route with the signal I need? Expand the panel's stubs (perf rolling avg, i18n missing-key list, route history) as you fix issues rather than reading them in isolation. A growing debug surface is the whole point — each iteration teaches the next agent how the system actually behaves.

Generic pages (no `DebugPanelRegistrar`) still show Perf / i18n / Route — you don't have to opt in to get the baseline.

---

## Adding any card / entity — universal invariants

Before the specific checklists below (flyby body, mission, science overlay, fleet row), every new card / entity / catalog entry **must** clear these five gates. They exist because we've shipped — repeatedly — entries that lived as bare stubs for months: empty galleries, English-only labels, no learn-link, no cross-reference to the parent body. The 2026-06-17 mission-image inventory surfaced 8 missions (opportunity, spirit, mariner9, phoenix, magellan, akatsuki, osiris-rex, dart) in exactly this state. Don't add the ninth.

> **Adding a mission specifically:** follow the [mission-addition runbook](docs/guides/mission-addition-runbook.md) — the ordered touchpoint checklist (base record · index · en-US overlay · LEARN links · fleet-refs + symmetry · optional flight/waypoints · mandatory hero image · translations), with `npm run validate-data` as the interactive done-signal. Worked example: Artemis 4.
> **Adding a fleet asset** (launcher / spacecraft / station / lander / …): follow the [fleet-addition runbook](docs/guides/fleet-addition-runbook.md). A mission that references a not-yet-existing fleet id must author it here first — **never stub it** (an agent can fan out one fleet sub-agent per missing asset). Worked example: SLS Block 1B.
> **Adding a destination / flyby body** (a mission to a body that isn't in the catalog yet — the dest-body cascade): follow the [flyby-body-addition runbook](docs/guides/flyby-body-addition-runbook.md). Worked example: Arrokoth.
> **Adding a site story** (a mission/site narrative sidecar): follow the [site-story-addition runbook](docs/guides/site-story-addition-runbook.md).

For every new card, in the same PR, you ship:

1. **i18n translations across all 14 locales.** English-only is not "shipped". The catalog of locales lives in `messages/*.json` (the bundle) and `i18n-src/<locale>/<surface>/<id>.json` (per-entity overlay). Use the per-surface translation scripts (`scripts/translate-*.mjs`) or the `wave23/` toolchain pattern (catalog → maps → apply-translations) — never hand-translate. Validation: `npm run validate-data` fails closed on missing locale rows for tracked entities (per ADR-069 / [overlay-completeness](docs/adr/ADR-069.md)).

2. **Image sourcing with provenance + credits — agency archives first, Commons last.** No card ships with a placeholder hero or zero-slot gallery. Source via the **agency-first** pipeline: NASA images-api → JPL Photojournal → JAXA → ESA → JHU APL → CNSA/Roscosmos/ISRO/SpaceIL → **Wikimedia Commons only as failover**. Full source-order table + rationale in [`scripts/IMAGE-PIPELINE.md` §"Source-resolution order"](scripts/IMAGE-PIPELINE.md#source-resolution-order--agency-archives-first-commons-last). Every disk file gets a TASL row in `image-provenance.json` (ADR-047), every sidecar entry gets `credit` / `license` / `fetched_at`, every count manifest gets bumped. If imagery genuinely doesn't exist for the entity, ship an honest caption (memory `feedback_ship_all_with_honest_captions` — single-frame / descent-frame with text beats graceful-absent button) — never a silent gap.

3. **External link sourcing with provenance.** Every card surfaces at least one outbound learn-link (mission page on the agency site, paper, encyclopedia entry). Links go through `static/data/link-provenance.json` per ADR-051; `scripts/build-link-provenance.ts` validates each URL resolves and records the source. No dead links, no Wikipedia-only stub when the agency hosts a canonical page.

4. **Cross-link to neighbours.** The card must reference, and be referenced by, every related entity:
   - **Parent body** (mission → planet/moon/asteroid; surface site → parent body; spacecraft → mission)
   - **Agency** (every entity has an `agency` field consumed by `/credits` walker-fallback — keep `Roscosmos` vs `ROSCOSMOS` consistent per [§"Image pipeline — gotchas"](#image-pipeline--gotchas))
   - **Sibling missions** (Mars rovers cross-link Sojourner → Spirit → Opportunity → Curiosity → Perseverance; Apollo missions cross-link the previous + next flight; Mercury Seven cross-link to the other six)
   - **`/explore` iconic-trajectory** entry if the body is reachable (mission → iconic-trajectory; surface site → exploration entry)
   - **Tour stage** if the entity appears in any narrated episode (mine SSML per memory `feedback_tour_stage_authoring`)

5. **No-stub validation.** `npm run validate-data` runs the per-surface completeness gates: `validate-gallery-counts`, ADR-069 overlay completeness, link-provenance resolution, i18n bundle coverage. **All must pass before push.** If a new entry slips through because a gate doesn't yet check it, add the gate in the same PR. Coverage is a one-way ratchet.

**Honest exceptions.** If an invariant genuinely can't be met (e.g. no public imagery exists, no agency learn-page yet) document it inline in the entity JSON with `"_known_gaps": ["images", "agency_link"]` and an explanation — and open a tracking GitHub issue. The gap is now legible to the next agent instead of looking like neglect. The "global space programs" mandate (memory `feedback_global_space_program_representation`) means CNSA / ISRO / JAXA / Roscosmos / ESA / SpaceIL entities get the same five-invariant treatment as NASA — actively surface them, don't default to NASA-only.

---

## Adding a new flyby body to `/fly` — repeatable checklist

Use this when adding a new destination (planet / dwarf / comet / asteroid / KBO) so its flyby beat composes an iconic hero shot. Three worked examples in order of increasing scope:

- **Arrokoth (commit `e6e9175b`)** — single-body, end-to-end. Read this diff before starting; everything below is a checklist to grind through.
- **Halley + 67P (commit `3c1e6938e`)** — comet pair with the synonym-label workaround ("Churyumov" → '67p').
- **#341 Batch 5 (commit `91b8ed0db`)** — 10 bodies in one sweep (Dimorphos + Didymos + 7 Lucy Trojans + Itokawa). Proves the pattern batches efficiently: each touchpoint file gets all 10 entries at once. Also: file-rename gotcha — mission JSONs must move to `static/data/missions/<dest_lowercase>/{id}.json` when `dest` changes, otherwise the runtime loader 404s.

Issue [#341](https://github.com/chipi/orrery/issues/341) (13 missions) is closed by the 6 commits between `064d37bf8` and `91b8ed0db`.

Per-body steps (numbered to match TA.md §body-wiring):

1. **Orbital data** → `static/data/small-bodies.json` entry
2. **`DestinationId`** widening → `src/lib/lambert-grid.constants.ts`
3. **`PLANET_SIZES`** → `src/lib/orbital/find-flyby-planet.ts`
4. **Label parser** (`findFlybyPlanetFromLabel` + `findClosestPlanetToShip`) → same file. Add a synonym branch for ambiguous data labels (e.g. "Churyumov" → '67p')
5. **`PlanetId` union + `PLANET_COMPOSITION`** → `src/lib/orbital/flyby-camera-plan.ts`
6. **`DEST_STYLE` + `bodyTextures` slot** → `src/lib/three/fly-helio-scene.ts`
7. **`labelToPlanetId` + `FLYBY_RADIUS_AU`** → `src/lib/fly-mission-apply.ts` — **critical**: this remaps trajectory.json waypoints through `destinationPos()` so the ship glyph coincides with the destination mesh. Skip it and the ship sits at the raw trajectory coords 20+ AU off-axis from the iconic frame
8. **`NON_CONTEXT_BODIES`** → `src/routes/fly/+page.svelte` (secondary-flyby destinationMesh swap)
9. **Debug-panel `planetIdGuess`** loop → same file
10. **`DESTINATION_LABEL_COLORS`** → `src/lib/fly-scene-constants.ts`
11. **`/plan` label switch case** → `src/routes/plan/+page.svelte`
12. **14-locale messages** → `messages/en-US.json` + 13 other locales (use the Python pattern from the Arrokoth commit for the non-English transliterations)
13. **i18n overlay** (optional) → `i18n-src/en-US/planets/{id}.json`
14. **Tests** → `find-flyby-planet.test.ts` — move new body out of "returns null" + add positive case
15. **Browser-verify** → load a mission that flies past the body at its iconic MET, confirm composition

Don't skip #7. It's the most subtle one and the most common reason a newly-wired body still renders as empty space.

---

## Race-free `/fly` test hooks — when chrome-devtools-mcp shares its browser

If a second Claude Code session is using chrome-devtools-mcp on the same Chrome instance, click/scrub events race the automation (the other agent's pause toggles flip your pause back to play, scrubbers reset between your event and your screenshot). Symptom: simDay sticks at DAY 1 or jumps to DAY {arrival} regardless of what you commanded.

Three workarounds, in increasing isolation:

1. **Ask the user to pause the other session for 60 seconds.** Cheapest if available.
2. **Use the race-free hooks** (DEV-only, no production surface):
   - `window.__flySetSimDay(metDays)` — sets simDay + pauses. Skips `biasJumpToIconicMoment` / 700 ms snap-cut / peakHold clearing — all upstream input concerns. Everything downstream (auto-zoom lerp, scene render, hero detector) runs identically to a real user landing at the same MET.
   - `window.__flyCislunarDebug()` — mirror of `__flyDebug` for cislunar missions (which `__flyDebug` is gated out of). Returns `{simDay, depDay, met, isMoonMission, cislunarTrajectory.phases, closestApproachKm, camPos, camTarget, camR, autoZoomActive, lastAutoZoomPhase, moonInScenePos, spacecraftPos}` — lets you observe internal cislunar state without spelunking Three.js refs.
3. **Add a similar hook** if your test needs a state path the existing two don't cover. Keep it DEV-gated (`if (import.meta.env.DEV)`) — production never sees it.

Workflow that proved out on Apollo 13 / 17 verification under contention:
```js
await new Promise(r => setTimeout(r, 6000));  // ride out the opening sequence
window.__flySetSimDay(3.13);
await new Promise(r => setTimeout(r, 10000));  // give auto-zoom lerp time to converge
return window.__flyCislunarDebug();
```

---

## Testing rules

**Unit tests** (Vitest, colocated): every function in `src/lib/orbital.ts` must have tests. Physics functions are the highest-priority testing surface.

```typescript
// src/lib/orbital.test.ts
it('Earth at 1 AU ≈ 29.78 km/s', () =>
  expect(visViva(1.0, 1.0)).toBeCloseTo(29.78, 1))
```

**E2e tests** (Playwright, in `tests/`): smoke covers every primary route load without console errors; dedicated specs exercise deeper flows per screen where needed.

---

### Iterating on UI / layout / visual changes — browser first, Docker is the LAST gate

**Rule: for anything you can *see* (nav layout, button size, spacing, a panel, how a route looks), iterate in a browser with a screenshot — NOT the e2e suite, and NEVER a Docker rebuild per change.** The loop is:

1. **Keep a dev server running** — `npm run dev` (hot-reload, no build). Edits appear instantly; do not rebuild.
2. **Screenshot at the viewport that matters and look at it yourself.** A ~20-line `chromium.launch()` script is enough — set `viewport: { width: 375, … }` (375 = the iPhone-SE / mobile-chromium reference), `page.goto`, open the thing you changed, `.screenshot()`, then *read the image*. `?debug=1` + a real browser works too.
3. Judge → adjust → repeat. Each turn is **seconds**.
4. Only once it *looks* right do you run the e2e specs it touches; and only at the very end the Docker gate (or just let CI run it).

**Docker (`docker compose up web` + `PLAYWRIGHT_BASE_URL=http://localhost:8080`) is the FINAL validation gate, not an iteration tool.** It exists to catch the amd64/nginx-specific things a browser can't — and note **`npm run build` must run with Docker DOWN** (the `web` service bind-mounts `build/` read-only → adapter-static's `rmSync` fails `ENOTEMPTY`). You do NOT need it to answer "does this button look right".

**The pitfall — if you catch yourself doing ANY of these, STOP and go back to step 1:**
- running `docker down → npm run build → docker up` to check a *visual* tweak;
- each turn taking 5–10 minutes for a one-line CSS change;
- screenshotting off the Docker container instead of a dev server.

That is the bad loop. It cost **~6 hours on 2026-07-10** (the mobile-nav overflow → drawer-move work): every one-line CSS tweak went through a full Docker rebuild when a dev-server screenshot would have answered it in seconds. The trigger was tunnel-vision — the *original* failure was `docker-e2e`, so Docker got carried into visual iteration where it never belonged. **Re-evaluate your tool the moment the task shifts from "reproduce the CI failure" to "does this look right".** Match the verification cost to the change: a one-line CSS edit does not deserve a 10-minute container cycle.

Only genuinely amd64-specific work (visual snapshot **baselines**) actually needs the Linux/Docker environment — and even those regenerate via the `Regenerate visual snapshots` GH workflow (amd64 runner), never a local loop. Everything else you can see: browser.

---

## Design system — do not change without UXS update

```
Background:    #04040c
Accent blue:   #4466ff
Teal:          #4ecdc4
Mars red:      #c1440e
Earth blue:    #4b9cd3
Gold:          #ffc850

font-display:   'Bebas Neue'    titles, names
font-mono:      'Space Mono'    data, labels, HUD
font-editorial: 'Crimson Pro'   descriptions (always italic)

Nav bar:        height 52px, z-index 20
Panel (mobile): bottom sheet, full width
Panel (desktop): right drawer, 314px wide
Touch targets:  min 44×44px
```

Three.js r128 only. `THREE.CapsuleGeometry` does not exist in r128.

---

## CI — what runs on every PR

```
typecheck   → npm run typecheck (i18n:compile + svelte-kit sync + svelte-check)
lint        → npm run lint (prettier --check . && eslint .)
test        → npm run test (vitest run)
validate    → npm run validate-data (ajv + consistency checks on JSON under static/data/)
build       → npm run build (i18n:compile + validate-data + precompute-porkchops + vite build
              + scripts/check-prerender-completeness.mjs)
precompute  → npm run precompute-porkchops (9 porkchop grids; chained into build)
doc-check   → grep checks from guide §18
```

E2e (Playwright) runs on push to `main`, not on every PR.

**`scripts/check-prerender-completeness.mjs`** runs after `vite build` and asserts every non-base locale has its root HTML emitted plus that the total HTML file count is plausible (≥ 200; today's build emits ~343). Catches the silent-incomplete-prerender failure mode that previously let a misconfigured `handleHttpError` ship 18 en-US files instead of the full per-locale tree. If you see `FAIL: N locale root(s) missing from build/`, the script header explains what to check.

**workflow_run vs push event gates** — when adding `if:` conditions to a workflow that's triggered by `workflow_run` (e.g. docker-e2e fires after CI completes), do NOT check `github.event_name == 'push'`. That field reflects the *current* workflow's trigger (`workflow_run`), not the upstream one. Check `github.event.workflow_run.event == 'push'` instead. The publish-platforms job in `docker-e2e.yml` carried this bug from inception until 2026-06-16 — every `sha-<short>` image tag was silently skipped, and nobody noticed until a prod deploy tried to pull the matching image.

### Before pushing — `npm run preflight`

Mirrors CI step-for-step locally. Runs typecheck → lint → test → validate-data → build. **If preflight passes, push is safe; if it fails, do not push.** A `.husky/pre-push` hook auto-runs it on `git push` and blocks the push on failure (use `git push --no-verify` only when explicitly intended).

Hooks self-activate after `npm install` via the `prepare` script (`git config core.hooksPath .husky`). No new dependencies — `.husky/pre-push` is a plain bash script.

> **Preflight does NOT catch lockfile drift — CI's cold Linux `npm ci` does.** A macOS `npm install` silently strips Linux-only optional peer deps (`@emnapi/*`, pulled transitively by the optional `@rolldown/binding-wasm32-wasi`) from `package-lock.json`; preflight and a local `npm ci` on darwin pass anyway (those nodes aren't installed), and CI's `ci.yml` only runs on `main` — so on Orrery's no-PR, merge-straight-to-`main` flow the broken lock rides every branch push green and only detonates on the first main CI run **after** the merge. `.github/workflows/lock-check.yml` closes this: every push to a non-`main` branch runs a cold `npm ci --ignore-scripts` on `ubuntu-latest`, so drift goes red on the branch push, not post-merge. If it fires, regenerate the lock on **Linux** (`docker run --rm -v "$PWD":/app -w /app node:20 npm install --package-lock-only`), never macOS. See TA.md §pipelines "CI trigger map".

> **Concurrency lock — parallel agents in the same checkout.** `npm run preflight` is wrapped by `scripts/with-lock.mjs` so two simultaneous invocations (e.g. two agents working the same branch) serialize instead of racing the `.svelte-kit/output` rimraf at build start. The second caller prints the offender's pid + command and polls every 2 s; lock auto-clears after 30 min if a process crashed mid-run. Coverage is `npm run preflight` only — direct `npx vitest`, `npx playwright test`, and raw `vite build` are NOT locked, so prefer the npm script for anything that touches the build output. If you need to lock another command, the wrapper takes any child: `node scripts/with-lock.mjs <name> -- <cmd> [args...]`.

> **Caveat — `tsc --noEmit` ≠ svelte-check:** `tsc` only type-checks `.ts` files. CI uses `svelte-check`, which type-checks `.svelte` content too. Use `npm run typecheck` (which calls svelte-check) when validating Svelte component changes. Errors like "Property X does not exist on type Y" inside a `.svelte` file will only surface via svelte-check.

> **Caveat — preflight does NOT run e2e.** Preflight covers typecheck / lint / unit / validate / build, but the Playwright e2e suite only runs on push-to-main in CI. Routine PR pushes may pass preflight and still break e2e. For tag / release readiness, see the next section.

> **Run `docker-e2e` on the BRANCH before merging an epic — don't let it first run post-merge on main.** For any large accumulated diff, heavy-3D, or perf-sensitive change: `gh workflow run docker-e2e.yml --ref <branch>` and get it green before the merge. `docker-e2e` is the ONLY gate that catches CI-GL/perf regressions, and it runs on **amd64 SwiftShader (software GL, GPU-less)** — a fundamentally different environment from a local Playwright run on **arm64 hardware GL**. A local e2e pass tells you nothing about the software-GL path. It also routinely gets cancelled/skipped on main (concurrency `cancel-in-progress` + the `chore(launches)` skip), so if you only rely on the post-merge run it may not even execute. **History:** the 2026-07-21 launch epic (66 commits) merged straight to main with preflight + a full local e2e (1086 passed, arm64) both green; docker-e2e then went red on main — a `scene.environment = heroEnvironment` (IBL) added per-frame GPU cost that starved the rAF smooth-zoom on software GL and tipped the surface-flat-patch / mount-perf / hotspot-chip desktop tests past their walls (consistent, not flake). It could not be reproduced locally at all (arm64 SwiftShader + 6× CPU throttle still passed). Two lessons compound: (1) 3D per-frame GPU cost must be validated on the software-GL/low-end path (this is the 3rd instance of that bug-class — see the surface-perf rules above); (2) run docker-e2e on the branch so a regression surfaces pre-merge, isolated, not buried in N commits on main.

> **Recurring bug-classes — sweep for adjacent instances when you touch these (the 2026-07-21 launch-epic set; live inventory in `docs/wip/2026-07-21-latent-bug-class-sweep.md`).**
> 1. **`{#each … as x (KEY)}` keys must be unique + stable** — never key by a display string (`.title`/`.name`/`.label`); two items can share it → runtime `each_key_duplicate` pageerror (bit /colophon twice). Key by an id/path/slug or a composite `(x.a + '@' + x.b)`.
> 2. **No hardcoded data-derived counts in e2e** — `toHaveCount(125)` etc. red every time the catalog grows. Use `toBeGreaterThanOrEqual(N)` + a loose cap, or read the count from the data in setup. (Structural counts like "3 EDL readouts" are fine.)
> 3. **Per-frame GPU cost on an INTERACTIVE 3D scene starves rAF on software-GL CI** — `scene.environment = heroEnvironment` (IBL), extra render passes, heavy geometry. Fine on dev hardware GL, times out the GPU-less CI runner. Removed from SurfaceScene; **still live on `fly-helio-scene.ts` + `ascent-renderer.ts` (a /fly cinematic-vs-perf decision, not a blind revert)**. Validate 3D changes on the software-GL path.
> 4. **Exhaustive `Record<Union, T>` maps drift when you extend the union** — tsc catches it, but only in the tsconfig that compiles the file (the epic's gap only showed in `typecheck:scripts`). When you add a union member, update ALL its maps: `ArchetypeName` → 3 maps; `LayerKey` → `LAYER_DEFAULTS` + the panel `$state`.

> **Optional smoke layer — `PREFLIGHT_INCLUDE_SMOKE=1` (GH #83 follow-up).** The pre-push hook will additionally run `landing.spec.ts` + `smoke.spec.ts` (desktop-chromium, ~30-60s) when this env var is set. Catches runtime route 404s that preflight cannot see (e.g. missing i18n overlays). Recommended when your tree change touches `/earth`, `/moon`, `/mars`, or `/fleet` data files; not needed for typical refactors. Toggle:
> ```bash
> PREFLIGHT_INCLUDE_SMOKE=1 git push
> ```

> **Layer 1 — overlay-completeness check (also GH #83 follow-up).** `validate-data` now verifies every ID in earth-objects / fleet-index / moon-sites / mars-sites / science _index has a matching `i18n/en-US/...` overlay. Missing overlays fail validate-data → fail preflight → block push. This closes the exact gap that caused the #83 e2e regression. See the data-layer "overlay-completeness rule" above.

---

### Before tagging or releasing — full local e2e on BOTH projects

**The pre-push hook is not enough to ship a release.** It runs preflight, which excludes e2e. The CI e2e gate is what holds the auto-deploy chain (`ci.yml` → `docker-e2e.yml` → `preview.yml`) together (per ADR-071); if docker-e2e is red on the tagged commit, the GH Pages deploy never fires and shipping turns into a CI ping-pong.

**Rule: before moving a tag or cutting a GitHub Release, run the full e2e suite locally against both viewports until both are clean.**

```bash
# Two viewports (desktop-chromium + mobile-chromium) — both must be green.
npm run test:e2e -- --workers=1                  # all specs, both projects
# Or while iterating on a subset:
npx playwright test --workers=1 --project=mobile-chromium tests/e2e/i18n-de.spec.ts ...
```

**Why `--workers=1`:** the vite preview server is shared across workers. With the default 2 local workers, concurrent rAF + canvas tests destabilise the preview server enough that it sometimes crashes mid-run (`net::ERR_CONNECTION_REFUSED` on subsequent tests). Single worker is slower (~3 min for the full suite) but deterministic. CI already uses one worker; matching it locally also matches CI failure modes.

**Mobile (Capacitor) e2e is separate:** `npm run test:e2e:mobile` builds the `MOBILE=1` stream-heavy bundle and runs `playwright.mobile.config.ts` against the **pruned `build/`** (via `scripts/mobile/serve-build.mjs` — NOT `vite preview`, which serves the unpruned `.svelte-kit/output/`). It's device-free, asserts the streaming contract + the size budget, and runs in its own `mobile-e2e.yml` CI workflow. Full strategy + the on-device manual checklist: **[docs/guides/mobile-testing.md](docs/guides/mobile-testing.md)**.

**Why BOTH projects:** desktop-chromium and mobile-chromium hit different viewport breakpoints (≤640 px collapses the nav into the hamburger drawer, the science rail loses its Search button, /fly HUD collapses, etc.). The mobile project catches the layout regressions desktop can't see. Skipping mobile is how the v0.6.0 → v0.6.1 release cycle ended up with 60+ mobile failures discovered post-tag.

**Visual regression baselines (`tests/e2e/visual.spec.ts`):** baselines are committed as `*-darwin.png` (maintainer's local machine) AND `*-linux.png` (CI runner). Each platform pair must stay in lockstep. Local darwin runs use the darwin baselines; CI runs use the linux baselines.

**When to regenerate linux baselines (NON-NEGOTIABLE):** any change that affects the rendered DOM under the watched selectors — `section.credits > header.head` on `/credits` and `main / .science-page / nav.tabs / body` on `/science` — must be followed by a manual trigger of the regen workflow BEFORE pushing:

```bash
gh workflow run "Regenerate visual snapshots" --ref <branch>
```

The bot regenerates the four linux baselines (credits-head + science-tabs × desktop + mobile) on a linux CI runner and commits them back to the branch. CI e2e will fail on push if you skip this step and changed the layout — that's the system working. **History note:** the visual:69 + science-tabs failures of 2026-05-25 were caused by parallel /credits + /science layout work that didn't queue the regen workflow. ADR-069 follow-up: AGENTS.md now flags this rule. See `docs/guides/visual-regression-baselines.md` for the full lifecycle.

**Pre-tag dry run checklist:**

1. `npm run preflight` — green
2. `npm run test:e2e -- --workers=1` — both projects green (or known-broken specs explicitly skipped with a comment)
3. `git push` — pre-push hook runs preflight again, must pass
4. Push completes — wait for CI + e2e workflows on main, confirm both green
5. Only then move the tag / cut the GitHub Release

**Order of operations when something is broken on CI but green locally:** trust CI. The CI environment is Ubuntu, runs in Docker, uses 1 worker, and the install / build / preview path can drift from the local setup. Reproduce locally with `--workers=1` and the latest `npm ci` before debugging.

---

### No fix-and-pray on CI — local reproduction is mandatory

**Rule: when CI e2e fails, the next step is `npx playwright test --workers=1 --project=<failing-project> <failing-spec>` locally — not a speculative patch pushed straight to CI.** Push only after the failure reproduces locally AND the fix makes the local run green. Every speculative push pollutes the workflow history, wastes 15-40 min of CI time, races the launches-bot cron (which auto-cancels in-flight runs), and burns runner-minutes for no information gain — CI tells you "still red" but not "why a different way".

**The expected loop is:**

1. Pull the failing test name + error-context.md from the CI artifact (`gh run view <id> --log` → find the `>` line + locator + timeout).
2. Run that exact spec locally on the failing project: `npx playwright test --workers=1 --project=mobile-chromium tests/e2e/<spec>.ts`. If it doesn't reproduce, raise that explicitly — don't guess at fixes for failures you can't see.
3. Iterate the fix until the local run is green. Re-run 2-3 times to confirm the fix isn't itself flaky.
4. Run the broader spec set the change touches (e.g. all of `explore.spec.ts moon.spec.ts mars.spec.ts` if the fix is cross-cutting).
5. *Then* push. The CI run becomes the final verification, not the debugging tool.

**Push-and-wait-for-CI is a debugging anti-pattern.** Each iteration costs at least 25 min wall-clock vs. ~2 min for a single local spec. The maintainer (Marko) has flagged this explicitly: deliberate, precise, expected — not "let's see what CI says".

**When to escape this rule (rare):** the failure depends on a CI-only condition that genuinely can't be reproduced locally — Ubuntu+Docker filesystem case-sensitivity, runner network latency, GH Actions concurrency racing the launches-bot cron. In those cases, say so out loud, and instrument the push (e.g. add a CI-only debug log) so the next CI run yields new information. "Let's try this and see" is not in scope.

**Stale-monitor caveat:** when a CI run shows `cancelled` from a successor push, that's the auto-supersede behaviour, not a real cancel — confirm by checking whether a newer run exists on a newer sha. Don't treat supersede-cancellations as either pass or fail; just re-arm the monitor on the live run.

**Hard rule — never offer skip / band-aid / known-issue as an option alongside the proper fix.** When a failure has a clear engineering fix, do it; do not pre-package a shortcut and tempt the maintainer with it. If the maintainer wants to take a shortcut, they will initiate it themselves. Pre-loading "skip the test", "mark as known-issue", "file a tracking issue and move on", or "accept 99 % green" as bullet-point options is *cheating* — it shifts the engineering judgment to the maintainer and signals that you're optimising for "done", not "correct". Confirmed sharply 2026-06-16 on the docker-e2e German landing failure — the proper fix was an nginx try_files rewrite for trailing slashes; "skip with tracking issue" was offered next to it as an equal option and got rightfully called out. Only present multiple options when there are genuinely multiple *valid engineering paths* with real trade-offs that only the architect can judge.

**Hard rule — never push partial fixes you expect to fail.** This came up sharp in the 2026-06-16 #342 docker-e2e cycle: with ~89 failing specs in docker-e2e, fixing 30 deterministically and pushing "hoping the rest is under 5" is *not* progress — it's pollution. CI exists to catch things you didn't predict, not to confirm what you already know is broken.

The rule is binary:

- If you know a fix will leave specs failing → do not push. Run the full project sweep (`npx playwright test --workers=1 --project=mobile-chromium`) locally, fix every remaining failure, and *then* push.
- If you're uncertain whether a spec is fixed → run it locally before pushing. "I didn't have time" is not in scope; the local run is 2-30 min, the CI cycle is 30-90 min and consumes minutes the next agent would otherwise use.
- The only acceptable "partial" push is one that explicitly de-scopes the remaining work — say so in the commit message ("X tests still failing, tracked separately") and in chat, so the maintainer knows you stopped on purpose, not by accident.

When a sweep produces a large failure list, triage *locally* into three buckets and address them in order before any push:

1. **Deterministic regressions from your work** — fix these. The whole point of a CI sweep is to find these.
2. **Spec drift from earlier merged commits** (HUD selectors that aged out, chip merger renames, UX flag flips) — update or skip with a comment naming the originating commit.
3. **Flakes** — confirm by re-running the spec twice locally. If both pass, mark it as flake and keep moving. Don't push hoping flakes resolve themselves; they don't.

Only when the local mobile-chromium project run is fully green (or every remaining failure is named + tracked + accepted as out-of-scope by the maintainer) do you push.

---

### Spec-writing patterns — viewport-aware, locale-resilient

E2e tests must run identically on desktop-chromium and mobile-chromium. Most regressions in this codebase land because a spec was written for the desktop layout and silently failed on mobile-chromium for months until a release exposed it. Follow these patterns:

**1. Use viewport-aware navigation helpers, not raw `nav a.link` selectors.**

The desktop nav strip (`<nav .center a.link>`) is `display: none` on ≤640 px viewports; the hamburger drawer (`button.menu-toggle` → `<a.drawer-link>`) takes over. Helpers in `tests/e2e/_helpers/nav.ts`:

```ts
import { clickNavLink, localeChip } from './_helpers/nav';
await clickNavLink(page, '/missions');   // opens drawer first on mobile
await expect(localeChip(page).first()).toContainText('DE');
```

Never write `await page.locator('nav a.link[href*="/missions"]').first().click()` — it works on desktop and silently fails on mobile.

**2. Prefer `html[lang]` over body-text translation tokens for locale assertions.**

```ts
// ✓ Authoritative, viewport-agnostic, set by src/lib/locale.ts on hydration.
await expect(page.locator('html')).toHaveAttribute('lang', 'es');

// ✗ Fragile — body text often only exists as a nav link (display:none on mobile).
await expect(page.getByText('NUESTRO SISTEMA SOLAR').first()).toBeVisible();
```

Combine `html[lang]` + chip + URL preservation as the three locale assertions. They cover Paraglide load, locale-picker state, and URL canonicalisation respectively, and all three survive viewport breakpoints.

**3. Scope chip locators to the locale picker.**

`button.chip` collides with filter chips on `/fly`, `/missions`, `/fleet`. Use `[data-locale-picker] button.chip` (already wrapped in the `localeChip(page)` helper) — never bare `button.chip.first()`.

**4. Use the readiness signals from ADR-056, not magic sleeps.**

`window.__pickAt(x, y)` / `data-route-ready` / `data-loading` are the deterministic signals. `waitForTimeout(N)` will eventually flake on CI under load.

**5. Mobile-only `test.skip()` blocks need a comment explaining why.**

```ts
test.describe('/science Cmd-K search', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1280) < 700, 'desktop-only affordance');
  // ...
});
```

The Search button is `display:none` on mobile (rail collapses). Skipping is correct; not skipping flakes both attempts. Always include the *why* in the skip reason so a future reader doesn't restore the test.

**6. Hydration timing differs by viewport.**

Pixel-5 mobile takes 2–4× longer than desktop for canvas / WebGL routes to populate live data (sites, missions, satellites). Either bump the timeout to 30 s (`{ timeout: 30_000 }`) or assert on a static-render attribute that doesn't require live data. Don't assume desktop-style 5-second timeouts work on mobile.

---

### GitHub Release ≠ git tag

`git tag vX.Y.Z` + `git push --tags` creates a tag. It does NOT create a GitHub Release. The releases page (`gh release list`) is a separate API entity that surfaces the version on the project's GitHub homepage and feeds release-notes RSS / GitHub notification fan-out.

After tagging, also run:

```bash
gh release create vX.Y.Z --title "vX.Y.Z — short headline" --notes-file /tmp/release-body.md
```

Where the body comes from the matching `## [X.Y.Z]` section in `CHANGELOG.md` (extracted with `awk '/^## \[X\.Y\.Z\]/{flag=1;next} /^## \[/{flag=0} flag' CHANGELOG.md > /tmp/release-body.md`).

**Three ways to publish v0.6.1, only one is the full release:**

| Action | What it does | What it doesn't do |
|---|---|---|
| `git tag v0.6.1` + `git push --tags` | Tag exists; gh sees it; CI deploy chain MAY fire | No GH Release entry; no release notes; no notification |
| `gh release create v0.6.1 …` | Creates the Release entry tied to the tag | Doesn't trigger Pages deploy; doesn't move the tag |
| `gh workflow run "Deploy preview" --ref main` | Manually publishes the **staging** site (GitHub Pages) from current main | Doesn't tag; doesn't create a Release; **does NOT touch prod** (the VPS) |

All three steps are needed for a complete release: tag + GH Release + deploy. The **staging** deploy (GitHub Pages, workflow "Deploy preview" / `preview.yml`) auto-fires from a push-to-main IF the CI + e2e workflows pass; if either is red, use `workflow_dispatch` to force it. **Prod (the VPS) is a separate, always-manual step** — `gh workflow run "Deploy to prod VPS (orrery)"` — never auto-triggered. Tiers: **dev → staging (GitHub Pages) → prod (VPS)**; see TA.md §pipelines "Deploy tiers".

---

### Pre-push hook quirks

- **`validate-data` scopes its PRD/RFC/ADR gating-sentence check to `git ls-files`** (issue #136). Untracked drafts in `docs/prd/` or `docs/rfc/` no longer block `git push`; staged-but-uncommitted files still get gated. If you want a draft to be checked, stage it. If `git` isn't available (CI shallow-clone edge case), the check falls back to the filesystem walk so the gate still enforces on tracked files.
- **`prettier --check` exit code is honoured, but its prose can be filtered.** Some terminal contexts (specifically Claude Code) rewrite Prettier's `[warn] path/to/file.ts` to a reassuring `Prettier: All files formatted correctly` while still returning exit code 1. Trust the exit code, not the prose. When output looks clean but a script exited non-zero, re-run with `/usr/bin/env bash -c '<cmd> 2>&1; echo EXIT=$?'`.

---

## Documentation system

Reading order for any non-trivial task:

1. **`docs/adr/TA.md`** — single-page architecture map. Start here for any task that crosses one file. v2.0 covers every route, subsystem, 3D scene, asset pipeline, contract, and constraint.
2. `docs/adr/` — locked decisions (the why + alternatives).
3. `docs/rfc/` — RFCs in flight (open architectural questions).
4. `docs/prd/` — product specs (the user-value argument + V1 scope).
5. `docs/uxs/` — UX specifications.
6. `docs/guides/i18n-style-guide.md` — per-language translation conventions (binding per ADR-033).
7. `docs/guides/docker-stack.md` — local `docker compose` stack (web nginx + on-demand pipeline runners, RFC-024 / ADR-063-066). For exercising the production-shape artefact locally, running data pipelines without host gdal, or understanding the docker-e2e CI gate.
8. `docs/guides/observability.md` — Sentry (client-side JS errors) + Grafana Cloud Agent (docker logs), both env-var-gated and silent by default, RFC-025 / ADR-067-068. For setting up the operator accounts, populating env vars, verifying silence in local dev, and importing the dashboards.

When code and TA.md / ADRs disagree, one is wrong. Fix the wrong one. Do not tolerate divergence.

---

## What not to do

- Do not hardcode UI strings — use Paraglide-js
- Do not put editorial content in base mission / fleet / site JSON files — use locale overlays (ADR-017, ADR-054)
- Do not fetch data directly — use `src/lib/data.ts`
- Do not add outbound LEARN links without re-running `npm run build-link-provenance` — every link must have a provenance row (ADR-051)
- Do not link to Wikipedia as the *only* source on a non-US entity — the operator's own page must be the first `intro` link (ADR-051)
- Do not run Lambert solver on main thread
- Do not change physics constants without ADR
- Do not design desktop-first
- Do not use `any` in TypeScript without justification
- Do not add npm dependencies without ADR
- Do not use `localStorage` or `sessionStorage`. Cookies are also forbidden for user preferences EXCEPT the single narrowly-scoped `orrery_locale` cookie permitted by ADR-057 (explicit user-set locale override only — auto-detect, Science Lens, mission filters, and any other state stay runtime-only). Any new cookie requires its own ADR.
- Do not use `THREE.CapsuleGeometry` (not in r128)
- Do not tear down a Three.js renderer with `dispose()` alone — always pair it with `forceContextLoss()`, and dispose textures (not just materials). Do not build tier/panorama/route imagery eagerly at mount or allocate inside the rAF loop. See §"Performance — 3D scene discipline".
- Do not use `console.log` in production code
- **NON-NEGOTIABLE — every committed image must end up on `/credits`.** No matter how the image got there (manual download, Wikipedia REST, Open Library API, podcast RSS, YouTube avatar, hand-authored SVG, agency-direct fetch), there has to be a path from the file on disk to a row on `/credits` via `static/data/image-provenance.json`. The same rule applies to LEARN links (must end up on `/library` via `link-provenance.json`) and to source-logos / text fragments (`source-logos.json` / `text-sources.json`). If you add an image and it doesn't appear on `/credits` after `npm run build-image-provenance`, the work is not done — extend the script with a new walker, or register the source in the appropriate map in `scripts/build-image-provenance.ts`. See ADR-046 / ADR-047 / ADR-051. New license short names must land in `scripts/license-allowlist.ts` or be waived in `static/data/license-waivers.json`.
- Do not introduce `waitForTimeout(<magic>)` in Playwright tests — use a deterministic readiness signal (`window.__pickAt`, `data-route-ready`, `data-loading`, `expect(...).toHave...`). Brittle on slow CI. See ADR-056.
- Do not call `console.error` from production code paths the user sees — pipe through a centralised handler instead, so we don't pollute Sentry-style error feeds when added.
- Do not add a fleet entry without bidirectional `fleet_refs` ↔ `linked_missions` / `linked_sites` pointers — the symmetric-link validator in `validate-data.ts` will fail closed. See ADR-052.
- Do not include artist's-impression imagery for vehicles that exist or existed. Planned-only vehicles carry an explicit `artistic-impression: true` waiver flag. See ADR-046, ADR-053.
- Do not generate science / fleet / station / spacecraft SVG diagrams via AI tools — every diagram is hand-authored and the SVG file *is* the committed source. See ADR-035, ADR-053.
- Do not introduce a new 3D model builder ad-hoc — follow the per-mission pattern in `src/lib/earth-satellite-models.ts` (orbiters) or `src/lib/moon-lander-models.ts` (surface) and add it to the BUILDERS dispatch + tests.
- Do not bypass the `flight.cislunar_profile` contract on Moon missions — `/fly` reads it via `cislunar-geometry.ts` to render the Earth-centered second camera. See ADR-058.

---

*Orrery · AGENTS.md · May 2026 · v0.6.0 · paired with [TA.md v2.0](docs/adr/TA.md) — update both when locked decisions change*
