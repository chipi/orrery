# AGENTS.md — Orrery

Instructions for any AI / coding agent working on this codebase. Read this before touching any file.

This is the **canonical** instruction file. `CLAUDE.md` and `.cursor/rules/orrery.mdc` are thin pointers to this document so there's a single source of truth — no 2-way drift between tool-specific copies. Tool-specific notes (e.g. a Claude Code bash-output caveat) live in those thin files when they only apply to one agent.

---

## What this project is

Orrery is a browser-based solar system explorer, mission simulator, encyclopedia, and station explorer rolled into one. Ten primary nav destinations, real orbital mechanics, **36** missions in the catalog (Mars + Moon + four outer-system catalogue entries), and a canonical **ORRERY-1** free-return Mars flyby scenario for generic `/fly` runs. It runs entirely in the browser, deploys offline, and has no backend or user accounts. Built for millions of users worldwide — mobile-first, internationalised in **14 locales** at 100% UI parity (en-US + es / fr / de / pt-BR / it / nl / zh-CN / ja / ko / hi / ar / ru / sr-Cyrl).

The ten primary nav destinations:

| Route | Screen | File |
|---|---|---|
| `/explore` | Solar System Explorer | `src/routes/explore/+page.svelte` |
| `/plan` | Mission Configurator (Earth → 9 destinations, LANDING/FLYBY) | `src/routes/plan/+page.svelte` |
| `/fly` | Mission Arc | `src/routes/fly/+page.svelte` |
| `/missions` | Mission Catalog | `src/routes/missions/+page.svelte` |
| `/earth` | Earth Orbit | `src/routes/earth/+page.svelte` |
| `/moon` | Moon Map | `src/routes/moon/+page.svelte` |
| `/mars` | Mars Map | `src/routes/mars/+page.svelte` |
| `/iss` | ISS Explorer | `src/routes/iss/+page.svelte` |
| `/tiangong` | Tiangong Explorer | `src/routes/tiangong/+page.svelte` |
| `/science` | Encyclopedia (54 sections × 8 tabs + Space-101 landing) | `src/routes/science/+page.svelte` |

Plus two read-only pages: `/credits` (per-image provenance + text-source attributions) and `/library` (bill-of-links across the entire app — every outbound LEARN link with provenance).

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
│   ├── routes/             ← SvelteKit file-based routing (10 primary nav + 2 read-only)
│   │   ├── +layout.svelte  ← nav bar, i18n provider, locale picker
│   │   ├── explore/+page.svelte
│   │   ├── plan/+page.svelte
│   │   ├── fly/+page.svelte
│   │   ├── missions/+page.svelte
│   │   ├── earth/+page.svelte
│   │   ├── moon/+page.svelte
│   │   ├── mars/+page.svelte           ← v0.4.0 (PRD-009 / RFC-012)
│   │   ├── iss/+page.svelte            ← v0.5.0 (PRD-010 / RFC-013)
│   │   ├── tiangong/+page.svelte       ← v0.5.0 (PRD-011 / RFC-014)
│   │   ├── science/                    ← v0.5.0 (PRD-008 / RFC-011) — encyclopedia
│   │   ├── credits/+page.svelte        ← v0.4.0 (ADR-047) — image provenance
│   │   └── library/+page.svelte        ← v0.5.0 (ADR-051) — outbound link inventory
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Nav.svelte                     ← shared 52px nav bar + locale picker
│   │   │   ├── ScienceLensBanner.svelte       ← collapsible banner (ADR-029-style attribute)
│   │   │   ├── ScienceLayersPanel.svelte      ← per-layer sub-toggles
│   │   │   ├── FlightDirectorBanner.svelte    ← /fly 5-phase narration
│   │   │   ├── WhyPopover.svelte              ← inline value-explanations
│   │   │   ├── StationModulePanel.svelte      ← shared by /iss + /tiangong
│   │   │   └── ...
│   │   ├── data.ts                ← fetch + cache + i18n merge
│   │   ├── orbital.ts             ← keplerPos(), visViva()
│   │   ├── scale.ts               ← auToPx(), altToOrbitRadius()
│   │   ├── lambert.ts             ← solver (worker only)
│   │   ├── science-lens.ts        ← attribute-on-<html> lens state
│   │   ├── science-layers.ts      ← multi-flag layer state (12 layers)
│   │   ├── orbit-overlays.ts      ← lens-layer 3D helpers (gravity arrows, conics, …)
│   │   ├── microgravity-axes.ts   ← /iss + /tiangong axis overlay
│   │   └── station-geometry.ts    ← shared mesh helpers (ADR-049)
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
│   │   ├── science/        ← 62 hand-coded SVGs (54 sections + 8 covers, ADR-035)
│   │   └── spacecraft/     ← 9 visiting-craft ANATOMY diagrams
│   ├── data/               ← all app JSON: missions, i18n overlays, schemas, planets, porkchop, …
│   │   ├── missions/
│   │   │   ├── index.json  ← lightweight manifest (36 entries)
│   │   │   ├── mars/       ← base mission files (language-neutral)
│   │   │   └── moon/
│   │   ├── mars-traverses/ ← rover route polylines (Curiosity, Perseverance, Opportunity, Spirit)
│   │   ├── scenarios/      ← ORRERY-1 free-return + others
│   │   ├── science/        ← 8 tab folders × ~7 sections each (ADR-034)
│   │   ├── i18n/
│   │   │   ├── en-US/      ← English overlays (source language)
│   │   │   ├── es/  fr/  de/  pt-BR/  it/    ← Wave 1 locales
│   │   │   ├── zh-CN/  ja/  ko/                ← Wave 2 (CJK)
│   │   │   └── hi/  ar/  ru/  sr-Cyrl/         ← Wave 3 (RTL + Devanagari + Cyrillic)
│   │   ├── schemas/                  ← ajv schemas (mission.schema.json, …)
│   │   ├── porkchop/                 ← pre-computed grids (ADR-026)
│   │   ├── image-provenance.json     ← per-image manifest (ADR-047, auto-generated)
│   │   ├── link-provenance.json      ← per-link manifest (ADR-051, auto-generated)
│   │   ├── license-waivers.json      ← image-license waivers (ADR-047)
│   │   ├── text-sources.json         ← per-text editorial provenance (ADR-047)
│   │   ├── source-logos.json         ← agency logo provenance (ADR-047)
│   │   ├── iss-modules.json
│   │   ├── tiangong-modules.json
│   │   ├── planets.json
│   │   ├── rockets.json
│   │   └── earth-objects.json
│   └── .nojekyll           ← required for GitHub Pages
│
├── scripts/
│   ├── fetch-assets.ts                  ← fetches fonts, textures, logos, images
│   ├── build-image-provenance.ts        ← writes static/data/image-provenance.json + diff report (ADR-047)
│   ├── build-link-provenance.ts         ← writes static/data/link-provenance.json (ADR-051)
│   ├── check-learn-links.ts             ← outbound-link freshness gate (ADR-051 L-E)
│   ├── license-allowlist.ts             ← canonical license allowlist + normaliser (ADR-047)
│   ├── precompute-porkchops.ts          ← pre-computes 9 per-destination porkchop grids (ADR-026 + ADR-028)
│   ├── build-science-index.ts           ← Cmd-K search index for /science
│   ├── validate-data.ts                 ← ajv validation + doc gating + image/link/license provenance + diagram integrity
│   ├── validate-diagrams.ts             ← SVG integrity gate (ADR-035)
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

Base mission files contain: `id`, `agency`, `dest`, `status`, `year`, `sector`, `color`, `departure_date`, `arrival_date`, `transit_days`, `vehicle`, `payload`, `delta_v`, `data_quality`, `credit`, `links`.

Locale overlay files add: `name`, `description`, `first`, `type`, `events[].note`.

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

Before writing code for any feature, check:
1. `docs/adr/` — is the decision already locked?
2. `docs/rfc/` — is it being deliberated?
3. `docs/prd/` — what is the user-value argument?
4. `docs/uxs/` — what does it look like?
5. `docs/i18n-style-guide.md` — for any user-facing string, what's the per-language translation convention? (Binding for translation work per ADR-033.)

When code and docs disagree, one is wrong. Fix the wrong one. Do not tolerate divergence.

---

## What not to do

- Do not hardcode UI strings — use Paraglide-js
- Do not put editorial content in base mission JSON files — use locale overlays
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
- Do not introduce `waitForTimeout(<magic>)` in Playwright tests — use a deterministic readiness signal (data-attribute the page sets, `expect(...).toHave...`, `waitForFunction` polling a real condition). Brittle on slow CI.
- Do not call `console.error` from production code paths the user sees — pipe through a centralised handler instead, so we don't pollute Sentry-style error feeds when added.

---

*Orrery · AGENTS.md · May 2026 · v0.5.0 · Update when locked decisions change*
