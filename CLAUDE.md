# CLAUDE.md — Orrery

Instructions for agentic AI working on this codebase. Read this before touching any file.

**Cursor:** the same content is loaded as an always-on project rule in [`.cursor/rules/orrery.mdc`](.cursor/rules/orrery.mdc). When you edit engineering constraints here, update that file too (or vice versa).

---

## What this project is

Orrery is a browser-based solar system explorer and Mars / lunar mission simulator. Eight primary nav destinations, real orbital mechanics, **36** missions in the library (Mars + Moon + four outer-system catalogue entries), and a canonical **ORRERY-1** free-return Mars flyby scenario for generic `/fly` runs. It runs entirely in the browser, deploys offline, and has no backend or user accounts. Built for millions of users worldwide — mobile-first, internationalised (en-US + es today).

The eight primary nav destinations:

| Route | Screen | File |
|---|---|---|
| `/explore` | Solar System Explorer | `src/routes/explore/+page.svelte` |
| `/plan` | Mission Configurator (Earth → 9 destinations, LANDING/FLYBY) | `src/routes/plan/+page.svelte` |
| `/fly` | Mission Arc | `src/routes/fly/+page.svelte` |
| `/missions` | Mission Library | `src/routes/missions/+page.svelte` |
| `/earth` | Earth Orbit | `src/routes/earth/+page.svelte` |
| `/iss` | ISS Explorer | `src/routes/iss/+page.svelte` |
| `/moon` | Moon Map | `src/routes/moon/+page.svelte` |
| `/mars` | Mars Map | `src/routes/mars/+page.svelte` |

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
| i18n | Paraglide-js + locale overlay files | ADR-017 |
| Design approach | Mobile-first, bottom sheet panels | ADR-018 |
| Data validation | ajv JSON schema on PR | ADR-019 |
| Mission data | Static JSON under `static/data/` (served as `/data/...`) | ADR-006 |
| Mission flight params | Optional `flight` sub-object + `flight_data_quality` honesty flag | ADR-027 |
| Panel tabs + galleries | Tabbed detail panels (OVERVIEW · TECHNICAL · SIZES · GALLERY · LEARN · FLIGHT); galleries conditional on per-category manifest; LEARN links in locale overlays | ADR-017, ADR-016 |
| Lambert solver | Web Worker | ADR-008 |
| Default fly scenario | ORRERY-1 free-return flyby (library missions add landings / cislunar arcs) | ADR-009 |
| Transfer arc | Keplerian half-ellipses | ADR-010 |

Superseded (do not use): ADR-002 (vanilla JS), ADR-003 (Vite standalone), ADR-004 (hash routing), ADR-005 (Docker Compose only).

---

## Repository structure

```
/
├── CLAUDE.md               ← this file
├── IMPLEMENTATION.md       ← implementation slices and gates
├── README.md               ← public project introduction
├── LICENSE                 ← MIT
├── .gitignore
│
├── src/
│   ├── routes/             ← SvelteKit file-based routing
│   │   ├── +layout.svelte  ← nav bar, i18n provider
│   │   ├── explore/+page.svelte
│   │   ├── plan/+page.svelte
│   │   ├── fly/+page.svelte
│   │   ├── missions/+page.svelte
│   │   ├── earth/+page.svelte
│   │   └── moon/+page.svelte
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Nav.svelte  ← shared 52px nav bar
│   │   │   ├── Panel.svelte ← bottom sheet (mobile) / right drawer (desktop)
│   │   │   └── ...
│   │   ├── data.ts         ← fetch + cache + i18n merge
│   │   ├── orbital.ts      ← keplerPos(), visViva()
│   │   ├── scale.ts        ← auToPx(), altToOrbitRadius()
│   │   └── lambert.ts      ← solver (worker only)
│   ├── workers/
│   │   └── lambert.worker.ts
│   └── types/
│       ├── mission.ts      ← Mission, MissionIndex interfaces
│       └── planet.ts
│
├── static/                 ← SvelteKit static dir (copied to build/ root)
│   ├── fonts/              ← self-hosted (fetched at build)
│   ├── textures/           ← planet textures (fetched at build)
│   ├── logos/              ← agency logos (fetched at build, Wikimedia Commons)
│   ├── images/missions/    ← NASA Images API + Wikimedia mission cover photos
│   ├── images/rockets/     ← Wikimedia rocket reference photos
│   ├── data/               ← all app JSON: missions, i18n overlays, schemas, planets, porkchop, …
│   │   ├── missions/
│   │   │   ├── index.json  ← lightweight manifest (36 entries)
│   │   │   ├── mars/       ← base mission files (language-neutral)
│   │   │   └── moon/
│   │   ├── i18n/
│   │   │   ├── en-US/      ← English overlays (e.g. missions/mars/curiosity.json)
│   │   │   └── es/         ← other locales, same tree
│   │   ├── schemas/        ← ajv schemas (mission.schema.json, …)
│   │   ├── porkchop/       ← pre-computed grids (ADR-026)
│   │   ├── planets.json
│   │   ├── rockets.json
│   │   └── earth-objects.json
│   └── .nojekyll           ← required for GitHub Pages
│
├── scripts/
│   ├── fetch-assets.ts     ← fetches fonts, textures, logos, images
│   ├── precompute-porkchops.ts ← pre-computes 9 per-destination porkchop grids (ADR-026 + ADR-028)
│   └── validate-data.ts    ← ajv validation of all static/data/ JSON + doc gating
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
build       → npm run build (SvelteKit)
typecheck   → tsc --noEmit
lint        → eslint src/
test        → vitest run
validate    → npm run validate-data (ajv + consistency checks on JSON under static/data/)
precompute  → npm run precompute-porkchops (5 porkchop grids; chained into build)
doc-check   → grep checks from guide §18
```

E2e (Playwright) runs on push to `main`, not on every PR.

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
- Do not run Lambert solver on main thread
- Do not change physics constants without ADR
- Do not design desktop-first
- Do not use `any` in TypeScript without justification
- Do not add npm dependencies without ADR
- Do not use `localStorage` or `sessionStorage`
- Do not use `THREE.CapsuleGeometry` (not in r128)
- Do not use `console.log` in production code

---

*Orrery · CLAUDE.md · May 2026 · Update when locked decisions change*
