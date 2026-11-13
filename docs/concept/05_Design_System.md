# 05 · Orrery — Design System
*April 2026 · v1.0 · Part of the Orrery Concept Package (00 through 05)*

> **Historical note (May 2026)** — this doc captures the design system as it stood at prototype stage (April 2026). The production app preserves the design language but ships additional surfaces (locale picker in Nav, REFERENCES diorama, LAYERS panel in /explore, CAPCOM panel in /fly, timeline navigator in /missions, mobile bottom-sheet panels per ADR-018, panel galleries via ADR-026 / ADR-027). For current screens see [`../user-guide.md`](../guides/user-guide.md). The "Three.js from CDN" / "six independent HTML files" lines below are superseded by ADR-016 + ADR-012.

---

## Purpose

This document captures the visual language, component patterns, and interaction conventions established through six prototype screens. It is the reference for building new screens consistently and the primary input for 04 Technical Architecture — particularly where design decisions constrain technical choices.

Every pattern here was arrived at through iteration, not specification upfront. The prototypes are the ground truth. This document distills them.

---

## 1. Brand identity

### 1.1 Name and tone

**Name:** Orrery — a mechanical model of the solar system. The name does not need explanation in context; the product explains itself.

**Editorial voice:** Direct. Precise. Occasionally poetic where the science earns it. Never dumbed down. Never inflated. The descriptions of Mars 3's 14.5 seconds of silence, of Cernan's last words, of Duke's family photo on the lunar surface — these are written in the same register as the vis-viva equation. Science and emotion at the same level.

**Tone reference:** WIRED magazine spread meets NASA trajectory diagram. Neither dominates. Both are present.

### 1.2 Design principles

1. **The beauty is the physics working.** Visual quality is not decoration — it is how the user understands what they are seeing. The luminous Keplerian arc is beautiful because it is correct.
2. **Honest about gaps.** Data quality badges, reconstruction notes, and placeholder states are first-class design elements. Never hide a gap.
3. **Maximum credit to original owners.** Every image, every logo, every number has a source. Attribution is part of the visual design.
4. **Dark, editorial, precise.** Not a consumer app. Not a game. The visual language is closer to a scientific publication than a dashboard.

---

## 2. Colour system

### 2.1 Core palette

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#04040c` | Page background. Near-black with a slight blue undertone — space, not void |
| `bg-surface` | `rgba(10, 10, 20, 0.95)` | Cards, panels |
| `bg-nav` | `rgba(4, 4, 12, 0.88–0.97)` | Navigation bar, bottom bar, filter strips |
| `bg-panel` | `rgba(4, 4, 12, 0.96–0.98)` | Detail panels, preview panels |
| `border-subtle` | `rgba(255, 255, 255, 0.07)` | Default borders |
| `border-active` | `rgba(255, 255, 255, 0.18)` | Hover state borders |
| `accent` (`--color-accent`) | `#5070ff` / `rgba(80, 112, 255)` | The one UI accent (UX A3, UXD-001). Links, selection, active states, chips, HUD values, mission arc. Tints: `--color-accent-soft/-edge/-strong` (0.12 / 0.35 / 0.7); hover and focus `#8aa0ff` |
| `state` (`--color-state`) | `#889fe7` | Annotation rings, hover, status; the colour for small text on a lifted card |
| `ok` (`--color-ok`) | `#4ade80` | Success and confirmation states (a green, not an accent) |
| `text-primary` | `#ffffff` | Primary text, selected labels |
| `text-secondary` | `rgba(255, 255, 255, 0.55–0.65)` | Body text, descriptions |
| `text-dim` | `rgba(255, 255, 255, 0.25–0.35)` | Labels, metadata |
| `text-faint` | `rgba(255, 255, 255, 0.12–0.18)` | Decorative text, watermarks |

**Contrast rule (UX A3).** The accent `#5070ff` is 4.96:1 on the page and the HUD, 4.37 on a 7 % lifted card and 3.84 on a 12 % lift. Text at or above 14 px bold / 18 px, borders, fills, glyphs and rings use the accent; smaller text on a lifted surface uses `--color-state` (6.1:1 or better). A solid accent fill takes dark text (`#04040c`, 4.96:1), not white (4.12:1). UAE/MBRSC (agency) and LEO (orbit regime) below are identity / data colours: they keep `#4ecdc4` (palette review at the end of the redesign), they are not UI accents.

### 2.2 Status colours

| Status | Colour | Background |
|---|---|---|
| ACTIVE | `#889fe7` | `rgba(80, 112, 255, 0.15)` |
| FLOWN | `rgba(255,255,255,0.45)` | `rgba(255,255,255,0.06)` |
| PLANNED | `#7b9cff` | `rgba(123,156,255,0.12)` |
| MINE / personal | `#889fe7` | `rgba(80,112,255,0.12)` |
| PRIVATE sector | `#ff9940` | `rgba(255,153,0,0.12)` |
| RECONSTRUCTED | `#ff8060` | `rgba(240,80,40,0.10)` |
| PARTIAL DATA | `#f0b428` | `rgba(240,180,40,0.10)` |

### 2.3 Educational tier colours

The three-tier educational link system uses a consistent colour language across all screens:

| Tier | Label colour | Background | Dot |
|---|---|---|---|
| INTRO | `#889fe7` | `#0d1535` | `#889fe7` |
| CORE | `#7b9cff` | `#0d1535` | `#5070ff` |
| DEEP | `#ff9090` | `#2e0d0d` | `#ff4444` |

### 2.4 Agency colours

Confirmed by the operator on 2026-11-13 (the swatch page "Orrery agency palette"), teal and cyan
identity colours included. The code is the source: `src/lib/agencies.ts` (badge fill, card and
mission accents; a compound agency takes its first partner's colour) and
`src/lib/surface-map/nation-palette.ts` (surface-site markers, the nation legend, the Worlds' INDEX dots (§5.13) and the Earth
regime panel's resident dots, which use a lighter chip colour for some agencies). A badge's text is
white or dark by contrast.

| Agency | Badge | Map / regime chip (where it differs) |
|---|---|---|
| NASA | `#0B3D91` | `#3b82f6` |
| ESA | `#003247` | `#1d4ed8` |
| JAXA | `#003087` | `#1d4ed8` |
| ISRO | `#FF9933` | `#f97316` |
| CNSA | `#DE2910` | `#dc2626` |
| CMSA | `#DE2910` | — |
| CASC | `#DE2910` | — |
| Roscosmos | `#cc4444` | `#ef4444` |
| CSA | `#D52B1E` | — |
| UAESA | `#00833F` | `#00732F` |
| USSF | `#1D2951` | — |
| NOAA | `#003087` | — |
| USGS | `#00833F` | — |
| ASI | `#008C45` | `#1d4ed8` |
| SpaceX | `#005288` | `#3b82f6` |
| Boeing | `#1D4E89` | — |
| Northrop Grumman | `#005EB8` | — |
| ULA | `#1A3668` | — |
| Blue Origin | `#00264D` | — |
| Arianespace | `#0033A0` | — |
| Axiom Space | `#1F3A93` | — |
| Intuitive Machines | `#00A3E0` | — |
| ispace | `#003E7E` | — |
| SpaceIL | `#0038B8` | `#1d4ed8` |
| Amazon | `#FF9900` | — |
| SES | `#003C71` | — |
| Sirius XM | `#0067B1` | — |
| Viasat | `#005CAB` | — |
| Eutelsat OneWeb | `#003DA5` | — |
| Iridium | `#00477F` | — |
| Planet Labs | `#1B9E77` | — |
| Rocket Lab | `#000000` | `#00A6A6` |
| Avio | `#003c71` | — |
| Firefly | `#ff6600` | — |
| Relativity | `#5d2a86` | — |
| MHI | `#cc0000` | — |
| Astra | `#000000` | — |

Nations (surface-site markers and the nation legend):

| Nation | Colour |
|---|---|
| USA | `#0B3D91` |
| USSR/Russia | `#8B0000` |
| Europe | `#003299` |
| China | `#DE2910` |
| India | `#FF9933` |
| Japan | `#003087` |
| UAE | `#00732F` |
| Israel | `#0038B8` |
| New Zealand | `#00A6A6` |
| South Korea | `#5B8DEF` |
| North Korea | `#9B59B6` |
| Iran | `#6BBF59` |
| Australia | `#E0B400` |
| Brazil | `#C2185B` |

### 2.5 Orbital regime colours (Earth Orbit)

| Regime | Colour |
|---|---|
| LEO | `#4ecdc4` |
| MEO | `#7b9cff` |
| GEO | `#ffc850` |
| HEO | `#ff8c3c` |
| MOON distance | `#aaaacc` |
| L2 | `#ffd700` |

These are data colours: the dot of a ruler row and the regime panel's eyebrow keep them (teal LEO included). The ruler's highlight in the scene is NOT drawn in them but in the highlight blue `#889fe7`, so no ring is teal (§5.16, [UXD-024](../uxs/decisions/UXD-024-orbit-ruler-one-row-draws-its-regime.md)).

---

## 3. Typography

> Type scale and the 11 px floor: decision record [UXD-002](../uxs/decisions/UXD-002-type-scale-and-the-11px-floor.md).

### 3.1 Typefaces

Three typefaces only, all loaded from Google Fonts:

```
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700
  &family=Bebas+Neue
  &family=Crimson+Pro:ital,wght@0,400;0,600;1,400
  &display=swap');
```

| Face | Usage | Character |
|---|---|---|
| **Bebas Neue** | Hero names, screen titles, mission names | All-caps, wide letter-spacing (2–4px). The "poster" voice — bold, spatial, unapologetic |
| **Space Mono** | All UI elements — labels, data values, buttons, nav, metadata | Monospace precision. Numbers align. Technical without being cold |
| **Crimson Pro italic** | Real quotes and photo captions only (14px minimum) | Humanist serif. The "historian" voice — kept for the few places that are literally quoted or captioned |

Never mix faces within a semantic role. Descriptions and overviews are Space Mono upright (lead size). Data is always Space Mono. Titles are always Bebas Neue. Nothing is set below 11px (UX A1 / Q2).

### 3.2 Type scale

| Role | Face | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| Page title (text pages, `.page-title`) | Bebas Neue | `clamp(40px, 8vw, 64px)` (`--size-title`) | — | 1px |
| Screen title | Bebas Neue | 20–26px | — | 3–4px |
| Mission/object name (hero) | Bebas Neue | 26–42px | — | 2–3px |
| Mission name (card) | Bebas Neue | 20–26px | — | 2px |
| Section label (`.page-section-label`) | Space Mono | 11px, 60% white, uppercase | 700 | 3px |
| Page section title (`.page-section-title`) | Bebas Neue | 28px | — | 2px |
| Data label | Space Mono | 11px (60% white) | 400 | 2px |
| Data value | Space Mono | 12–14px | 700 | — |
| Body label / button | Space Mono | 11–12px | 700 | 2px |
| Metadata / credit | Space Mono | 11px | 400 | 1px |
| Description / lead | Space Mono | 16px, 15px under 600px width (`--size-lead`) | 400 upright | — |
| Photo caption / quote | Crimson Pro | 14px (`--size-caption`) | 400 italic | — |

### 3.3 Type rendering notes

- All labels use `letter-spacing` explicitly — never rely on browser defaults
- Section labels are uppercase through CSS `text-transform` (`.page-section-label`), so translations keep their own case in the source
- Bebas Neue renders well at all sizes; use it large — 26px minimum for mission names
- Floor is 11px for every text (UX A1 / Q2); labels 11px at 60% white (`--size-label`, `--color-text-label`), meta 12px, body 14px, lead 15–16px
- Crimson Pro italic is only for real quotes and photo captions, never for data or overviews

---

## 4. Spacing & layout

### 4.1 Fixed dimensions

| Element | Height |
|---|---|
| Navigation bar | 52px |
| Bottom bar | 60–68px |
| Filter strip | ~42px (varies with content) |

### 4.2 Panel widths

| Panel | Width |
|---|---|
| Mission library preview | 360px |
| Solar system detail panel | 314px |
| Mission arc HUD left | 220px |
| Mission arc HUD right | 220px |
| Moon map detail panel | 330px |
| Earth orbit detail panel | 320px |

### 4.3 Card grid

Cards use CSS Grid with `auto-fill` and `minmax(280–290px, 1fr)`. Gap is 12–14px. Cards animate in with `fadeUp` staggered by 35–40ms per card.

### 4.4 Internal spacing

| Context | Value |
|---|---|
| Card padding (sides) | 13–16px |
| Panel padding (sides) | 18–20px |
| Stats grid gap | 7–8px |
| Section label bottom margin | 4–6px |
| Icon + text gap | 5–8px |

### 4.5 Border radius

| Element | Radius |
|---|---|
| Cards | 8px |
| Panels | 0 (flush to screen edge) |
| Stats cells | 4px |
| Chip (§5.7) | 4px |
| Pills (status badges) | 3px |
| Close button | 50% (circle) |
| Agency logo container | 6–8px |

### 4.6 Page shell (text pages, UXD-012)

Every text page (credits, colophon, library, gallery and its sub-pages, posters, patches, sourcing, programs, privacy, live, essays, science, the four hubs, the entity pages) uses `src/lib/styles/page-shell.css`. A page adds the classes to its own elements and defines no h1, lead or container rules of its own; no page adds `--nav-height` padding (the nav is sticky and already takes its height in flow).

| Class | Values |
|---|---|
| `.page-shell` | `max-width: 1080px`, centred, `padding: 24px 20px 80px`; `--reading` 760px, `--wide` 1400px, `--inset` (the science host owns the container) |
| `.page-crumb` | Space Mono 11px, 1px spacing, 60% white |
| `.page-title` | Bebas Neue `--size-title` (`clamp(40px, 8vw, 64px)`), 1px spacing, line-height 1.05 |
| `.page-lead` | `--size-lead` (16px, 15px under 600px) upright Space Mono, 78% white, 64ch |
| `.page-section-label` | §5.8 values, uppercase; `--rule` adds the top rule |
| `.page-section-title` | Bebas Neue 28px, 2px spacing |

Not on the shell: the home page (home slice, H8), the scene routes, the Lab, the missions/launches/fleet browse tools, card stubs and dev pages.

### 4.7 Layering (z-index)

The layers that meet on `/explore` and the other scene routes, bottom to top. A new fixed element takes a slot in this table; it does not pick a number to win a local fight.

| z-index | Layer | Source |
|---|---|---|
| 7 | The bottom-left HUD column of `/earth`, `/moon`, `/mars` (readout, locate chip, orbit ruler; the ruler inside it has no layer of its own) | `HudStackBL.svelte` |
| 8 | The `/explore` scale navigator while its ladder is closed | `ScaleNav.svelte` |
| 28 | Regime panel (the Earth-orbit ruler), under a satellite panel opened from it | `RegimePanel.svelte` (`zIndex={28}`) |
| 30 | Detail panel (default, `--panel-z`) | `Panel.svelte` |
| 39 | Nav dropdown click-catcher | `Nav.svelte` (`.group-backdrop`) |
| 40 | Nav bar; the Phase panel (`zIndex={40}`) | `Nav.svelte`, `PhasePanel.svelte` |
| 44 | INDEX handle (§5.13) | `index-panel.css` (`.scale-index-handle`) |
| 45 | INDEX rail (§5.13) | `index-panel.css` (`.scale-index`) |
| 46 | The scale navigator while its ladder is open, so the rungs are not covered by the rail. Beside a docked drawer the row moves left of it (§5.15) instead of rising above it: the drawer's bar carries Share and ×, which a higher layer would cover | `ScaleNav.svelte` |
| 79 / 80 | Touch portrait only: the panel's backdrop and the panel as a bottom sheet (`--panel-z` + 49 and + 50) | `Panel.svelte` |
| 88 / 89 | Settings backdrop and the mobile nav drawer's backdrop (88); the mobile nav drawer (89) | `SensorySheet.svelte`, `Nav.svelte` |
| 90 | DebugPanel; the settings sheet (`SensorySheet`) | `DebugPanel.svelte`, `SensorySheet.svelte` |
| 91 / 92 | More menu backdrop / More menu (above the DebugPanel and the settings sheet, which open from the same corner) | `Nav.svelte` |
| 95 | First-time sensory hint (toast) | `Nav.svelte` (`.sensory-hint`) |

Rules:

- A panel (30) sits under the nav bar (40). The INDEX rail (45) sits over the panels and the nav bar; the touch portrait bottom sheet (80) sits over the rail.
- The scale navigator is the one element that changes layer by state: 8 at rest (under panels, so it never covers a panel bar at the solar scale), 46 while its ladder is open (over the INDEX rail, which otherwise covers the rungs and swallows the clicks).
- The nav's dropdown menu (`.group-menu`, 50) is inside the nav's own stacking context (40); its number orders it among the nav's children only.
- Panel stacking inside a route is set by `Panel`'s `zIndex` prop, never by a literal in the page.

---

## 5. Component library

### 5.1 Navigation bar

Consistent across all six screens. Height 52px (`--nav-bar-height`, one token). Translucent dark background with `backdrop-filter: blur(14px)`. Three zones: left (wordmark), centre (nav links), right (audio tour, locale, science lens, settings, More). Right-hand controls share one box, `.nav-btn`: 32px on a fine pointer, 44px on touch (`--nav-btn-fine`, `--nav-btn-touch`), 4px corners, outline at rest and the chip active look when on ([UXD-014](../uxs/decisions/UXD-014-one-chip-and-filter.md)). High contrast, Share and Debug sit in the More menu, a menu button whose panel uses the group-menu chrome; on phones they are drawer rows ([UXD-016](../uxs/decisions/UXD-016-compact-nav-and-more-menu.md)).

```
[ORRERY]  [HOME | EXPLORE ▾ | WORLDS ▾ | FLY | PLAN | CATALOG ▾ | LEARN ▾]  [audio | EN | lens | settings | ⋯]
```

Active nav item: white text, `rgba(68,102,255,0.2)` background, `rgba(68,102,255,0.45)` border.

The wordmark is always `font-family: 'Bebas Neue'; font-size: 26px; letter-spacing: 4px`. The subtitle is Space Mono 11px at 60% opacity.

### 5.2 3D / 2D view toggle

A single toggle chip (`<Chip kind="toggle">`, §5.7), whose label the page supplies, with `aria-pressed` true while 2D is showing. It has no container: the chip is outline at rest and takes the on look (soft accent fill, accent edge, white text; the world tint on `/moon`, `/mars`, `/venus`) in 2D.

The toggle controls `opacity` and `pointer-events` on two sibling elements — the canvas (2D) and the renderer div (3D). Transition is 0.4–0.5s ease on opacity.

This pattern appears on P01, P03, P05, and P06. It must be identical on every screen.

### 5.3 Detail panel (right slide-in)

Used on the solar system explorer, mission arc, Earth orbit viewer, and Moon map. Slides in from the right. Pushes the grid content left in the mission library (using `margin-right`). Overlaps the 3D view on other screens.

```css
position: absolute; top: 52px; right: 0; bottom: 60–68px;
background: rgba(4,4,12,0.96-0.98);
border-left: 1px solid rgba(255,255,255,0.07);
backdrop-filter: blur(18px);
animation: slideIn / fadeIn 0.22s ease;
```

The panel always contains, top to bottom:
0. Header (`.panel-head`, fixed above the scroll container, solid `--color-panel-bg`, UXD-018 as amended by B1.1): one block, no separate bar row. Line 1 is the eyebrow (the kind line: agency badge and status, the type, a category and designation) with, at the inline end of its first row, only back `←` (after a card link) and close `×` (operator 2026-11-13): `<Chip>`s drawn at the badges' 24px, square, with a 44px tap area on touch through an invisible extension; they sit on the left in RTL. Share is not in the header: it is the last chip of the action row (1a). Line 2 is the entity name at the full panel width: a long name wraps under the actions, never beside them. A panel with no eyebrow (a place with only a name) leaves line 1 to the actions. The header does not scroll with the content, so the name is always visible and nothing scrolls under the actions. `Panel` takes the two parts as the `eyebrow` and `heading` snippets and owns the layout. Line 1 is one centre line: the agency badge, the status chip and × have the same 24px height; badges that wrap keep × on their first row, and a 6px gap separates line 1 from the name.
1. Identity details below the header (key stats, type line, tagline)
1a. Action row (`PanelActions`): at most three chips, in-scene, then view, then simulate, then plan, then Share last when the entity has a collectible card (opens the card overlay; `Panel` provides it, a panel with no row of its own gets one holding Share); above the hero, on every tab; absent when there is no action and no card. Nothing is stacked at the foot of a panel.
2. Hero image (no hover glow; keyboard focus draws an inset 2px `--color-focus` ring), then the tab strip (OVERVIEW | GALLERY | LEARN) — where applicable
2a. Star, outer-scale and black-hole panels (`UniversePanelBody`, [UXD-023](../uxs/decisions/UXD-023-star-and-outer-panels-follow-the-planet-pattern.md)): the same order, one hero or none (no hero, no slot; a part-of photo captions what is pictured), GALLERY second only with two or more images, a star's IN THE SKY tab holds the constellation finder; lead `.editorial`, facts in the planet cell look; no colour or size of their own
3. Stats grid: three cells per row (`repeat(3, minmax(0, 1fr))`), so up to nine values take three rows (UXD-018, amendment "Overview three per row")
4. Signature element (the "still on the surface" section for Moon; the "scale fact" for Earth orbit; the editorial fact for planets)
5. Description (lead text, Space Mono upright)
5a. Science cards (`ScienceCard`): at most five distinct `/science` sections, through `pickScienceLinks` (`src/lib/science-links.ts`, [UXD-022](../uxs/decisions/UXD-022-science-link-lists.md)); `expanded={false}` (title and intro) for the compact lists of a station module and an Earth object; a body with no curated list shows none, there is no per-type default
6. Educational links
7. Credit footer

Rule and reasoning: [UXD-018](../uxs/decisions/UXD-018-panel-shell-and-actions.md).

The star and deep-sky panels take their editorial text from the reader's locale overlay (`i18n-src/<locale>/universe/<kind>/<id>.json`, en-US as the fallback): `fact` is the lead (`.editorial`, item 4) and `bio` the body (`.prose`, item 5), above the values grid. The deep-sky panel keeps its gallery caption after the bio and its Data sources block ahead of the credit; an object with no overlay shows none of it, no placeholder.

### 5.4 Card (mission library)

Cards have a 3px top border in the agency colour. The rest of the border is `rgba(255,255,255,0.07)`, shifting to `rgba(255,255,255,0.18)` on hover with a -2px Y translate.

Structure:
1. 3px agency colour top border
2. Header: agency logo (52×52px) + mission name (Bebas Neue) + status pills + data quality badge + collaborator chips
3. Stats strip: 3-column grid (departure / transit / Δv or payload) — `rgba(7,7,15,1)` background
4. Description: Space Mono upright + "first" badge if applicable
5. Bottom prompt: "CLICK TO PREVIEW ›" — Space Mono 11px, `text-dim`

Selected card: `border-color: rgba(68,102,255,0.7)` + `box-shadow: 0 0 20px rgba(68,102,255,0.2)`.

### 5.5 Status pill

```
[● ACTIVE]  [FLOWN]  [◌ PLANNED]  [★ MINE]
```

All pills: `font-size: 11px; letter-spacing: 2px; font-weight: 700; padding: 3px 8px; border-radius: 3px`.

The ACTIVE pill includes a pulsing dot (`animation: pulse 1.5s infinite`) in the status colour.

### 5.6 Agency logo

52×52px (in cards), 36–48px (in panel headers). Always uses the "fallback always visible, real image on top" pattern:

```html
<div style="position:relative; width:52px; height:52px; border-radius:8px; background:[agency-bg]; overflow:hidden;">
  <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:Space Mono; font-weight:700; color:[agency-color];">ABBR</div>
  <img src="[wikimedia-url]" style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:5px;">
</div>
```

The abbreviation is always visible. The real logo loads on top. Never breaks offline. In production: host logos locally from official media kits.

### 5.7 Chip (toggle, filter, choice, HUD action)

One control for every toggle, filter, choice and HUD action, drawn by `src/lib/styles/chip.css` and rendered by `<Chip>` ([UXD-014](../uxs/decisions/UXD-014-one-chip-and-filter.md)). A page never defines its own chip, pill or toggle rules.

Layer chips sit in one flat horizontal row (`LayerChipRow`, [UXD-015](../uxs/decisions/UXD-015-flat-chip-row.md)): 6px gaps, wrapping between chips where the width runs out, no captions, groups or master chips, and on a touch drawer the same run of 44px chips. On a fine pointer the view actions (2D, RESET VIEW, SPIN, AR, SKY) and the layer chips are one row: the actions group, a 12px gap, then the layer group, wrapping between the groups. RESET VIEW is always in its slot (disabled, not removed) so no chip shifts. On `/explore` ICONIC MISSIONS is the first layer chip, ahead of PLANETS, DWARFS, COMETS and ISM, because it opens the legend below the row (C7, [UXD-026](../uxs/decisions/UXD-026-iconic-missions-legend-and-milestone-boxes.md)).

```css
min-height: 30px;               /* fine pointer; 44px on (pointer: coarse) */
padding: 0 12px;
font: 700 11px Space Mono; letter-spacing: 1px; text-transform: uppercase;
border: 1px solid var(--color-chip-edge);     /* outline at rest, rgba(255,255,255,0.18) */
border-radius: 4px;
color: var(--color-chip-text);              /* rgba(255,255,255,0.72) */
background: var(--color-chip-glass);         /* rgba(8,10,22,0.65) */
```

The rest values are the tokens `--color-chip-glass`, `--color-chip-edge` and `--color-chip-text` (`src/lib/styles/tokens.css`); a literal never replaces them.

Hover: `border-color: var(--color-state)`, white text. Focus-visible: `2px solid var(--color-focus)`, offset 2px. On (`aria-pressed="true"`, `aria-checked="true"`): fill `color-mix(in srgb, var(--color-accent) 22%, glass)`, edge `var(--color-accent)`, white text. The Worlds (`/moon`, `/mars`, `/venus`) set `--chip-tint` to their world colour, used for the edge and fill of an on chip and the hover edge of every chip; Earth keeps the accent. `--chip-tone` is a per-chip data colour (fleet status, epoch band, nation, live): the leading dot and the on edge. Disabled: 42 % opacity. Kinds: `toggle` (`aria-pressed`), `choice` (`role="radio"` in a `ChipGroup` radiogroup with arrow keys), `action`, `link`. A count badge follows the label. Small controls that are not chips (Why?, provenance, timeline names) get a 24 px hit area with the `.ui-hit` class. A non-interactive label with the on look (the core tier of a link list) is `.ui-chip-label`, a span, never a control.

### 5.7a FILTERS strip

A compact chip on the left above the grid: `FILTERS  12 / 150  ▾`. The count sits right after the label (accent state colour when a filter is on, 60 % white for the total alone), the chevron last. One label key (`filters_eyebrow`), uppercase by CSS. The visible count is `aria-hidden`; a visually hidden sibling reads "12 of 150" (`filters_count_of`, word order per language). CLEAR FILTERS is a quiet chip with a `×` beside it while a filter is on. Used by `/missions`, `/fleet` and `/missions/launches`.

### 5.8 Section label (grid divider)

```css
grid-column: 1 / -1;
font-size: 11px; letter-spacing: 3px; font-weight: 700;
color: rgba(255,255,255,0.6);
border-bottom: 1px solid rgba(255,255,255,0.05);
padding: 6px 0 4px;
```

Content examples: `YOUR MISSIONS`, `CURRENTLY ACTIVE`, `MISSION ARCHIVE — PATH TO MARS`. The same values are the text pages' section label, `.page-section-label` (§4.6, UXD-012).

### 5.9 Stats cell

```css
background: rgba(255,255,255,0.03);
border: 1px solid rgba(255,255,255,0.06);
border-radius: 4px;
padding: 8–9px 10–11px;
```

Label: Space Mono 11px, letter-spacing 2px, `rgba(255,255,255,0.6)`. Value: Space Mono 12px, weight 700, white.

### 5.10 Educational link row

A single link entry within a tier section:

```
[●] Link label text                                              ↗
```

The dot is 5×5px in the tier colour. The label is Space Mono 11px at 65–68% opacity. The arrow `↗` is Space Mono at 20% opacity. The full row has 7–8px horizontal padding, 7px vertical, 4px border radius, and transitions to `rgba(255,255,255,0.05–0.07)` on hover.

### 5.11 Gallery grid

3×3 grid of images, gap 4px. Each cell: `aspect-ratio: 1; overflow: hidden; border-radius: 3px; background: #0a0a18`. The image is `object-fit: cover; loading: lazy`. Credit footer below the grid: Space Mono 11px at 60% opacity.

For NASA missions: live-fetched from the NASA Images API. For others: curated Wikimedia Commons URLs. For unresolved gaps: honest placeholder text.

### 5.12 HUD (mission arc)

The mission arc fly screen uses HTML overlays over the full-screen 3D renderer, positioned absolute. Four HUD zones:

| Zone | Position | Content |
|---|---|---|
| Top-left | `top: 66px; left: 22px` | Mission identity (name, vehicle, payload) + date + elapsed time |
| Left panel | `top: 230px; left: 22px; width: 220px` | Navigation telemetry (velocity, distances, sun distance) |
| Right panel | `top: 66px; right: 22px; width: 220px` | Systems (fuel %, Δv remaining, ETA, mission phase) |
| Bottom bar | `bottom: 16px; left: 50%; transform: translateX(-50%)` | Timeline scrubber + play/pause + speed controls |

All HUD panels: `background: rgba(4,4,12,0.82); border: 1px solid rgba(255,255,255,0.07); backdrop-filter: blur(12px); border-radius: 6px`.

### 5.13 INDEX panel (one on every /explore scale)

The searchable, keyboard-reachable list of every selectable object of the scale on screen: the DOM mirror of the canvas ([UXD-017](../uxs/decisions/UXD-017-one-index-on-every-scale.md)). One component, `ScaleIndex.svelte`, one stylesheet, `src/lib/styles/index-panel.css`, one open state, on all eight scales (solar system, neighbourhood, Milky Way, Local Group, Local Sheet, Virgo, Laniakea, Cosmic web). The Worlds (`/moon`, `/mars`, `/venus`, `/earth`) still use `SurfaceIndexPanel`, which shares the look and moves onto `ScaleIndex` in a later slice.

```
 handle              rail (320px)
┌──┐   ┌────────────────────────────────┐
│IN│   │ [ search…            ] [ × ]   │  search + close chip
│DE│   │ [All] [★ Notable] [Kind] …     │  kind chips (ChipGroup)
│X │   │ 12 / 150                       │  count
└──┘   │ SECTION                        │  section label
       │ ● Name              meta    ↗  │  row + page link
       └────────────────────────────────┘
```

**Handle.** A pull-out tab on the left edge at every viewport, vertically centred (`top: 50%`), away from the top-left controls. A `<Chip kind="toggle">` labelled INDEX, set vertically (`writing-mode: vertical-rl`), `aria-pressed` while the rail is open. Its accessible name says which scale's INDEX it opens. `z-index: 44`; in a window 600px wide or less with a mouse it is 25, under the detail panel (z 30), which is then as wide as the window (the Worlds' handle does the same); on touch the panel is a bottom sheet and covers it already.

**Rail.** `aside.scale-index`, `position: fixed`, `left: 12px`, `bottom: 12px`, width `min(320px, 100vw − 24px)`, 12px padding, `--color-panel-bg`, 1px `--color-border`, 10px radius, `backdrop-filter: blur(8px)`, `z-index: 45`. The top edge is `--index-top`: the measured bottom of the HUD chip row plus 8px (152px before it is measured; the HUD wraps on narrow windows and is absent on touch). In a window 500px high or less (a phone held sideways) the rail starts at `--nav-height` + 8px, keeps at least three rows and scrolls as a whole.

**Parts, top to bottom.**

| Part | Look |
|---|---|
| Search | `type="search"`, 12px, 6px radius; focus draws the `--color-accent-strong` edge |
| Close chip | `<Chip kind="action" class="ui-chip--close">` with `×` beside the search: a 30px / 44px square, the same close chip as the panel header of §5.3 and every dialog, overlay, drawer and banner close (UXD-014), in the header outside the scrolling list, the same close control as the panel bar of §5.3 (B1 brief O6, [UXD-018](../uxs/decisions/UXD-018-panel-shell-and-actions.md)) |
| Kind chips | `ChipGroup` radiogroup of `<Chip kind="choice">`: All, then the scale's kinds (the solar system: Planets, Dwarfs, Asteroids with Arrokoth, Moons, Comets with ʻOumuamua; only the Sun and the two belts are under All alone), plus Notable objects where the data has headliners; at most five besides All; no distance or size filter. A chip that filters on a badge carries its glyph (⊕ ★ ◈ ●). A chip with no matching row is not shown. **Folded** (C6-F): only the chips that fit one line beside All are drawn (the widths are measured, so it follows the language; Planets and Moons are taken first on the solar system, otherwise the scale's own order); the others are in a second radiogroup that opens in place under the count, behind the FILTERS button |
| FILTERS button (C6-F) | `IndexFiltersToggle.svelte` on every INDEX: an action chip (`ui-chip`, `.idx-filters-btn`) with the word `filters_eyebrow` (FILTERS), a ▾ when closed and ▴ when open (11px, `aria-hidden`), `aria-expanded` and `aria-controls` on the folded region; when a folded filter is on, its number sits before the chevron in `--color-accent-strong` (the solar INDEX: 1 when the active chip is in the fold; the Worlds: how many of agency, era and status are not on All). It sits on the count line, at the inline end, and shows only when something is folded. Open, its edge is `--color-accent`. The fold is `.idx-fold`: groups of a small label (`--size-label`, 1.5px, uppercase, dim: AGENCY, ERA, STATUS on the Worlds) over their chips, 6px between groups, hidden by the `hidden` attribute |
| Count | `shown / total`, `--size-label`, `--color-text-dim` |
| Section label | Space Mono `--size-label`, uppercase, 1.5px spacing, `--color-text-dim`, top rule; absent at the head of an unsectioned list |
| Row | A button, 8px / 10px padding, 6px radius. Lead slot (26px wide, so names line up; 28px on the solar-system scale): an 8px colour dot (a solar-system body's own colour) or the badges ⊕ system, ◈ culture door, ★ headliner, ● black hole. Name 13px, ellipsis. Meta (a constellation, the kind) in `--size-label`, `--color-state`, at most 45% of the row beside the name. **The solar-system rows are two lines** (C6): a grid of the 28px lead slot (spanning both lines) and the name over the meta, **the lead slot holding the body's round photo** (`EntityThumb`, L45, [UXD-025](../uxs/decisions/UXD-025-lists-carry-a-round-photo.md): 40 of the 51 rows, ring the planet's colour or neutral, the 11 rows with no image keep the dot, centred in the same slot; only on this scale, and only once the INDEX is open: a closed INDEX is `hidden` and its lazy images do not load), which runs the full width, wraps after a " · " (two lines at most, then an ellipsis; no-break spaces keep "139,820 km" whole) and carries a `title` with the whole text; the meta is distance, diameter and, for a planet, its listed moons (`1.52 AU · 6,779 km · 2 major moons`; dwarf, asteroid, Kuiper object `2.77 AU · 939 km`; comet its distance; moon `Jupiter · 3,643 km`; belt `2.2–3.2 AU`; the Sun "Star") in the reader's number and unit forms (`format.ts` `planetIndexMeta` and its siblings). The other seven scales keep one line |
| Row states | Hover and focus: 18% accent fill. Selected (`aria-current`): 28% accent fill, 55% accent edge. A fiction row (Gargantua): dashed edge, dim text |
| ↗ page link | Beside the row, only where the object has an entity page. 14px glyph; 44px square on a coarse pointer, 30px wide on a fine one (`(hover: hover) and (pointer: fine)`) |
| Empty | "No match" line, 11px, dim, centred |

**Keyboard.** One Tab stop for the whole list (`use:roving`, vertical, wraps); ↑ ↓ or D-pad move over the rows and the ↗ links; Enter selects.

**Hidden but in the DOM.** One instance per scale is always mounted; a closed instance, or one whose scale is not on screen, has the `hidden` attribute, so its rows stay in the page. `/explore` is one prerendered HTML file for every `?context=`, so all eight lists are in it. Before hydration only the rows that have a page are written, as plain link rows, so the static page holds every entity link and no dead button; after hydration every row is a button and the ↗ link joins it.

**One open state.** `indexOpen` is one flag for all eight scales. On a scale jump it stays open on a fine pointer and closes on a coarse one, where the 320px rail covers most of the width. The rail is not offered while a takeover owns the screen (black-hole lensing view, deep-sky immersion, an exoplanet's BodyScene), outside the solar system in the 2D view, or in Exhibit Mode. Selecting a black-hole row closes it.

**The Worlds' index** (`SurfaceIndexPanel` on `/moon /mars /venus /earth`, still its own component) draws a site's 8px dot in its nation's colour (`colorFor(site)`, the nation legend's swatch colour, §2.4) with a 1px `rgba(255,255,255,0.35)` ring so the dark navy and dark red read on the panel; an Earth object keeps its own object colour. The orbit-or-land cue is in words, the last part of the meta line (`1976 · ACTIVE · ON LAND` / `· IN ORBIT`, uppercase, the words of the Orbit and Land chips). The Worlds row is two lines: the lead slot (28px, spanning both lines), the name and agency badge over the meta, which wraps only after a " · " (two lines at most, `title` with the whole text). **The lead slot holds the site's round photo** (`EntityThumb`, L45, [UXD-025](../uxs/decisions/UXD-025-lists-carry-a-round-photo.md)): the 192px thumb of the folder and blessed slot the site's panel gallery resolves to (`thumbOfSite`; an Earth launch pad is a fleet entry, `thumbOf('fleet', id)`), ring the nation colour (an Earth object's own colour; teal or cyan, e.g. the ISS, drawn neutral). 28 of 28 `/moon`, 27 of 27 `/mars`, 3 of 3 `/venus`, 73 of 73 `/earth` (31 objects, 42 pads) rows have one; a row without keeps the 8px dot, centred in the same slot.

**Selecting.** A row does what a canvas click does, including the camera move (§7.5, [UXD-019](../uxs/decisions/UXD-019-select-equals-focus.md)); the INDEX stays open after a select. Black holes sit in the INDEX of the scale their distance puts them in (Sagittarius A\* and Cygnus X-1 in the Milky Way, M87\* in Virgo, Gargantua under a Fiction section at the foot of the Cosmic web).

### 5.14 Scene pins, rings and labels (UXD-020)

Text and markers drawn inside the 3D scenes of `/explore`, as opposed to HTML overlays ([UXD-020](../uxs/decisions/UXD-020-explore-readability-pins-rings-labels.md)). `src/lib/universe/scene-pins.ts` holds the constants and the maths; `scene-pin-sprites.ts` builds the sprites. The seven pin scenes (neighbourhood through Cosmic web) and the deep-sky scene share them.

| Element | Rule |
|---|---|
| Scene label | 12px (`--size-meta`) in CSS pixels at every scale and viewport. The sprite is sized in pixels from the pin's view-space depth (`viewDepth`, what the sprite shader projects with; not the Euclidean distance, which draws a pin 40 degrees off axis 1.3 times too big), the field of view and the viewport height, not as a fraction of the distance |
| 2D map text | 11px (the floor) at every zoom, alpha 0.58 or more; it does not grow with the zoom |
| Pin ring | A thin annulus, 44px across, 1.5px stroke, screen-constant. On every pin, on the deep-sky glints and on the label point of every Milky Way arm. Hidden at rest; full opacity on hover and selection (both at once: a selected pin keeps its ring while another is hovered), in `#889fe7` (`--color-state`). The ring is the pick target only in the neighbourhood (a 48px sprite) and on the arm label points; elsewhere the glow is |
| Anchor ring ("you are here") | Gold `#ffcf8f`, 44px, up at opacity 0.55 at rest and full on hover or selection. The same colour and size at all seven levels: the Sun, the Milky Way in the Local Group, the Local Group in the Local Sheet and Virgo, the Virgo Supercluster in Laniakea, Laniakea in the Cosmic web, Sol in the neighbourhood. It is a literal, not `--color-gold` (`#ffc850`) |
| Solar-scene rings | The selection ring and the hover ring of a planet, moon, small body or the Sun are the same `#889fe7`, but they are outlines sized to the body (a 1.2px line), not the 44px pin ring. The selected one pulses between 0.3 and 0.55 opacity; the hover one is steady at 0.35 |
| Light-year rings | Four 2px lines at opacity 0.55 on a ramp from `#889fe7` to white; the label is the localised unit (`m.unit_ly_value`) with a dark halo, at the lowest label priority |
| Colour | No teal or cyan in rings, anchor glows or labels. Galaxy glows by kind keep their data colours |
| Milestone box (iconic missions, C7, [UXD-026](../uxs/decisions/UXD-026-iconic-missions-legend-and-milestone-boxes.md)) | A canvas sprite per labelled waypoint of the highlighted mission, drawn at the device pixel ratio (2 at least) and sized each frame from the view depth so its text is 12px at every zoom. Pill `rgba(15,18,35,0.86)`, 1.5px edge and the body text in the trajectory's own colour (a data colour, teal included). Header `n/N · date`, 11px bold, 78% white: the milestone's number of the labelled waypoints (Today excluded) and the data's ISO date, language-neutral. Body: the milestone name, 12px bold, wrapped by measuring to two lines in 200px, an ellipsis only when two lines do not hold it; the width follows the text. No mission name in it. Lifted a steady 12px above its marker along screen-up; placed by the pass below (Launch first, then by index; the box of the marker under the pointer is forced); right-to-left locales right-align the lines, the header stays left-to-right. Click opens the mission (UXD-019) |
| Mission box | One per highlighted mission, at its Today marker: the mission name (11px, upper case) over `current_distance_label` (12px, up to 3 lines in 240px). First in the placement pass (only a forced hovered milestone box wins over it); it moves below Today where the heading pill would meet it, and the pill is a slot of the pass ranked after it. Not a pick target |

Scene code cannot read CSS variables, so the blue is a literal (`RING_BLUE`, `0x889fe7`) that mirrors `--color-state`; change both together.

**Label placement pass.** Each frame the candidate labels are placed in priority order (`placeLabels`); a label that overlaps one already placed is hidden and returns when space frees. Order: hovered or selected (always shown, placed first), the anchor, headliners, the rest. The Milky Way's order is the Sun, Sagittarius A\*, the headliner globulars, the Magellanic Clouds, the arms; the light-year ring labels come last. A hidden arm label's sprite is not a pick target; the arm's ring is, hidden label or not, and hovering it shows the label. Equal ranks resolve by creation order.

**Steady label offset.** A label sits above its pin by the steady glow size and the ring, never the hover-grown one (`labelOffset`), so hovering does not move it. The lift runs along the camera's screen-up (`liftOnScreen`), not world Y, so it is the same on screen when the camera looks straight down.

### 5.15 /explore HUD: scale bar, level picker, direction pills, REFERENCES grid, Reset slot (UXD-021)

The HUD parts of `/explore` that carry a number, a choice or a name ([UXD-021](../uxs/decisions/UXD-021-explore-hud-scale-bar-picker-pills-references.md)).

| Element | Rule |
|---|---|
| Scale bar | One component (`ScaleBar.svelte`) and one module (`scale-bar.ts`) for the Explore strip and both Worlds bars. The bar is 120px wide (64px under 600px wide), 3px high with end ticks, at every zoom; the label to its right (`--size-label`, 70% white) is the value it spans to three significant digits in the page locale (`1.37`, `13,7`, `137`), in the unit of the existing ladders (km, AU, ly, pc; km and m on the Worlds, through `distanceWithUnit`). The value follows the zoom; the width does not. No bar is drawn at the six schematic scales (Milky Way to Cosmic web: not to scale) |
| Scale strip | A fixed 232px box (190px under 600px wide, the bar's own breakpoint): it does not resize with its text; the label sits under the bar (`ScaleBar` `stacked`), because beside it the box holds only 81px for a label of about 108px (de). Bottom right, z 6. Panel-cover rule: with a drawer docked at the right edge (desktop, touch landscape) its right offset is 12px plus the drawer's width (`panelCoverPx`), so it sits left of the drawer, not under it; a bottom sheet (touch portrait) moves nothing (cover 0). The schematic note keeps its content width (max 260px, 190px on a phone). Bottom offset: the lifts clear the time dock, so they apply only where the dock is drawn (the solar system): 104px under 900px wide (the fixed box reaches back over the dock's right end), 50px on touch landscape (above the drawer's tab row); at every other scale (`no-dock`) 46px above the footer, and on touch 12px from the bottom edge |
| Level picker | One `Chip` toggle that opens the ladder as a popover downward. Flush right (the solar system) the ladder lines up with the chip's right edge and opens leftward (`align="right"`); flush left (the other seven scales) it lines up with the left edge. Physical offsets, not logical ones (the navigator's `right: 8px` is physical in every direction). Never wider than `100vw - 16px`, and its position is clamped to 8px from either screen edge |
| Scale navigator row | Back, picker, Reset (the seven outer scales only: the solar system's Reset is the HUD row's). Flush right at the solar system, flush left elsewhere. With a drawer docked at the right edge (desktop, touch landscape) the flush-right row sits left of it by the drawer's width plus 8px (`panelCoverPx`, the measurement the camera framing of §7.5 takes); a bottom sheet moves nothing. z 8, 46 while the ladder is open (§4.7) |
| Reset slot | One RESET VIEW per scale, always drawn, disabled while there is nothing to reset, so the row never shifts. At the solar system it is the HUD row's (top left, A5, UXD-015; enabled by a selection of any kind); at the seven outer scales it is the navigator's (a selection; at the neighbourhood also the Sun out of frame). Never two on screen. The Explore HUD row stops 12px before the navigator's left edge (cover + 8px + its width), like the worlds' `hud-beside-panel` |
| Iconic missions legend (C7, [UXD-026](../uxs/decisions/UXD-026-iconic-missions-legend-and-milestone-boxes.md)) | Opened by the first layer chip, ICONIC MISSIONS, 280px wide under the HUD row. Title line (`explore_iconic_tagline_placeholder`, 12px mono, may wrap) with the (i) at its inline end: a 20px round trigger with a 24px `.ui-hit` area that opens `WhyPopover` (title "Why are they all in one plane?", the body `explore_why_plane_body`, the "Read full" link to `/science/transfers/coplanar-trajectories`), right-aligned inside the legend. Then 18 rows, 28px with a fine pointer (36px on touch), 12px name, 11px year, the swatch in the trajectory colour; only the list scrolls, and the legend ends above the lower-left stack (the folded ruler header, PLANET SCALES, the time dock), so on a short window the list scrolls and those controls stay reachable. The hovered craft's tagline is a 240px card beside the legend, level with its row (upright Crimson 16px, `rgba(15,18,35,0.92)`, edge `--color-accent-edge`), never in the list, so nothing shifts; it is `aria-hidden` and a separate visually hidden `aria-live="polite"` region reads the tagline after the pointer has rested 250 ms. The (i) is 20px with a 24px hit area (44px on touch); its popover has no eyebrow (`WhyPopover` `eyebrow=""`) and opens with logical offsets, so it stays inside the legend in right-to-left. Desktop only; the phone drawer has the title and the rows |
| Direction pills | ʻOumuamua's "← Vega" and a heading craft's "→ star" (Voyager 1 and 2, Pioneer 10 and 11): hidden at rest, shown while the owner is hovered or selected (a craft's with its path highlight). The arrow lines stay. A named star's name is the star panel's (`getNamedStarI18n`); a catalogue-only star keeps its data name |
| REFERENCES overlay | The canvas (`SizesCanvas`) draws the eight bodies only: true relative size, a common baseline, size order. The names are a DOM grid under it (`SizesOverlay`): eight columns in the same left-to-right order on the 640px card, 4 x 2 under 620px; a cell holds a swatch in the planet's colour, the name in the viewer's language (`planetName`, `lab_body_*`) and the diameter (the `planet-stats.ts` mean diameter) in the page locale and unit form; a name never breaks mid-word from 360px up (Space Mono 11px, -0.02em tracking; the longest, nl MERCURIUS, is 58.6px in a 61px text box at 360px). The open planet's cell is marked; hover, focus or a tap on a cell rings its body. Heading above the canvas, source line under the grid |

---

### 5.16 Orbit ruler, bottom-left column and regime highlight (UXD-024)

The ruler is `OrbitRuler.svelte`; on the three Worlds it stands in `HudStackBL.svelte`, on `/explore` alone at the lower left. Behaviour in [UXS-014](../uxs/UXS-014.md#the-orbit-ruler).

| Element | Rule |
|---|---|
| Ruler card | `rgba(8,12,22,0.62)`, 1px `rgba(255,255,255,0.08)` border, 6px radius, 10px 12px padding, Space Mono 11px. `width: max-content`, `min-width: 208px`, `max-width: min(280px, 44vw)` (152px to 56vw under 720px on a non-touch window); in the touch drawer full width and flush |
| Row | One line: an 8px dot in the regime colour, the short name (700, `letter-spacing: .04em`, ellipsis, the full name as `title`), the altitude or distance at 62% white, tabular. 1px `rgba(255,255,255,0.06)` border, 4px radius, 4px 8px padding |
| Row hover, focus, open | `#889fe7` edge and `rgba(136,159,231,0.14)` fill; the dot keeps the regime colour. A row flagged for the selected orbiter keeps its regime-colour look until hovered |
| Header | A disclosure `<button class="ui-hit">` with the title and a `▾` / `▸` box (1px `rgba(255,255,255,0.16)` border, 4px radius); not a Chip (§5.7: a Chip is `aria-pressed`, this is `aria-expanded`). Folded: the header alone, plus ` · <short name>` of the flagged regime. Remembered in `localStorage`; folded by default under 560px window height. The touch drawer has no header button |
| Header, forced fold (C7) | On `/explore` while the Iconic missions legend is open (§5.15) the ruler is drawn as its header only (`forceFolded`): `aria-expanded="false"`, the header does nothing, the saved choice (`orrery.ruler.collapsed`) is neither read nor written, and closing the legend gives the ruler its own state back ([UXD-026](../uxs/decisions/UXD-026-iconic-missions-legend-and-milestone-boxes.md) decision 10) |
| Bottom-left column | `position: absolute; left: 12px; bottom: max(14px, --ruler-clear)`, z 7 (§4.7), flex column, 8px gap, top to bottom: readout (Moon), locate chip, ruler. `max-height` leaves 150px at the top for the chip rows; the ruler shrinks and scrolls first. On touch only the readout stays, at `bottom: 106px + safe area`, above the scene's bar. The imagery card (`TierContextCard`) is outside the column and rises above it by `--hud-stack-top` |
| Regime highlight (scene) | `#889fe7` (`RING_BLUE`) only. Band: annulus at opacity 0.14 and two 1.5px screen-width lines. One altitude: one 2px line. Hill sphere: three great circles, 1.2px. Lagrange point: the 44px pin ring (§5.14) on each resident, no ring at its own radius. A schematic regime (beyond the scene: `/explore` SCATTERED, HELIOPAUSE, OORT) is dashed. Hover 0.9; the open panel's regime pulses 0.55 to 0.9 over 1.6s, steady under `prefers-reduced-motion`. Equatorial plane on the Worlds, the ecliptic on `/explore`; the 2D view draws the same shapes in the units of `orbitR`. Hidden while the camera is below the orbits |
| Resident photo, founding-mission photo, solar and Worlds INDEX rows, station module rows, belt members, fleet-panel and entity-page lists, museum object rows (`EntityThumb`, [UXD-025](../uxs/decisions/UXD-025-lists-carry-a-round-photo.md)) | 28px circle, `object-fit: cover`, 2px border; the image is the 192px WebP of the entity's blessed hero slot (`thumbOf`), `alt=""`, `loading="lazy"`, `decoding="async"`, never inside a Chip. Ring: the row's identity colour (a resident's agency, `agencyRingColor`), `rgba(255,255,255,0.5)` when the row has none (a founding mission) or the colour is teal or cyan (hue 160 to 200°; UXD-001). A row with no file, or one that fails to load, keeps the 8px dot (the data colour, teal included) centred in the same 28px slot so labels line up. Founding missions: grid `28px 52px 1fr`, photo before the year. Station rows (`/iss`, `/tiangong`): a flex row, photo then name, agency badge and agency line, ring `agencyRingColor`. Fleet and entity pages: a `has-thumb` list item (flex, photo then a text block; the photo top-aligned with the link), ring the agency, `fallback="none"` (a prerendered list shows nothing for a row with no file); the fleet panel's lists centre the photo on the row and keep the dot. A patched program row keeps its patch and gets no photo |

Scene code cannot read CSS variables: the highlight blue is the literal `RING_BLUE` (§5.14).

---

## 6. Screen patterns

### 6.1 Solar system explorer (P01)

Full-screen 3D/2D. Detail panel slides in from right (314px). Planet pills strip below nav. Bottom bar with speed controls and sim date. The 3D view is the default — the 2D top-down view is educationally valuable for showing ecliptic geometry.

**Notable:** Planet labels are HTML overlay divs, not canvas text or Three.js sprites, positioned using `position.clone().project(camera)`. This is the correct pattern for all 3D screens.

![P01 Solar System Explorer — Earth selected, detail panel open](screenshots/p01_solar_system.png)

### 6.2 Mission configurator (P02)

The only screen without a 3D view — the porkchop plot is inherently 2D. The canvas is the hero. Right column shows the selected trajectory mini-diagram and mission parameters. Step indicator at top.

**Notable:** The heatmap is rendered via direct pixel manipulation (`ImageData`) for performance — 11,200 cells cannot be drawn as DOM elements.

![P02 Mission Configurator — 2026 window selected, compatible vehicles panel](screenshots/p02_porkchop.png)

### 6.3 Mission arc (P03)

Full-screen 3D/2D with HUD overlay. The HUD panels have `pointer-events: none` on the container with `pointer-events: auto` on individual elements — so the 3D canvas receives clicks and drags through the HUD.

**Notable:** The arrival state zooms the camera and renders a centred modal panel — the only use of a centred overlay in the product.

![P03 Mission Arc — mid-flight, dual HUD panels, timeline scrubber, gradient transfer arc](screenshots/p03_mission_arc.png)

### 6.4 Mission library (P04)

Scrollable card grid. Preview panel is `position: fixed; right: 0` at z-index 50 — it does not affect the grid layout, but the scroll area has `margin-right: 360px` when the panel is open (JS-controlled). This gives the grid a smooth resize animation.

**Notable:** The preview panel has its own tab system (OVERVIEW | GALLERY | LEARN) independent of the main nav. Tab state is JS-managed, not URL-based.

![P04 Mission Library — Curiosity selected, full detail panel with stats, description, and knowledge base](screenshots/p04_mission_library.png)

### 6.5 Earth orbit viewer (P05)

Full-screen 3D/2D. Regime legend strip below nav. Bottom bar with speed controls. The log scale is the central design decision — the legend makes it explicit.

**Notable:** HTML label overlays for orbital objects in 3D use the same `project()` pattern as P01, but with a graceful opacity fade when objects pass behind the body. Labels disappear at `wp.z > 1`.

![P05 Earth Orbit Viewer — ISS selected, log-scale display from ISS to JWST, regime legend](screenshots/p05_earth_orbit.png)

### 6.6 Moon map (P06)

Full-screen 3D/2D. The 3D view is a sphere — the camera orbits the Moon, not the Moon rotating. The 2D flat map uses a cylindrical projection (near side centred at 0° longitude). Filter strip replaces the planet pills. Agency filter stacks with status filter.

**Index.** The INDEX rail's dot is the site's nation colour, the legend's (§5.13).

**Notable:** The far side missions (Chang'e 4, Chang'e 6) can only be seen in 3D by rotating the camera — this is intentional design, not a bug. The far side is literally hidden from Earth. The 2D flat map reveals it at the edges.

![P06 Moon Map — 2D cylindrical projection, Apollo 11 selected, landing site detail panel](screenshots/p06_moon_map.png)

---

## 7. Interaction patterns

### 7.1 Camera orbit (3D views)

Consistent across P01, P03, P05, P06:

- **Mouse drag:** `camTheta += dx * 0.005–0.006; camPhi = clamp(camPhi + dy * 0.004–0.005)`
- **Scroll:** `camR = clamp(camR + deltaY * 0.5–0.7, min, max)`
- **Auto-orbit:** Slow rotation on `camTheta` (0.008–0.018 rad/s). Pauses on user interaction. Resumes after 4–5 seconds of inactivity.
- **Touch:** Same as mouse via `touches[0]`

The camera always looks at the origin (0, 0, 0). All objects are centred at the origin.

### 7.2 Hover state (3D)

Detected via `THREE.Raycaster` against invisible hit meshes (2–4× larger than visual mesh). Hit meshes are collected in an array (`pMeshes`, `pinHitMeshes`, etc.) for raycasting. Visual meshes are not raycasted directly — this is intentional for click accuracy.

On hover:
- 3D: emissive intensity increases
- 2D: cursor changes to `pointer`; object brightens
- HTML label: opacity increases to 0.9

On `/explore` a hovered pin or body also shows its ring (§5.14) and a hovered or selected label is always shown. Selection is §7.5.

### 7.3 Speed controls

Consistent bottom-bar pattern: `0.25× | 1× | 5× | 20–25×` buttons. Active button has blue border and accent-blue text. Inactive has subtle border and dim text. Speed multiplier applies to `simT` advance per frame.

### 7.4 Animation conventions

| Animation | Duration | Easing |
|---|---|---|
| Panel slide-in / fade-in | 0.22s | ease |
| Card fade-up on render | 0.25s per card, staggered 35–40ms | ease |
| Status pulse dot | 1.5–2s | sine (via keyframe) |
| View toggle opacity | 0.4–0.5s | ease |
| HUD bar fill transition | 0.3s | linear |
| Label opacity | 0.15–0.2s | — |
| Arrival zoom (mission arc) | 1.2s | ease-out |
| Select-focus camera flight (`/explore`, §7.5) | 600ms | ease-out |

### 7.5 Selection on /explore: select = focus

Selected means three things at once: the panel is open, the object is ringed, the camera is on it ([UXD-019](../uxs/decisions/UXD-019-select-equals-focus.md)). Every way of choosing an object ends in one funnel, so the result is the same: a canvas click, an INDEX row (§5.13), a resident of the ruler, a belt member, `?id=`, a link in a panel.

- **Ring for every kind that has a body.** Planets, moons, small bodies and the Sun take the ring (look in §5.14). A belt has no ring: its particles brighten (opacity ×1.8, size ×1.3) while it is selected. Pluto is a small body with one panel everywhere, and takes the ring and the focus like the others.
- **One ring rule: the ring follows the selection, not the panel.** × closes the panel; the body stays selected, ringed and centred until another selection, Reset View, or the chip of its kind turned off clears it.
- **Camera focus (600ms, ease-out).** A planet or a moon lands at 8 radii (zoom range 1.5 to 50 radii); a small body at 14 radii (4 to 600 units); a belt frames the whole ring from the Sun (570 units for the asteroid belt, 1,430 for the Kuiper belt). The Sun, and an object the scene does not draw, fly to the heliocentric home view. At the outer scales a member pans the camera to it and eases the zoom to 0.6 × the scale's entry distance, never below the floor and never out from a closer view the visitor chose; all eight scales have a Reset that flies back to the entry pose.
- **Panel-aware framing.** With a side drawer open, the look-at point sits in the middle of the space the drawer leaves (the projection shifts by half the drawer's width). A bottom sheet (touch portrait) moves nothing. One helper, `src/lib/three/panel-framing.ts`.
- **Chips own kinds.** Turning a layer chip off clears a selection of its kind (panel, ring and focus; the camera flies to the home view). Selecting an object whose chip is off turns the chip on. PATHS off closes a mission opened from a path.
- **No object, no link.** A resident or a belt member is a button only when the scene has an object for it; otherwise it is plain text.
- **A mission opens in place.** A mission id in a body panel's Missions tab opens the mission panel over the body panel. The body stays selected and its panel stays mounted but covered (not painted, not focusable, Escape leaves it), so its tab and scroll return. The mission panel's bar carries a back chip (`←`, `panel-back`) that returns to the body panel; × is the same return. Selecting another body closes the mission. The lists run newest first.

---

## 8. 3D rendering conventions

### 8.1 Three.js version

Three.js r128, loaded from Cloudflare CDN:
```
https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
```

This version is pinned. Upgrading requires audit of all six screens — r128 has known breaking changes in later versions around `MeshStandardMaterial` and `WebGLRenderer`.

### 8.2 Renderer setup

```javascript
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // cap at 2× for performance
renderer.setClearColor(0x000000, 1); // /explore and the Worlds (createSceneRenderer's clearColor)
```

`alpha: false` is intentional: a scene is never transparent. The space around a body is pure black on
/explore and on every World (/earth, /moon, /mars, /venus; operator 2026-11-13). The page's `bg-base`
(`#04040c`) is not used as a scene clear: the composer's OutputPass, on every quality tier above low,
lifts that dark indigo to a visible purple. `createSceneRenderer` still defaults to `0x04040c` for
/fly's heliocentric scene.

### 8.3 Material conventions

| Use case | Material |
|---|---|
| Stars | `PointsMaterial` — size 1.2px, sizeAttenuation: false, opacity 0.65 |
| Sun | `MeshBasicMaterial` + additive glow layers |
| Planets | `MeshPhongMaterial` — shininess 20–25, emissive at 10–15% |
| Planet with texture | `MeshPhongMaterial` — map loaded via `TextureLoader`, emissive reduced to 10–15% |
| Orbit rings | `LineBasicMaterial` — opacity 0.06–0.22, depthWrite: false |
| Glow effects | `MeshBasicMaterial` — BackSide, AdditiveBlending, depthWrite: false |
| Trajectory arc | `LineBasicMaterial` — AdditiveBlending, opacity 0.45–0.55 |
| Hit meshes | `MeshBasicMaterial` — transparent: true, opacity: 0 |

### 8.4 Texture sources

| Texture | URL |
|---|---|
| Earth (atmosphere) | `https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg` |
| Moon | `https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg` |

All textures loaded with `TextureLoader` and error callbacks that silently fall back to procedural materials. Never blocking — the scene renders without textures while they load.

### 8.5 Label overlay pattern

HTML labels positioned over the 3D canvas using `position.clone().project(camera)`:

```javascript
const wp = mesh.position.clone().project(camera);
if (wp.z > 1) { label.style.opacity = '0'; return; } // behind camera
label.style.left = ((wp.x + 1) / 2 * innerWidth) + 'px';
label.style.top  = ((-wp.y + 1) / 2 * innerHeight) + 'px';
```

The label container is `position: absolute; inset: 0; pointer-events: none; z-index: 8` — inside the 3D renderer div, not inside the UI overlay div.

---

## 9. 2D canvas conventions

### 9.1 Canvas setup

```javascript
canvas.width = innerWidth;
canvas.height = innerHeight;
window.addEventListener('resize', () => { canvas.width = ...; canvas.height = ...; });
```

Always redraw on resize. Never scale with CSS — the canvas pixel dimensions must match the display dimensions (at 1× DPR for performance).

### 9.2 Drawing order (solar system)

1. Background fill
2. Stars (static noise)
3. Orbit rings (thin, faint)
4. Belts (asteroid, Kuiper) — particle loops
5. Comet orbit ellipses (dashed)
6. Sun glow
7. Transfer arc (if Mars selected)
8. Small bodies
9. Planets (glow, rings, dot, label)
10. Overlay text (corner labels, scale notes)

Layers matter. Objects must be drawn in depth order — small bodies before planets so planet glows render on top.

### 9.3 Coordinate system

The canvas origin `(0, 0)` is top-left. All orbital objects are drawn relative to the canvas centre `(cx, cy) = (W/2, H/2)`. The Sun is always at `(cx, cy)`.

For the Moon map 2D view, the map is centred within the canvas with padding, not full-bleed.

---

## 10. Design decisions with technical implications

These are design choices that directly constrain the technical architecture (04). Each creates a requirement.

### 10.1 Three.js CDN dependency

All six screens load Three.js from Cloudflare CDN. This means:
- **Offline use requires bundling.** The Docker Compose deployment must either bundle Three.js locally or ensure CDN access.
- **Version must be pinned.** `r128` is not the latest — the architecture must not auto-update dependencies.

### 10.2 Real-time orbital computation

The porkchop plot computes 11,200 Lambert solutions at startup. This is ~2 seconds on a modern browser. It happens once — but it happens in the main thread, which blocks rendering during that window.
- **04 implication:** The Lambert solver should be moved to a Web Worker in the production build. The prototype accepts the blocking; the product cannot.

### 10.3 External API calls (NASA Images)

The gallery tab fetches from `images-api.nasa.gov` at runtime. This means:
- **CORS must be open** from the user's browser to `images-api.nasa.gov`. It currently is (NASA allows it).
- **Offline use will fail gracefully** — the gallery shows a "requires internet access" placeholder. This is already implemented.
- **No server-side proxy required** for the NASA API — it is a public API with open CORS. ESA images are served from Wikimedia Commons URLs, which also have open CORS.

### 10.4 Font loading

Three Google Fonts families are loaded on every screen. In offline/Docker deployments, these will fail to load.
- **04 implication:** Fonts must be self-hosted in the production bundle. The system font fallbacks (`monospace`, `serif`, `sans-serif`) are acceptable degradations but will break the typographic character of the product.

### 10.5 Logo images from Wikimedia

Agency logos are hotlinked from `upload.wikimedia.org`. The fallback (abbreviation text) is always visible — the design degrades gracefully.
- **04 implication:** Production deployment should host logo files locally. The Wikimedia URLs are stable but should not be relied upon for production availability.

### 10.6 No shared state between screens

Each screen is a standalone HTML file. There is no shared state, no routing, no session management. This is appropriate for Phase 1 (prototypes) but limits the product:
- Mission planned in P02 is not automatically passed to P03
- The `/fly?id=curiosity` URL routing is defined but not implemented between files
- **04 implication:** Phase 2 requires a client-side router and shared application state. The URL routing convention (`/fly`, `/fly?id=...`, `/missions`, `/earth`) must be formalised.

### 10.7 Simulation time is local state

`simT` advances in `requestAnimationFrame` based on wall-clock time. There is no way to share or persist simulation time.
- **04 implication:** If "share my mission" is ever implemented, simulation state must be serialisable to URL parameters or a JSON file.

### 10.8 The log scale for Earth orbit is a UI decision

The `altToVis()` function in P05 uses a logarithmic formula to map altitude to pixel radius. This is a design decision that makes ISS and JWST visible on the same screen. Any change to this formula changes the visual layout of the entire screen.
- **04 implication:** The scale function must be documented as a design constant (it is in 03), not a magic number in code.

---

## 11. What to build next (design perspective)

These are features implied by the current screens but not yet designed:

1. **Mission share / export** — "Share this mission" link that encodes parameters in the URL. The mission arc needs a serialisable state format.
2. **Rocket configurator panel** — currently hardcoded in P03. The full configurator (P02 → P03 handoff) needs a designed transition.
3. **Moon mission arc** — P03 only supports Mars missions. A Moon fly screen with a 3-day Earth-Moon arc needs its own telemetry model (much shorter distances, different scale).
4. **Mobile layout** — all six screens are desktop-only. Touch interactions are partially implemented in camera orbit but the card grid, panel system, and HUD are not mobile-adapted.
5. **Accessibility** — no ARIA roles, no keyboard navigation, no reduced-motion support. Phase 2 requirement.

---

*Orrery · 05 Design System · April 2026 · Living document*
*← 04 Technical Architecture · 02 Project Concept →*
