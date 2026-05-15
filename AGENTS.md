# AGENTS.md — Orrery

Instructions for any AI / coding agent working on this codebase. Read this before touching any file.

This is the **canonical** instruction file. `CLAUDE.md` and `.cursor/rules/orrery.mdc` are thin pointers to this document so there's a single source of truth — no 2-way drift between tool-specific copies. Tool-specific notes (e.g. a Claude Code bash-output caveat) live in those thin files when they only apply to one agent.

---

## Where to start — read these before touching code

**Single-page architecture map: [`docs/adr/TA.md`](docs/adr/TA.md).** v2.0 is current as of v0.6.0; it documents every route, subsystem, 3D scene, asset pipeline, contract, and constraint, each with the ADR that locked it. Read it first when a task touches anything outside one file.

Then drill into the matching doc by question type:

| Question | Where to look |
|---|---|
| Why was X chosen? What are the alternatives? | `docs/adr/` — locked decisions (ADR-001 through ADR-058) |
| What is the user value? What's the v1 scope? | `docs/prd/` — product requirements (PRD-001 through PRD-014) |
| What is the open architecture question being deliberated? | `docs/rfc/` — RFCs in flight (RFC-001 through RFC-017) |
| What does the UI look like? | `docs/uxs/` — UX specifications |
| Per-language translation rules? | `docs/i18n-style-guide.md` (binding per ADR-033) |
| Image / link / text provenance? | `static/data/{image,link}-provenance.json` + ADR-046 / ADR-047 / ADR-051 |
| How is a specific 3D scene built? | TA.md §rendering + `src/routes/<route>/+page.svelte` |
| How does the build pipeline work? | TA.md §pipelines (10 pipelines documented) |

**Anti-drift rule:** when code and TA.md disagree, one is wrong — fix it. The same applies to README, CHANGELOG, and TECH-BOM. Do not tolerate divergence.

---

## What this project is

Orrery is a browser-based solar system explorer, mission simulator, encyclopedia, station explorer, and spaceflight fleet inventory rolled into one. Eleven primary nav destinations, real orbital mechanics, **37 missions** in the catalog (Mars + Moon + four outer-system catalogue entries), **137 fleet entries** across 9 categories cross-linked bidirectionally to the rest of the corpus, and a canonical **ORRERY-1** free-return Mars flyby scenario for generic `/fly` runs. It runs entirely in the browser, deploys offline, and has no backend or user accounts. Built for millions of users worldwide — mobile-first, internationalised in **14 locales** at 100% UI parity (en-US + es / fr / de / pt-BR / it / nl / zh-CN / ja / ko / hi / ar / ru / sr-Cyrl).

The eleven primary nav destinations:

| Route | Screen | File |
|---|---|---|
| `/explore` | Solar System Explorer | `src/routes/explore/+page.svelte` |
| `/plan` | Mission Configurator (Earth → 9 destinations, LANDING/FLYBY) | `src/routes/plan/+page.svelte` |
| `/fly` | Mission Arc (heliocentric + cislunar Earth-centered scenes) | `src/routes/fly/+page.svelte` |
| `/missions` | Mission Catalog | `src/routes/missions/+page.svelte` |
| `/earth` | Earth Orbit | `src/routes/earth/+page.svelte` |
| `/moon` | Moon Map (surface markers + lunar orbiters with per-mission 3D models) | `src/routes/moon/+page.svelte` |
| `/mars` | Mars Map (equirectangular + 3D, rover traverses, orbital probes) | `src/routes/mars/+page.svelte` |
| `/iss` | ISS Explorer (18 pickable modules + visiting spacecraft) | `src/routes/iss/+page.svelte` |
| `/tiangong` | Tiangong Explorer (Tianhe + Wentian + Mengtian with module overlays) | `src/routes/tiangong/+page.svelte` |
| `/science` | Encyclopedia (85 sections × 10 tabs + Space-101 landing) | `src/routes/science/+page.svelte` |
| `/fleet` | Spaceflight Fleet (137 entries × 9 categories with cross-links) | `src/routes/fleet/+page.svelte` |

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
| CI + preview | GitHub Actions + GitHub Pages | ADR-014 |
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
| Translation workflow | LLM-first-pass + argos-translate offline-NMT batch fallback; sr-Cyrl hand-authored (no Cyrillic Serbian model); `scripts/wave23/` toolchain | ADR-033 |
| Fonts + script strategy | Wave 1 (Latin+Cyrillic) bundled Inter + Crimson Pro; Wave 2 CJK Noto Sans/Serif CJK; RTL Arabic via `dir="rtl"`; sr-Cyrl Cyrillic gate | ADR-032, ADR-043, ADR-044, ADR-045 |
| `/fly` trajectory math | Pure-function isolation + per-mission validation harness; committed expected values catch regressions | ADR-030 |
| `/fly` cislunar view | Earth-centered second camera + per-mission `flight.cislunar_profile` block on Moon missions; auto-switches when destination is MOON | ADR-058 |
| Science Lens + multi-layer state | Attribute-on-`<html>` + MutationObserver subscription; 12 per-layer toggles gated on the master lens; CSS reacts via `:global([data-science-layer-*='on'])` with zero imports | ADR-055 |
| Fleet schema + cross-refs | Per-category folders + generated index manifest; bidirectional `fleet_refs` ↔ `linked_missions`/`linked_sites` enforced by symmetric-link validator (fail-closed) | ADR-052 |
| Fleet imagery + i18n | Same agency-first pipeline as the rest of the corpus; 137 entries × 14 locales = 1,918 overlay files via argos-translate batch | ADR-053, ADR-054 |
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
│   ├── routes/             ← SvelteKit file-based routing (11 primary nav + 2 read-only)
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
│   │   │   ├── index.json  ← lightweight manifest (37 entries)
│   │   │   ├── mars/       ← base mission files (language-neutral)
│   │   │   ├── moon/       ← Moon missions (incl. optional `flight.cislunar_profile` per ADR-058)
│   │   │   └── outer-system/
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
├── scripts/                            ← build-time pipelines (TA.md §pipelines documents all 10)
│   ├── fetch-assets.ts                  ← agency-first imagery fetch (ADR-046)
│   ├── build-image-provenance.ts        ← writes static/data/image-provenance.json + diff report (ADR-047)
│   ├── build-link-provenance.ts         ← writes static/data/link-provenance.json (ADR-051)
│   ├── check-learn-links.ts             ← outbound-link freshness gate (ADR-051 L-E)
│   ├── build-fleet-index.ts             ← writes static/data/fleet/index.json from per-category files (ADR-052)
│   ├── audit-fleet-heroes.ts            ← flags low-quality fleet heroes; output to docs/provenance/ (ADR-053)
│   ├── fix-fleet-heroes.ts              ← Wikipedia-API filename substitution helper (ADR-053)
│   ├── scaffold-fleet-entries.ts        ← one-time fleet entry scaffolder (archival)
│   ├── migrate-fleet-*.ts               ← one-time fleet migrations (archival; do not re-run)
│   ├── wave23/                          ← i18n translation pipeline (ADR-033, ADR-054)
│   │   ├── catalog.ts  ← extracts en-US strings
│   │   ├── maps.ts     ← argos-translate batch → per-locale string maps
│   │   └── apply-translations.ts ← writes per-locale overlay files
│   ├── license-allowlist.ts             ← canonical license allowlist + normaliser (ADR-047)
│   ├── precompute-porkchops.ts          ← pre-computes 9 per-destination porkchop grids (ADR-026 + ADR-028)
│   ├── build-science-index.ts           ← Cmd-K search index + ?-chip vocabulary for /science
│   ├── validate-data.ts                 ← ajv validation + provenance + diagram integrity + symmetric fleet cross-refs
│   ├── validate-diagrams.ts             ← SVG integrity gate (ADR-035)
│   ├── build-tech-bom.ts                ← license audit of npm deps; writes docs/TECH-BOM.md
│   └── capture-screenshots.ts           ← Playwright-driven README + user-guide screenshot regeneration
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
    └── preview.yml
```

---

## i18n rules — follow these exactly

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

## Testing rules

**Unit tests** (Vitest, colocated): every function in `src/lib/orbital.ts` must have tests. Physics functions are the highest-priority testing surface.

```typescript
// src/lib/orbital.test.ts
it('Earth at 1 AU ≈ 29.78 km/s', () =>
  expect(visViva(1.0, 1.0)).toBeCloseTo(29.78, 1))
```

**E2e tests** (Playwright, in `tests/`): smoke covers every primary route load without console errors; dedicated specs exercise deeper flows per screen where needed.

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
build       → npm run build (i18n:compile + validate-data + precompute-porkchops + vite build)
precompute  → npm run precompute-porkchops (9 porkchop grids; chained into build)
doc-check   → grep checks from guide §18
```

E2e (Playwright) runs on push to `main`, not on every PR.

### Before pushing — `npm run preflight`

Mirrors CI step-for-step locally. Runs typecheck → lint → test → validate-data → build. **If preflight passes, push is safe; if it fails, do not push.** A `.husky/pre-push` hook auto-runs it on `git push` and blocks the push on failure (use `git push --no-verify` only when explicitly intended).

Hooks self-activate after `npm install` via the `prepare` script (`git config core.hooksPath .husky`). No new dependencies — `.husky/pre-push` is a plain bash script.

> **Caveat — `tsc --noEmit` ≠ svelte-check:** `tsc` only type-checks `.ts` files. CI uses `svelte-check`, which type-checks `.svelte` content too. Use `npm run typecheck` (which calls svelte-check) when validating Svelte component changes. Errors like "Property X does not exist on type Y" inside a `.svelte` file will only surface via svelte-check.

---

## Documentation system

Reading order for any non-trivial task:

1. **`docs/adr/TA.md`** — single-page architecture map. Start here for any task that crosses one file. v2.0 covers every route, subsystem, 3D scene, asset pipeline, contract, and constraint.
2. `docs/adr/` — locked decisions (the why + alternatives).
3. `docs/rfc/` — RFCs in flight (open architectural questions).
4. `docs/prd/` — product specs (the user-value argument + V1 scope).
5. `docs/uxs/` — UX specifications.
6. `docs/i18n-style-guide.md` — per-language translation conventions (binding per ADR-033).

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
- Do not use `console.log` in production code
- Do not add new images, mission/planet/site descriptions, or external text fragments without updating `static/data/image-provenance.json` (auto-generated), `static/data/text-sources.json`, or `static/data/source-logos.json` in the same PR — see ADR-047. New license short names must land in `scripts/license-allowlist.ts` or be waived in `static/data/license-waivers.json`.
- Do not introduce `waitForTimeout(<magic>)` in Playwright tests — use a deterministic readiness signal (`window.__pickAt`, `data-route-ready`, `data-loading`, `expect(...).toHave...`). Brittle on slow CI. See ADR-056.
- Do not call `console.error` from production code paths the user sees — pipe through a centralised handler instead, so we don't pollute Sentry-style error feeds when added.
- Do not add a fleet entry without bidirectional `fleet_refs` ↔ `linked_missions` / `linked_sites` pointers — the symmetric-link validator in `validate-data.ts` will fail closed. See ADR-052.
- Do not include artist's-impression imagery for vehicles that exist or existed. Planned-only vehicles carry an explicit `artistic-impression: true` waiver flag. See ADR-046, ADR-053.
- Do not generate science / fleet / station / spacecraft SVG diagrams via AI tools — every diagram is hand-authored and the SVG file *is* the committed source. See ADR-035, ADR-053.
- Do not introduce a new 3D model builder ad-hoc — follow the per-mission pattern in `src/lib/earth-satellite-models.ts` (orbiters) or `src/lib/moon-lander-models.ts` (surface) and add it to the BUILDERS dispatch + tests.
- Do not bypass the `flight.cislunar_profile` contract on Moon missions — `/fly` reads it via `cislunar-geometry.ts` to render the Earth-centered second camera. See ADR-058.

---

*Orrery · AGENTS.md · May 2026 · v0.6.0 · paired with [TA.md v2.0](docs/adr/TA.md) — update both when locked decisions change*
