# IA — Information Architecture
*Orrery · Reference document · v1.2 · August 2026*

> **Note (v1.2):** the app has grown well past the original "six screens" this
> doc opens with. §overview / §surfaces below are historical; **§nav-groups
> (2026-08)** is the current top-level information architecture and supersedes
> §navigation for the nav bar + landing.

This is the reference document for the UX plane. UXSes anchor to it by section. When surfaces, navigation, tokens, or shell regions change, this document is amended.

---

## §overview

Six screens, one persistent nav bar, SvelteKit's History API router. No login state. No user data. No persistence between sessions.

The narrative arc: Moon Map (prologue) → Solar System Explorer (Act 1) → Mission Configurator (Act 2) → Mission Arc (Act 3) → Mission Catalog (archive) → Earth Orbit (context). The nav bar presents all six destinations at all times. There is no enforced sequence. The Mission Catalog page was previously called "Mission Library"; under ADR-051 it was renamed to free the word _Library_ for the outbound-link inventory at `/library`.

---

## §surfaces

| Surface | Route | File | Primary canvas |
|---|---|---|---|
| Moon Map | `/moon` | `src/routes/moon/+page.svelte` | Three.js sphere + Canvas 2D flat map |
| Solar System Explorer | `/explore` | `src/routes/explore/+page.svelte` | Three.js 3D + Canvas 2D toggle |
| Mission Configurator | `/plan` | `src/routes/plan/+page.svelte` | Canvas 2D porkchop plot |
| Mission Arc | `/fly` | `src/routes/fly/+page.svelte` | Three.js 3D + Canvas 2D toggle |
| Mission Catalog | `/missions` | `src/routes/missions/+page.svelte` | CSS grid card layout |
| Earth Orbit | `/earth` | `src/routes/earth/+page.svelte` | Canvas 2D logarithmic scale |
| Physics Lab | `/lab` | `src/routes/lab/+page.svelte` | SVG figures on the `station-blueprint` teal grid (Notebook / Focus; Canvas at T2) |

*(This table predates several later surfaces — `/missions`, `/science`, `/iss`, `/programs`, etc. — and is maintained additively; the "six screens" framing in §overview is historical.)*

---

## §lab

The Physics Lab (`/lab`) is a subsystem, not a single screen — **one card model rendered in three views** (specified in UXS-015; built per RFC-037).

- A **card** is a formula instance: a kernel formula + bound inputs + optional wiring + the `FigureSpec` it emits. It is portable, serializable data.
- **Notebook** (v1 home) — an ordered, narrated, exportable column of cards. Mobile-first.
- **Focus** (v1 detail) — one card full-screen: big figure stage + control rail + `/science` derivation. Uses the `Panel` bottom-sheet on mobile.
- **Canvas** (T2, second workspace) — a spatial graph with output→input wiring; desktop-first, read-only fallback on mobile.

Cards **promote** from Canvas into a Notebook. The Lab reuses the shared tokens (§shared-tokens) and components (`Panel`, `ScienceChip`, `WhyPopover`, `.readout-grid`, `ImageCredit`) wholesale; the teal figure grid is `station-blueprint.ts`. Colour discipline: teal = figure/selection, **gold = explanation**, mars-red = fail-honest. The Lab is the first surface to persist state (see §state-persistence).

---

## §topbar-patterns

One topbar pattern: the persistent 52px nav bar.

**Persistent nav bar** — present on all six screens without exception.
- Height: `52px`
- Background: `rgba(4,4,12,0.92)`
- Border-bottom: `1px solid rgba(255,255,255,0.07)`
- Backdrop-filter: `blur(14px)`
- Z-index: `20`

Left region: ORRERY wordmark (Bebas Neue 26px, letter-spacing 4px) + "MISSION SIMULATOR" subtitle (Space Mono 8px, rgba(255,255,255,0.22)).

Centre region: six screen links. Active screen: white text, `rgba(68,102,255,0.28)` background, `rgba(68,102,255,0.55)` border. Inactive: `rgba(255,255,255,0.28)`, transparent border, hover to `rgba(255,255,255,0.85)`.

Right region: screen-specific controls (3D/2D toggle on explore and fly, CAPCOM toggle on fly, status indicator on fly).

---

## §navigation

History API routing via SvelteKit's built-in router. Format: `/[screen]` with optional query params for mission IDs.

| Pattern | Example | Used by |
|---|---|---|
| `/[screen]` | `/explore` | All screens |
| `/fly?mission=[id]` | `/fly?mission=curiosity` | Mission Arc (loads specific mission) |
| `/missions?dest=[MARS\|MOON]` | `/missions?dest=MARS` | Mission Catalog (pre-filtered) |

Navigation triggers: nav bar links, "PLAN A MISSION" button in explore screen, "FLY THIS MISSION" button in missions screen.

History API routing is locked in ADR-013 (superseding ADR-004). RFC-001 is closed — SvelteKit's router replaces the hand-written router originally proposed.

---

## §nav-groups (2026-08 — current top-level IA)

The nav bar (`src/lib/components/Nav.svelte`) is **grouped**, not flat. There are
six top-level slots: two standalone links and four dropdown groups.

```
HOME  ·  EXPLORE ▾  ·  WORLDS ▾  ·  FLY  ·  PLAN  ·  CATALOG ▾  ·  LEARN ▾
```

| Slot | Kind | Members (children) | Group hub (TV) |
|---|---|---|---|
| Home | link → `/` | — | — |
| **Explore** | group | Solar System · Stellar Neighborhood · Milky Way · Local Group (the `/explore` scale shells, via `?context=`) | `/explore/hub` |
| **Worlds** | group | Earth · Moon · Mars · Venus (the `SurfaceScene` routes) | `/worlds` |
| Fly | link → `/fly` | — | — |
| Plan | link → `/plan` | — | — |
| **Catalog** | group | Programs · Missions · Fleet · ISS · Tiangong · Live | `/catalog` |
| **Learn** | group | Essays · Science | `/learn` |

**Two axes — Explore vs Worlds (2026-08 split).** `/explore` was doing two jobs:
the zoom-out *scale* ladder (solar system → cosmic web) **and** the close-up of a
single *body*. These are different questions — "how far out am I looking" vs
"which world am I on" — so the nav splits them: **Explore = scope** (the scale
shells), **Worlds = bodies** (only bodies with their own dedicated page, i.e. a
`SurfaceScene`: Earth/Moon/Mars/Venus today; the group grows only as new surface
scenes ship). `/explore` itself is **not renamed** — the 375+ `SeeInApp`
`route:"/explore"` records, the `orrery://explore` deep-link scheme, and e2e all
keep working. Cosmology content is **not** an Explore nav item: it lives under
`/science` (a cosmology tab) in the **Learn** group; the scale shells link to it
contextually via each shell's science-lens "→ Read in /science" link.

**TV (10-foot / D-pad).** A dropdown is unusable with a D-pad, so on TV each
group renders as a single link to its **big-box hub** (`/explore/hub`, `/worlds`,
`/catalog`, `/learn`), each a `SectionHub` tile grid of the group's members.
Desktop + mobile are unchanged (gated on `isTv`).

## §home-cards (2026-08 — the landing IA)

The landing (`src/routes/+page.svelte`) card grid is a **discovery** surface, and
that is a *different job* from the nav's **wayfinding**. Principle: the nav is
persistent and must stay compact (hence dropdowns); the landing has room and
should reveal breadth. So the two need not be identical — only **reconcilable**
(no card leads somewhere the nav can't reach). Applied:

- The landing shows **the whole nav tree, unpacked and sectioned** — every group
  is a labeled section, every leaf its own rich card (with a hand-drawn glyph):
  **Explore** (the 4 scale shells) · **Worlds** (Earth/Moon/Mars/Venus) · **Plan
  & Fly** · **Catalog** (all six) · **Learn** (Essays · Science).
- Section headers **reuse the nav group labels**, so the landing *teaches* the
  nav's grouping by showing it — the two surfaces reinforce each other.
- Why unpacked (not one card per group): **information scent.** "Missions",
  "Science", "Milky Way" are concrete, high-scent cues; "Catalog"/"Learn" are
  abstract. On a discovery surface, concrete leaf labels win; progressive
  disclosure belongs in the nav, not the front door.
- Cards that share a route (the Explore scale shells all live at `/explore`)
  carry a `name` + `glyph` id so they render a distinct label + icon and a unique
  `{#each}` key. Everything else keys/labels off its `/route`.

**Nav width note (measured 2026-08).** The seven top-level items clear the
right-side controls comfortably at ≥1280px in every locale, but at ~1100–1300px
the wide locales (fr/es/pt-BR/ru) crunch — French essentially overflowed at
1150px. Fixed with a scoped `@media (min-width:641px) and (max-width:1319px)`
that tightens `.link` padding (10px → 6px) in that band; wide screens keep the
roomier spacing. Consolidating Fly+Plan into one group was considered and
**rejected** — it's a blunt tool for a narrow-band problem and both are core
features that warrant top-level prominence.

---

## §url-structure

```
/explore                                       Solar System Explorer
/plan                                          Mission Configurator (Mars default)
/plan?dest=jupiter&type=flyby                  Multi-destination (ADR-026): dest=mercury|venus|mars|jupiter|saturn; type=landing|flyby
/fly                                           Mission Arc (default scenario: ORRERY DEMO free-return)
/fly?mission=id                                Mission Arc (specific mission from library)
/fly?dest=jupiter&type=flyby&dep=N&tof=N       Mission Arc (synthesised from /plan selection, ADR-026)
/missions                                      Mission Catalog (all missions)
/missions?dest=MARS&status=ACTIVE&agency=NASA  Mission Catalog filtered (ADR-024)
/earth                                         Earth Orbit
/moon                                          Moon Map
/lab                                           Physics Lab (empty Notebook)
/lab?doc=<compact>                             Shared worksheet (URL-encoded card graph; grammar frozen in RFC-037 D-serialize)
```

Routes resolve client-side via SvelteKit's router. Servers must serve `index.html` for unmatched paths (`try_files $uri /index.html` in nginx, `404.html` SPA-redirect on GitHub Pages — see ADR-014).

---

## §shell-regions

Regions that persist across or within a screen.

**Nav bar** — `height: 52px`, `top: 0`, `left: 0`, `right: 0`. Present on all screens. Z-index 20. Contains wordmark, screen links, screen-specific controls.

**Right detail panel** — `width: 314px`, `top: 52px`, `right: 0`, `bottom: 68px` (68px on fly screen) or `bottom: 0`. Slides in on click. Present on: explore (planet/body panels), missions (mission detail), moon (site panels). Absent on: plan, fly, earth (these have dedicated HUD layouts).

**Bottom bar** — `height: 68px`, `bottom: 0`, `left: 0`, `right: 0`. Present on: fly (timeline scrubber, play/pause, speed controls). Absent on all other screens.

**HUD panels** — fly screen has four fixed-position panels (left identity, right navigation, right systems, CAPCOM panels). These are screen-specific, not shared shell regions.

---

## §shared-tokens

Tokens that apply across all surfaces. UXSes inherit these by name and do not redefine them locally.

### Colour tokens

```
color-bg:         #04040c    Background — near-black with blue undertone
color-accent:     #4466ff    Primary accent — blue
color-teal:       #4ecdc4    Secondary accent — teal (CAPCOM, active states)
color-mars:       #c1440e    Mars red — danger, Mars-specific
color-earth:      #4b9cd3    Earth blue — information, Earth-specific
color-gold:       #ffc850    Gold — Sun, perihelion, caution
color-text:       #ffffff    Primary text
color-text-dim:   rgba(255,255,255,0.35)   Dimmed text
color-text-faint: rgba(255,255,255,0.15)   Very faint text / labels
color-border:     rgba(255,255,255,0.07)   Standard border
color-panel-bg:   rgba(4,4,12,0.97)        Panel background
color-hud-bg:     rgba(5,5,20,0.88)        HUD panel background
```

### Link tier colours

```
color-tier-intro: #4ecdc4    Introductory links (Wikipedia, agency pages)
color-tier-core:  #7b9cff    Core links (MIT OCW, technical overviews)
color-tier-deep:  #ff9966    Deep links (peer-reviewed papers)
```

### Typography tokens

```
font-display:   'Bebas Neue', sans-serif    Titles, screen names, mission names
font-mono:      'Space Mono', monospace     All data, labels, HUD values, UI chrome
font-editorial: 'Crimson Pro', serif        Editorial descriptions, fact text (always italic)

size-nav-title:   26px    Nav bar wordmark
size-panel-title: 32–42px Panel planet/mission name (varies by name length)
size-hud-value:   10–16px HUD telemetry values
size-label:       7–8px   UI labels (Space Mono, letter-spacing 2px)
size-data:        9–11px  Data values
size-editorial:   12–13px Crimson Pro italic body text
```

### Spacing tokens

```
nav-height:     52px
panel-width:    314px
bottom-bar-h:   68px
panel-pad:      14px 18px
hud-pad:        12px 16px
border-radius:  4–6px   Panels and cards
```

### Agency colours

```
color-nasa:       #0B3D91
color-esa:        #003299
color-cnsa:       #DE2910
color-isro:       #FF9933
color-roscosmos:  #8B0000
color-jaxa:       #003087
color-spacex:     #005288
```

---

## §state-persistence

No state is persisted between sessions on the original surfaces. All screen state is held in memory and reset on navigation.

The one cross-surface exception is URL-encoded state: mission ID and filter params allow a specific view to be bookmarked and shared.

**The Physics Lab (`/lab`) is the deliberate exception** — a worksheet is a document the user builds, so it persists: URL-compact for sharing, `localStorage` for the working session, and a `.orrlab.json` export/import for durable documents (one codec, RFC-037 §5 / D-serialize). This is scoped to `/lab`; the other surfaces remain memory-only.

---

## §entry-points

SvelteKit's standard entry: `src/app.html` is the document shell; `src/routes/+layout.svelte` is the root layout that wraps all routes. Deep-linking to any route is supported by the server-side catch-all (`try_files $uri /index.html` for nginx, `404.html` SPA-redirect for GitHub Pages per ADR-014).

---

## §surface-map

```
                 ┌─────────────────────────────────────────┐
                 │         Persistent nav bar               │
                 │  MOON  EXPLORE  PLAN  FLY  MISSIONS  EARTH │
                 └─────────────────────────────────────────┘
                          │       │       │
              ┌───────────┘       │       └──────────┐
              ▼                   ▼                  ▼
         Moon Map          Solar System        Mission Catalog
         3D sphere         Explorer            card grid
         2D flat map       3D/2D toggle        → fly screen
              │                   │
              │            Mission Config
              │            porkchop plot
              │                   │
              └────────────►  Mission Arc ◄──────────┘
                           3D/2D toggle
                           CAPCOM mode

         Earth Orbit — standalone, no inbound navigation
```

---

## Changelog

| Version | Date | Change |
|---|---|---|
| v1.0 | April 2026 | Initial version — surfaces, tokens, shell regions extracted from 05_Design_System.md and six prototypes |
| v1.1 | April 2026 | §overview, §surfaces, §navigation, §url-structure, §entry-points updated to reflect History API routing (ADR-013) and SvelteKit routes/components (ADR-012). Hash-routing examples replaced with clean URLs. |
| v1.2 | August 2026 | Added §lab (Physics Lab surface — one card model, three views; UXS-015 / RFC-037 / PRD-033), §surfaces + §url-structure rows for `/lab`, and the §state-persistence exception for Lab worksheet persistence. |
| v1.3 | August 2026 | Added §nav-groups (EXPLORE / WORLDS / PLAN & FLY / CATALOG / LEARN top-level split; the 4 surface bodies moved out of EXPLORE into a new WORLDS group + `/worlds` TV hub) and §home-cards (the landing rebuilt as the whole nav tree, sectioned; every leaf a rich hand-drawn card). RFC-038. Known Universe epic renumbered to PRD-034 / RFC-039 / UXS-016 to clear the Physics Lab numbers. |
