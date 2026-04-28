# IA — Information Architecture
*Orrery · Reference document · v1.1 · April 2026*

This is the reference document for the UX plane. UXSes anchor to it by section. When surfaces, navigation, tokens, or shell regions change, this document is amended.

---

## §overview

Six screens, one persistent nav bar, SvelteKit's History API router. No login state. No user data. No persistence between sessions.

The narrative arc: Moon Map (prologue) → Solar System Explorer (Act 1) → Mission Configurator (Act 2) → Mission Arc (Act 3) → Mission Library (archive) → Earth Orbit (context). The nav bar presents all six destinations at all times. There is no enforced sequence.

---

## §surfaces

| Surface | Route | File | Primary canvas |
|---|---|---|---|
| Moon Map | `/moon` | `src/routes/moon/+page.svelte` | Three.js sphere + Canvas 2D flat map |
| Solar System Explorer | `/explore` | `src/routes/explore/+page.svelte` | Three.js 3D + Canvas 2D toggle |
| Mission Configurator | `/plan` | `src/routes/plan/+page.svelte` | Canvas 2D porkchop plot |
| Mission Arc | `/fly` | `src/routes/fly/+page.svelte` | Three.js 3D + Canvas 2D toggle |
| Mission Library | `/missions` | `src/routes/missions/+page.svelte` | CSS grid card layout |
| Earth Orbit | `/earth` | `src/routes/earth/+page.svelte` | Canvas 2D logarithmic scale |

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
| `/missions?dest=[MARS\|MOON]` | `/missions?dest=MARS` | Mission Library (pre-filtered) |

Navigation triggers: nav bar links, "PLAN A MISSION" button in explore screen, "FLY THIS MISSION" button in missions screen.

History API routing is locked in ADR-013 (superseding ADR-004). RFC-001 is closed — SvelteKit's router replaces the hand-written router originally proposed.

---

## §url-structure

```
/moon                Moon Map
/explore             Solar System Explorer
/plan                Mission Configurator
/fly                 Mission Arc (default scenario: ORRERY-1 free-return)
/fly?mission=id      Mission Arc (specific mission from library)
/missions            Mission Library (all missions)
/missions?dest=MARS  Mission Library (Mars only)
/earth               Earth Orbit
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

No state is persisted between sessions. `localStorage` and `sessionStorage` are not used. All screen state is held in memory and reset on navigation.

The one exception is URL-encoded state: mission ID and filter params in the URL hash allow a specific view to be bookmarked and shared.

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
         Moon Map          Solar System        Mission Library
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
