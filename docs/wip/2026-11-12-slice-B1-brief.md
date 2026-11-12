# Slice B1 brief — hero, close, actions (P3, P4, P5, EP4, MI4)

Read-only brief, written at HEAD `08162eae062` on `tech-debt/0.9.9` (A1 type scale, A2 page shell, A3 accent tokens and A4 one chip have landed; A5 is being built in this checkout;
A6 is a brief). Method: `git grep` and reading from the repo root; every `file:line` was read at `08162eae062`. `SurfaceScene.svelte` is being edited by A5 in the working
tree, so its lines were read from `git show HEAD:` (they drift when A5 lands). Nothing was built, run in a browser or measured: every pixel figure below is CSS arithmetic
(see §15). The check script of §12 was run once: `B1_REV=HEAD python3 b1-check.py` prints `B1-CHECK violations: 147`.

## 0. The point list

| ID | Operator text (plan lines 53–55, 166, 244) | State at HEAD |
|---|---|---|
| P3 | Hovering the hero image should not make a blue glow; the pointer change is enough. | `.panel-hero-btn:hover, :focus-visible` set an accent border and a `box-shadow` ring (`src/lib/styles/panel-tabs.css:98–103`); `cursor: zoom-in` is already there (`:93`). One rule serves hover and keyboard focus, and drops the outline (`outline: none`), so the focus ring IS the glow. 10 panels use the button (`PanelHeroImage.svelte:30–49`). |
| P4 | When scrolling, the panel's close X in the corner goes over the content: let it scroll away or find another way. | `.panel-close` and `.panel-back` are `position: absolute` children of `aside.panel` (`Panel.svelte:271–288`, `:300–326`), siblings of the scroll container `.content` (`:333–341`, `overflow-y: auto`), with `background: transparent`. Only `.content` scrolls, so the × never moves and text passes under it. |
| P5 | "Collector card" link becomes "Share", placed higher, not all the way down. | Label `card_open_button` = "Collector card" (`messages/en-US.json:3063`), rendered at the foot of 7 panels in a full-width 44–48 px bar (§2.4). It opens `CardOverlay.svelte` (a modal with the card plus "Share card" and "Share link"). |
| EP4 | Bottom of overview: plan a mission, explore surface, collector card feel stuck at the bottom and big, one per row; bring some higher, at least on some tabs. | `PlanetPanel.svelte:355–383` stacks up to three `.cta-bar` blocks (Plan, Explore surface, Collector card), each ~69 px (12 margin + 1 border + 12 padding + 44 button): ~207 px on Earth and Mars. Outside `.tab-content`, so they sit under every tab. |
| MI4 | "Fly this mission" goes up under the vehicle/payload buttons; don't hide the cool parts. | `MissionPanel.svelte:835–882`: Collector card, Fly this mission and the surface link are one column of full-width buttons after all tab content. Vehicle/Payload (`.spec-cta-bar`, `:418–481`) sit in Overview after the 8-cell grid. |

Slice row (plan line 338): no hover glow on the hero (focus ring for keyboard only); close/back buttons per Q6; "Collector card" → "Share" (Q3) and the action buttons (plan,
explore surface, fly, share) become one compact row near the top of Overview. Done when: shots of planet, mission, fleet, surface-site panels, scrolled and unscrolled.

## 0a. Decisions (operator 2026-11-12) and what is still open

Q3 and Q6 are from the lead's messages in this session quoting the operator; they are not yet in `docs/wip/2026-11-11-ux-feedback-plan.md` (the lead records them there).

| # | Decision | Where it lands |
|---|---|---|
| D1 | **Q3: rename to "Share" and keep opening the card.** Same `CardOverlay`, placed higher (P5). It is not a bare share-link action. | §4.5 |
| D2 | **Q6: one slim fixed header bar on every panel.** Back `←` on the left, close `×` on the right, the entity name in small text once the hero has scrolled out, solid background, A4 chip sizes (30 px fine pointer, 44 px touch). | §4.2 |
| D3 | **Holistic request:** "consider the other action buttons from the panel too; I want to see a holistic solution across Explore, Worlds and landers". Answered by one model for every panel action. | §5 |
| D4 | Inherited: A4 chip option A (30 / 44 px, 4 px corners, outline at rest, soft blue fill and blue edge when on, world tint on the Worlds), "HUD action buttons on the same chip", "consistency above all". | §1 |

**Still open (operator):** where Share sits (bar or action row) and four smaller items, all in §11 with a recommendation first.

## 1. Cascade — what the earlier slices change in B1, and what in the plan row is outdated

| Earlier slice | What it changes in B1's tactics | Outdated in the plan |
|---|---|---|
| **A1 type scale (UXD-002)** | Chip text is `--size-label` 11 px (`chip.css`); the bar's entity name uses `--size-meta` 12 px (`tokens.css:64`). The CTAs today use 11 px with `letter-spacing: 3px` (`PlanetPanel.svelte:520–521`) and literal 12 px in `.explorer-cta` (`FleetEntryPanel.svelte:939`) and `.enter-system` (`StarPanel.svelte:377`); the chip replaces all of them. Panel lead text is `.editorial` (`panel-tabs.css:72–77`), untouched. | Nothing. |
| **A2 page shell (UXD-012)** | None: panels are not shell pages; `page-shell.css` does not style them (`grep panel` in it returns nothing). The standalone entity pages (`SiteEntityPage.svelte:156`, `missions/[id]/+page.svelte:147`, `fleet/[id]`, `explore/[id]`, `lab/[id]`) carry their own `.cta` links; they are pages, not panels: leave for the slices that own the pages. | Nothing. |
| **A3 accent tokens (UXD-001)** | Tokens for B1: `--color-focus` `#8aa0ff` for the hero focus ring (`tokens.css:20`); hover edge `--color-state`; `--color-panel-bg` for the bar (`tokens.css:36`). The panels still hold the retired private CTA blues `#1a33bb` / `#2244dd` (`MissionPanel.svelte:1151,1171`, `PlanetPanel.svelte:514,529`; A3's check did not look for them, they are neither teal nor `#4466ff`): they go with the old CTAs (check kind `RETIRED-BLUE`). The Vehicle / Payload / Mission cards keep three private navy blues (`#0c1660`, `#1f4ca8`, `MissionPanel.svelte:1241,1273`, `FleetEntryPanel.svelte:981`): left alone, see §8 and §11 O7. | The "loud blue Fly button next to a quiet card button" register (`MissionPanel.svelte:1175–1185`) is outdated: after A3/A4 there is one accent and one chip look. |
| **A4 one chip (UXD-014; `chip.css`, `Chip.svelte`)** | **The action row is `<Chip kind="action">` / `kind="link"`, and the bar's back, close and Share are chips too** (`class="panel-close"` and `data-audio-stage` pass through `Chip`'s `...rest`, `Chip.svelte:44,75–80`). 30 px fine / 44 px both axes on touch, `--chip-tint` from the Worlds HUD reaches the site panel because the aside is a DOM descendant of `.surface-scene` (the three site chips already work this way, `SurfaceScene.svelte` HEAD `:7108–7125`). UXD-014's allow-list names "CTAs" and the sweep in `tests/e2e/chip.spec.ts` allow-lists `.panel-close`, `.panel-back`, `.cta`, `.cta-card` (`:313,314,382,383`): **B1 reverses that for panels** (§11 O3) and removes `.panel-close`, `.panel-back`, `.cta-card` from the sweep; `.cta` stays for the standalone pages. | The plan row says "action buttons … become one compact row": A4 already decided the look; B1 only places the chips. |
| **A5 flat chip row (brief; being built)** | A5 edits `SurfaceScene.svelte` heavily (chip rows) and, per plan line 468, moves the A–Z into the INDEX panels (`ExploreBodyIndex`, `StarIndex`, `SurfaceIndexPanel`; the A5 brief on disk does not list those files). **B1 starts after A5 has landed** and rebases its `SurfaceScene.svelte` edits (site row at HEAD `:6278`, card bar `:6791`, CSS `:7108–7125`, `:7382–7410`) onto A5's version. The index panels already have the Q6 pattern (a header with the × outside the scrolling list: `.bidx-top`, `.si-*`, `.sidx-*`): their close buttons are A5's files; see §11 O6. | Nothing. |
| **A6 nav (brief)** | `--nav-height` goes 60 → 52 px; `Panel.svelte` reads `top: var(--nav-height)` (`:201,212`), no literal, so the panel grows 8 px with no edit. **A6's More menu holds "Share this view"** (`nav_share`, `shareCurrent()` = the current URL, `share.ts:30`); the panel's Share (D1) shares the entity: Share link is the `/c/<kind>/<id>` OG stub, Share card is the generated JPEG (`CardOverlay.svelte:54–95`). Both stay; labels differ ("Share this view" in the menu, "Share" on the panel). A6 §1.1 already leaves the label question to B1. The Curator Tour dock (`--panel-dock-h` 64 px, `Panel.svelte:190–194`) stays above the bar. | The plan's "action buttons (plan, explore surface, fly, share)" implies one panel with four actions. No panel has four (§2.4): Planet has 2 + Share, Mission 2 + Share, Site 3 + Share. |

**Deferred list (plan L1–L28) that B1 touches:** L21 (done: core-tier labels), L22 (done: Coast and HUD controls on the chip) set the rule that a clickable look outside the chip needs a stated reason. **L26** (layout risks from taller chips) applies: a 30–44 px chip row at 354 px inner width wraps in `de`, `ru`, `ar` (§5.5, shots in §13). **L25** (white text on the world tint) applies to the Share chip hover on `/moon` `/mars` `/venus`. **L10** (link UXDs from specs) applies to UXD-017. New items to add to the list (the lead owns the plan file): L29 the Vehicle / Payload / Mission card blues (§8); L30 `/plan` page still has `#1a33bb` / `#2244dd` (`routes/plan/+page.svelte:1879,1905`, slice G); L31 the standalone-page `.cta` links.

### 1.1 Adjacent items that serve the same idea

| Adjacent item | Where | Verdict | Reason |
|---|---|---|---|
| Hardcoded English in the mission surface link: `IN MARS ORBIT ↗`, `IN LUNAR ORBIT ↗`, `ON THE SURFACE ↗`, `ON THE LUNAR SURFACE ↗` | `MissionPanel.svelte:864–871` | **Fold in** | The element is rewritten as a chip; new text must exist in 14 locales (plan DoD 4). 4 new keys. |
| `PlanetPanel` Explore surface link uses `{base}/{planet.id}` | `PlanetPanel.svelte:365` | **Fold in** | Every other panel link uses `localHref()` (`locale.ts:125`). Rewriting the element anyway; use `localHref`. Whether the locale survives the click today was not verified. |
| `.gallery-thumb:hover` accent border + scale | `panel-tabs.css:168–173` | **Leave** (§11 O5) | P3 names the hero only; thumbs are a selection cue among many. |
| Swipe-down close: `ontouchmove` is on the whole aside and ignores `scrollTop` | `Panel.svelte:96–112, 140–142` | **Fold in** (§11 O4) | Same file and same scroll behaviour as P4: a finger pulling the list back up > 80 px closes the panel. Not tested on a device. |
| Star panel `Enter system` (head, above hero, and again in the System tab), DeepSky gateway button | `StarPanel.svelte:150–153, 290–292`; `DeepSkyPanel.svelte:78–88` | **Leave for B3** | B3 rebuilds the star panel (one hero, tabs). B1 ships `PanelActions`; B3 uses it. |
| Index panels' own × (`bidx-close`, `si-close`, `sidx-close`) | `ExploreBodyIndex.svelte:48`, `StarIndex.svelte:79`, `SurfaceIndexPanel.svelte:89` | **Leave until A5 has landed**, then align (§11 O6) | the plan (line 468) says A5 reworks the index panels; the A5 brief on disk does not name these three files, so which of them A5 touches was not verified. |
| `/missions/[id]`, `/fleet/[id]` … `.cta` links | standalone pages | **Leave** | Pages, not panels. |
| `explore-backlink` "See path on /explore" | `MissionPanel.svelte:497–503` | **Leave inline** | Reads as a closing reference after the description, not an entity action; a fourth chip would wrap the row. |

## 2. Inventory

### 2.1 The panel shell (`src/lib/components/Panel.svelte`, 342 lines)

- **Element:** `<aside class="panel">` (`:131`), `position: fixed`, `display: flex; flex-direction: column; overflow: hidden` (`:181–190`). **It does not scroll.**
- **Placement:** desktop and touch-landscape: `top: var(--nav-height); right: 0; bottom: 0; width: var(--panel-width)` = 400 px (`:199–206`, `tokens.css:86`); touch-portrait: full-width sheet `top: var(--nav-height)` to `bottom: 0`, `z-index + 50` and a scrim (`:211–218`, `:250–253`); `mobileSheet="partial"`: bottom sheet, `max-height: 62vh`, 18 px top radius (`:222–227`). `docs/uxs/IA.md:181,254` still says 314 px (UXS-000 SC-2 tracks it; not B1).
- **Children, in DOM order:** `.panel-dock` (empty, `--panel-dock-h` 0 or 64 px while the Curator Tour is docked, `:152`, `:263–269`), optional `button.panel-back` (`:158–166`), `button.panel-close` (`:167–173`), `div.content` (`:174–176`).
- **Scroll container:** `.content` — `flex: 1; overflow-y: auto; padding: 14px 18px; padding-bottom: calc(40px + safe-area)` (`:333–341`). `.content.has-back { padding-top: 58px }` (`:329–331`) reserves room for the back button only.
- **Close:** 44 × 44, `position: absolute; top: calc(var(--panel-dock-h) + 14px); inset-inline-end: 14px`, transparent, 1 px 12 % border, 65 % white `×` at 18 px (`:271–288`); touch-portrait `top: 14px` (`:295–297`). **Back:** same box at `inset-inline-start`, arrow `←` 20 px (`:300–326`), shown when the card chain is non-empty and the URL is an `?id=` card (`:61`, `card-chain.svelte.ts`).
- **Other ways to close:** Escape (window listener, `:66–70`), the scrim (touch-portrait only), swipe down 80 px (`:96–112`). On desktop the drawer is non-modal and unscrimmed.
- **`title`:** every one of the 25 consumers passes it (`aria-label`, `:137`).
- **Contracts other code depends on (A4 lesson: find controls by class):** `data-audio-stage="panel-close"` is clicked by 18 steps in `src/lib/audio-tour.ts` (`:318,672,696,831,851,865,997,1003,1005,1022,1035,1119,1175,1534,1622,1634,1865,1919`) and by `tour-stage-execution.spec.ts:41–125`; `button.panel-close` by `fleet.spec.ts:210`, `iss.spec.ts:64`, `tiangong.spec.ts:56`, `iss-module-gallery-race.spec.ts:66`, `surface-url-mirror.spec.ts:46`; `.panel-back` by `missions.spec.ts:325,334`; `aside.panel` by `SurfaceScene.svelte` (HEAD `:1803`) and `AnnotationRings.svelte:114`; `.panel-hero-btn` by `panel-lightbox.spec.ts`, `panel-gallery-viewer.spec.ts`. `git grep` finds no `.panel-close` / `.panel-back` / `has-back` in `src/` outside `Panel.svelte` and `audio-tour.ts`, except the string `button.panel-close` in `scrub-breadcrumb.test.ts:42`.

### 2.2 Hero (`PanelHeroImage.svelte`, `panel-tabs.css:79–110`)

`<div class="panel-hero">` with, when `onOpen` is given, `<button class="panel-hero-btn">` (16:9 image, `cursor: zoom-in`, 4 px corners, 10 % border). Used by 10 panels: Belt, Fleet, Mission, Planet, Satellite, SmallBody, StationModule, Sun, EarthObject, SurfaceScene site (`git grep PanelHeroImage`). `StarPanel` draws its own non-interactive `.panel-hero.star-hero` (`:157,171`; no hover). Fleet wraps it in `.panel-hero.fleet-hero { overflow: hidden; aspect-ratio: 16/9 }` and strips the button's border (`FleetEntryPanel.svelte:896–915`): **an outline drawn outside the button is clipped there**, so the focus ring must be inset (`outline-offset: -2px`). Hero height: 16:9 of the content width = 205 px at 400 px (364 inner), 199 px at 390.

### 2.3 Where each panel puts its hero, back/close and actions (all 25 `<Panel>` consumers)

| Panel | File | Hero | Actions today |
|---|---|---|---|
| Planet (/explore) | `PlanetPanel.svelte:151` | yes `:168` | Plan, Explore surface (Earth, Mars), Collector card — bottom, 3 bars (§2.4) |
| Satellite (moons) | `SatellitePanel.svelte:133` | yes | Explore surface (Moon only, `/moon`), Collector card — bottom |
| Small body | `SmallBodyPanel.svelte:182` | yes | Collector card — bottom |
| Sun, Belt | `SunPanel.svelte:73`, `BeltPanel.svelte:168` | yes | none (inline links) |
| Star | `StarPanel.svelte:138` | own, 2 | Enter system (head `:150`, System tab `:290`) |
| Exoplanet, Regime, Phase | `ExoplanetPanel`, `RegimePanel`, `PhasePanel` | no | none (Regime: resident links) |
| Deep sky / Black hole / Milky Way / Local group / Local sheet / Virgo / Laniakea / Cosmic web | 8 files, `mobileSheet="partial"` | no | DeepSky: gateway button + gallery link; BlackHole, MilkyWay: "learn more →" link; others none |
| Message (Voyager etc.) | `MessagePanel.svelte:55` | no | "Mission details →" button `:97–104` |
| Mission (/missions, /explore iconic) | `MissionPanel.svelte:286` | yes `:315` | Collector card, Fly this mission, surface link — bottom |
| Fleet entry | `FleetEntryPanel.svelte:314` | yes `:339` | Open explorer (Overview top), Mission card (inline), Collector card — bottom |
| ISS / Tiangong module | `StationModulePanel.svelte:81` | yes | none |
| Earth object (/earth) | `EarthObjectPanel.svelte:174` | yes `:197` | Collector card — bottom |
| Museum, Observatory | `surface-scene/MuseumPanel`, `ObservatoryPanel` | no | external website link (inline) |
| Surface site (/moon /mars /venus /earth) | `SurfaceScene.svelte` HEAD `:6218` | yes `:6347` | Stand here, View route, Zoom in — **head, above the hero, chips** (`:6278`); Launches-from-here chips (Overview, `:6590`); Collector card — bottom `:6791` |

### 2.4 Every action in or next to a panel (file:line at HEAD; order = DOM order; "look" says whether it is already the A4 chip)

| # | Action | Panel | File:line | Look | Position | Notes |
|---|---|---|---|---|---|---|
| 1 | Plan a mission to {NAME} | Planet | `PlanetPanel.svelte:355–361` | private `.cta`: solid `#1a33bb`, 44 px, 3 px tracking | bottom, every tab | only `planet.missionable && onPlanMission` (`explore/+page.svelte:1961`, handler `:981`) |
| 2 | Explore {NAME} surface | Planet (earth, mars) | `:363–369` | private `.cta-secondary` | bottom, every tab | `<a href="{base}/{id}">`, not `localHref` |
| 3 | Explore {NAME} surface | Satellite (id `moon`) | `SatellitePanel.svelte:260–267` | same | bottom | `href=/moon` |
| 4 | Collector card | Planet | `PlanetPanel.svelte:371–383` | private `.cta.cta-card` | bottom | `data-testid="open-card-btn"` |
| 5 | Collector card | Satellite | `SatellitePanel.svelte:269–279` | same | bottom | |
| 6 | Collector card | SmallBody | `SmallBodyPanel.svelte:385–397`, CSS `:405–431` | private `.cta-card` | bottom | |
| 7 | Collector card | Mission | `MissionPanel.svelte:837–846` | `.cta.cta-card` | bottom, 1st of 3 | |
| 8 | Fly this mission | Mission | `:847–862`, CSS `:1147–1174` | private `.cta`, solid `#1a33bb`, icon | bottom, 2nd | gated: not PLANNED/CANCELLED, `hasFlightData`, `onFly`; testid `fly-mission-btn` (`fly.spec.ts:236`, `missions.spec.ts:137`) |
| 9 | On the (lunar) surface ↗ / In Mars orbit ↗ | Mission | `:863–880`, CSS `:1122–1146` | private `.surface-link`, orange tint, hard-coded English | bottom, 3rd | `crossSite`; testid `surface-link` (`missions.spec.ts:154`) |
| 10 | Vehicle, Payload cards | Mission | `:418–481`, CSS `:1202–1290` | private `.spec-cta` two-line cards | Overview, after the 8-cell grid | navigation cards (label + value), not actions |
| 11 | See path on /explore | Mission | `:497–503` | private `.explore-backlink` | Overview, after the description | |
| 12 | Open {name} Explorer → | Fleet (ISS, Tiangong) | `FleetEntryPanel.svelte:386–394`, CSS `:929–950` | private `.explorer-cta`, 12 px | Overview, first | |
| 13 | Mission card / Missions (n) | Fleet | `:407–445`, CSS `:952–1040` | `.spec-cta--mission` card | Overview | navigation card |
| 14 | Collector card | Fleet | `:780–793`, CSS `:814–843` | private `.cta-card` | bottom | |
| 15 | Stand here / Exit panorama | Site | `SurfaceScene.svelte` HEAD `:6286` (`PanoramaToggleButton`) | **A4 chip** | head, above hero | |
| 16 | View route / Exit route view | Site (rovers) | HEAD `:6299–6316` | **A4 chip** | head | |
| 17 | Zoom in / Exit zoom view | Site | HEAD `:6319–6340` | **A4 chip** | head | `.site-cta-bar` CSS HEAD `:7108–7125` |
| 18 | Launches from here (n chips) | Site (launch pads) | HEAD `:6590–6606` | **A4 chip, kind link** | Overview, inline, under a heading | content, not an action |
| 19 | Collector card | Site | HEAD `:6791–6800`, CSS `:7382–7410` | private `.cta-card` | bottom | |
| 20 | Collector card | EarthObject | `EarthObjectPanel.svelte:381–392`, CSS `:403–429` | private `.cta-card` | bottom | |
| 21 | Enter system → | Star | `StarPanel.svelte:150–153`, `:290–292`, CSS `:371–397` | private `.enter-system`, 12 px | head, and System tab | B3 |
| 22 | Enter forming system → | DeepSky | `DeepSkyPanel.svelte:78–88` | private `.gateway-btn` | after the overview, with a note | B3 |
| 23 | See in gallery → | DeepSky | `:94` | private `.gallery-link` | foot | |
| 24 | Learn more → | BlackHole, MilkyWay | `BlackHolePanel.svelte:90`, `MilkyWayPanel.svelte:99` | private `.learn-link` | foot | |
| 25 | Mission details → | Message | `MessagePanel.svelte:97–104` | private `.mission-link` button | foot | |
| 26 | Share this view | Nav (A6 More menu) | `Nav.svelte:439` (`share-toggle`), A6 brief §3.1 | nav control | outside the panel | duplicate **concept** with 4–20, different object (current URL vs the entity) |
| 27 | Close ×, Back ← | every panel | `Panel.svelte:158–173` | private 44 px square | floats top corners | P4 |

Duplicates: Collector card appears 7 times with 5 different private rule sets (`.cta.cta-card` ×3 files, `.cta-card` ×4); the "explore this body" action appears as `.cta-secondary` (2 files), `.explorer-cta`, `.enter-system`; solid-blue `#1a33bb` appears for Plan and Fly only.
No lander or rover site panel has a Fly action; the lead's "Fly mission …" on landers does not exist at HEAD (`git grep` finds no fly handler in `SurfaceScene.svelte`). B1 does not add one (it would be new scope).

Stack heights today (CSS arithmetic, not measured): Planet on Earth/Mars ~207 px (3 bars of 69), other planets 69–138; Mission ~170 px (12 + 1 + 12 + 48 + 8 + 48 + 8 + ~33); SmallBody, EarthObject, Fleet ~69 px (Fleet adds 16 px padding), Site ~77 px.

### 2.5 How "Collector card" works today (for Q3 and §4.5)

- **Panel side:** each of 7 panels loads the card code lazily when it opens (`loadCardModules()`, `lazy-card.ts:19–25`), derives `cardSpec` (`card-spec.ts`, `shareHref: /c/<kind>/<id>` at `:168,242,312,390,445,519`), and shows the CTA only when `cardSpec` is non-null (a few kinds have none, e.g. no card for Sun, Belt, stars). The button sets `cardOpen = true`; `<cards.CardOverlay spec open onClose>` renders after `</Panel>` (`PlanetPanel.svelte:387–389`, same in 6 others). Test id `open-card-btn`.
- **Overlay (`CardOverlay.svelte`):** a modal (`role="dialog" aria-modal`, z 220, focus trap `:110–138`, Escape in capture phase `:102–108`) showing the `CollectibleCard` and buttons **Share card** (the generated JPEG, probed with HEAD, native share sheet or download, `:66–95`), **Share link** (`sharePath(spec.shareHref, title)` = the `/c/<kind>/<id>` stub, `:54–64`) and Close. Analytics: `card-open` on open, `card-share` per share (PRD-036 §4 counts them).
- **Stub:** `src/routes/c/[kind]/[id]/+page.svelte` carries the Open Graph tags and `goto()`s the human to the app view; `src/routes/cards/[kind]/[id]` is the render stage that produces the JPEG.
- **Nav Share (A6):** `shareCurrent()` shares `location.href` (public origin on Capacitor); no card, no OG stub.
- **Docs and tests that say "Collector card":** `docs/adr/TA.md:219`, `docs/prd/PRD-036.md:11`, `tests/e2e/collectible-cards.spec.ts:8` (comment; the test uses the test id), `messages/*.json` (`card_open_button`, 14 locales), `docs/uxs/records/UXR-001…md:24` (the dated input record, not edited).
- **Locale forms for "Share" already exist** in all 14 locales as `lab_ui_share`: ar مشاركة, de Teilen, en Share, es Compartir, fr Partager, hi साझा करें, it Condividi, ja 共有, ko 공유, nl Delen, pt-BR Compartilhar, ru Поделиться, sr-Cyrl Подели, zh-CN 分享.

### 2.6 Tests that touch this area

`collectible-cards.spec.ts` (test id `open-card-btn`, overlay selectors; unchanged), `fleet.spec.ts:210`, `iss.spec.ts:64`, `tiangong.spec.ts:56`, `iss-module-gallery-race.spec.ts:66`, `surface-url-mirror.spec.ts:46`, `missions.spec.ts:137,154,325,334`, `fly.spec.ts:236`, `tour-stage-execution.spec.ts`, `panel-lightbox.spec.ts`, `panel-gallery-viewer.spec.ts`, `chip.spec.ts:313,314,380–383`, `type-floor.spec.ts:133,275,284` (computed styles inside `aside.panel`), `accent-colour.spec.ts:198`, `mobile-landscape.spec.ts:40`. No panel PNG baseline was found in `visual.spec.ts` by `grep -i panel` (§15).

## 3. Findings that shape the proposal

1. **P4 is structural, not a z-index slip.** The × lives outside the scroll container and is transparent; no CSS tweak of the button fixes content passing under it. The two honest fixes are Q6's (a) put it inside the scroll flow or (b) take a row out of the scroll container. D2 chose (b).
2. **A bar is the existing pattern.** The three index panels already keep their × in a header outside a scrolling list; a bar makes the detail panels match them.
3. **A flex row above `.content` needs no sticky and no z-index**: nothing scrolls under it, so "solid background" holds by construction; the panel background (`--color-panel-bg`) is already behind it.
4. **The action stack is the "stuck at the bottom" cause.** The bars sit after `.tab-content`, so they are below the whole tab body on every tab; "at least on some tabs" (EP4) is the symptom of their placement outside the tab.
5. **No panel has all four named actions** (§1, A6 row); the largest set is Site: 3 + Share.
6. **The surface-site panel already is the target pattern**: three A4 chips in a row in the head, above the hero (HEAD `:6278`). B1 generalises it.
7. **P5 is a rename plus a move**, not a behaviour change (D1). The overlay, analytics event, test id and share artefacts stay.
8. **Fixes found on the way, inside code B1 rewrites:** hard-coded English (4 strings), non-localised `{base}` link, retired private blues, swipe-to-close ignoring `scrollTop` (§1.1).

## 4. Proposal

### 4.1 Hero (P3)

`panel-tabs.css:98–103` becomes two rules: `.panel-hero-btn:hover { }` removed (the base rule keeps `cursor: zoom-in`); `.panel-hero-btn:focus-visible { outline: 2px solid var(--color-focus); outline-offset: -2px; }`.
No border colour change, no `box-shadow`, no `color-mix` on hover. The offset is negative so the ring is not clipped by `.fleet-hero { overflow: hidden }` (§2.2). The transition on `border-color` / `box-shadow` (`:94–96`) goes. Touch devices lose the sticky tap "hover" ring as a side effect. `.panel-hero-btn` stays on the chip sweep allow-list (image button). One shared rule reaches all 10 panels.

### 4.2 The header bar (Q6, D2)

`Panel.svelte` gains `<div class="panel-bar">` as a flex-row **between `.panel-dock` and `.content`** (a flex sibling, not sticky):

```
.panel  (flex column, overflow hidden)
  .panel-dock        0 | 64 px while the Curator Tour is docked (unchanged)
  .panel-bar         flex row, align-items center, padding-inline 14px, padding-block 4px (fine) | 0 (coarse)
                     border-bottom 1px rgba(255,255,255,.06), background var(--color-panel-bg)
     [← Back]        <Chip kind="action" class="panel-back" aria-label={panel_back}>  only when canGoBack
     [name]          flex:1, min-width:0, ellipsis, --size-meta (12 px), 85 % white, aria-hidden (the h1 and aria-label carry it)
     [Share]         only when the host passes onShare (§4.5)
     [×]             <Chip kind="action" class="panel-close" data-audio-stage="panel-close" aria-label={panel_close}>
  .content           scroll container, unchanged; padding-top 14px; .has-back padding removed
```

- **Sizes:** the chips are the A4 chip: 30 px fine, 44 px coarse. Bar height = chip + 4 px top and bottom on fine pointers = **38 px**; **44 px** on coarse (no padding, the chip is the bar). Back and close are icon-only chips (`min-inline-size` 30 / 44).
- **Name reveal:** the name is hidden at scroll 0 and fades in (120 ms, none under `prefers-reduced-motion`) once the hero has scrolled out: threshold = bottom edge of the `.panel-hero` element in `.content` when there is one, else of the content's first child; checked in an rAF-throttled passive `scroll` handler; reset on open and on `title` change. Text = the `title` prop, which all 25 consumers already pass. Panels with no hero reveal it once the identity block has left.
- **Dock and tour:** unchanged; the bar sits under the 64 px dock (`--panel-dock-h`), the old `top: calc(var(--panel-dock-h) + 14px)` formula is deleted.
- **Contracts kept:** `<aside class="panel">`, `button.panel-close`, `.panel-back`, `data-audio-stage="panel-close"`, Escape, scrim, DOM order back → close → content. `.panel-close` / `.panel-back` come off the chip sweep allow-list because they are chips now.
- **Net vertical cost (arithmetic):** +38 px (desktop) / +44 px (touch) on every panel; panels with a back button save the old 44 px `has-back` padding (net ~ 0). Phone landscape (touch, ~340 px of panel height): the 44 px bar is 13 % of the panel — see §11 O8.
- **RTL:** back is `inset-inline-start`, close `inset-inline-end`: flex order mirrors them. The `←` glyph does not mirror in RTL today and is not changed here (§15).
- **Width budget on a phone (390 px, 362 px inner):** back 44 + gap 6 + Share (12-letter `Compartilhar` ~115 px, worst case) + gap 6 + close 44 = ~215 px, leaving ~147 px for the name; the name collapses (`min-width: 0`) before anything wraps.
- **Swipe-to-close (O4):** the handlers move from the aside to the bar (`ontouchstart` on `.panel-bar`) plus the content only while `.content.scrollTop === 0`.

### 4.3 The action row (EP4, MI4, holistic model in §5)

One new component `src/lib/components/PanelActions.svelte` (≤ 40 lines): a `.ui-chip-group` (flex, wrap, 6 px gap, `margin: 12px 0 0`) that renders its `children`; it renders nothing when the snippet is empty. The panel passes `<Chip kind="action" | "link">` children. Placement and order: §5.

### 4.4 Labels (14 locales)

Long labels do not fit a compact row at 364 px (`▶ PLAN A MISSION TO NEPTUNE` ≈ 27 chars ≈ 205 px; Planet on Earth with two long chips wraps to three lines). Recommended (O2): short keys, destination dropped (the panel is that planet), glyphs moved to the chip icon slot.

| New / changed key | en-US | Replaces | Locale source |
|---|---|---|---|
| `panel_share` | Share | `card_open_button` ("Collector card") | `lab_ui_share` in all 14 locales (list in §2.5), no new translation |
| `panel_action_plan` | Plan mission | `panel_plan_mission_cta` ("▶ PLAN A MISSION TO {name}") | new, 13 locales through the glossary tools |
| `panel_action_surface` | Explore surface | `panel_explore_surface_cta` ("▷ EXPLORE {name} SURFACE") | new, 13 locales |
| `mp_surface_mars_orbit`, `mp_surface_lunar_orbit`, `mp_surface_mars_surface`, `mp_surface_lunar_surface` | In Mars orbit / In lunar orbit / On the Mars surface / On the lunar surface | hard-coded strings `MissionPanel.svelte:864–871` | new, 13 locales |

`mp_fly_button` ("FLY THIS MISSION") stays (MI4 quotes it; `routes/missions/[id]/+page.svelte:149` also uses it). Old keys `card_open_button`, `panel_plan_mission_cta`, `panel_explore_surface_cta` have no other consumer (`git grep`, §2.4) and are removed from 14 locales and `en-source-hashes.json` by the i18n tools. Uppercase comes from the chip CSS; the planet name is no longer upper-cased in JS.

### 4.5 Share (Q3, D1) — rename, same overlay

- The chip text is `panel_share`; the handler is unchanged: `cardOpen = true`, `<cards.CardOverlay>` as today, `data-testid="open-card-btn"` kept, `aria-haspopup="dialog"` added (the chip opens a dialog; no new aria string).
- The overlay's own buttons stay "Share card" / "Share link" (`card_share_card`, `card_share_link`), so the sequence reads Share → pick a form. Analytics event names `card-open` / `card-share` unchanged.
- `PanelActions` does **not** own Share; the host panel passes `onShare={cardSpec ? () => (cardOpen = true) : undefined}` to `Panel` (bar slot, recommended) or renders it as the last row chip (row alternative). Either way the 7 hosts keep one `cardOpen` state.
- A6's More-menu "Share this view" is the second share: it needs no change; the doc (UXD-017) states the difference: panel Share = this entity (card, OG stub), nav Share = this URL.
- The rejected option (a bare share-link action, no card) would have removed `CollectibleCard` from the UI, orphaned `card-open` analytics and changed `collectible-cards.spec.ts`; it is recorded in UXD-017 as not chosen.

## 5. Panel actions — one model (D3)

### 5.1 The model

Four places, one rule each:

1. **Header bar** (always present, D2): *navigation of the panel itself and the one entity-level utility*. Back, name, **Share** (when the entity has a card), Close. Never an action that leaves the page or changes the scene.
2. **Action row** (`PanelActions`): *what you can do with this entity*, at most **3 chips**, directly under the identity block (name, status, stats) and **above the hero**, on every tab. Absent when the panel has no such action.
3. **Inline in content**: references and reading links — Vehicle / Payload / Mission cards, Launches-from-here, "See path on /explore", science and gallery links, learn-more links, tier links. They have a context sentence or a data value next to them.
4. **Nothing at the foot.** No `.cta-bar`, no stack at the bottom; the foot of the content is credits and attribution.

**Order inside the row (rule):** in-scene first, then view, then simulate, then plan.
(a) *in-scene* actions change what the scene shows and stay on the page: Stand here, Zoom in, View route (and their Exit swaps);
(b) *view* actions open another view of the same entity: Explore surface, On the surface ↗, Open explorer, Enter system;
(c) *simulate*: Fly this mission;
(d) *plan*: Plan mission.
The first chip is the most reversible; a destructive-of-context action (leaving /explore for /plan) is last. At HEAD the order is Plan → Explore surface (Planet) and Card → Fly → surface link (Mission): both change.

**Cap and overflow:** max 3 chips per row (the largest set at HEAD is Site's 3, with Stand here / Zoom in swapping to their Exit labels, not adding). A 4th action is a design error: it belongs inline (rule 3) or on a different panel. The row wraps (`flex-wrap`), never scrolls and never hides a chip behind a menu; each chip keeps `min-width: 0` and `white-space: normal` as the site chips do (HEAD `:7118–7124`).

**Look:** the A4 chip, kind `action` or `link`, outline at rest, world tint on the Worlds, blue elsewhere. **No primary variant** (§11 O3): the order carries priority; a filled variant would be a second look, and a soft-fill look already means "on" in A4. Fly and Plan lose their solid `#1a33bb`.

**Phone vs desktop:** same model, same markup. Chips are 44 px on touch (A4) so a 2-chip row is 44 px, a wrapped row 94 px; the bar is 44 px; the sheet still scrolls the content only. In landscape touch the side drawer is used, as today (`Panel.svelte:199–206`).

### 5.2 Per panel type

| Panel | Bar | Action row (order) | Inline | Gone |
|---|---|---|---|---|
| Planet (/explore) | back, name, Share, × | Explore surface (Earth, Mars) · Plan mission (when missionable) | Missions tab entries, Learn tab | 3 bottom bars |
| Satellite | same | Explore surface (Moon) | | 2 bottom bars |
| Small body | same | none | | 1 bottom bar |
| Sun, Belt, Exoplanet, Regime, Phase | back, name, × | none (Belt/Sun inline links stay) | | |
| Star | back, name, × | Enter system (B3 builds it with `PanelActions`) | System-tab schematic | `.enter-system` (B3) |
| Deep sky | back, name, × | Enter forming system (B3) | gateway note, gallery link, credit | `.gateway-btn` look (B3) |
| Black hole, Milky Way, Local group … | back, name, × | none | Learn more → (closing line) | |
| Message | back, name, × | Mission details (view) | | foot button |
| Mission | back, name, Share, × | Fly this mission · On the (lunar) surface ↗ | Vehicle / Payload cards, See path on /explore | 3 bottom buttons |
| Fleet | back, name, Share, × | Open explorer (ISS, Tiangong) | Mission card(s) | explorer block, bottom bar |
| ISS / Tiangong module | back, name, × | none | science links | |
| Earth object | back, name, Share, × | none | | bottom bar |
| Museum, Observatory | back, name, × | none | external website link | |
| Site (/moon /mars /venus /earth) | back, name, Share, × | Stand here · View route · Zoom in | Launches from here chips, Journey rows | `.site-cta-bar` (becomes `PanelActions`), bottom bar |

### 5.3 ASCII sketches (panel width 400 px / 390 px phone; × = close, ← = back; heights are arithmetic)

**Mars, /explore (planet panel)**

Desktop (Share in the bar, recommended)
```
┌───────────────────────────────────────────────┐
│ MARS                       [SHARE]       [ × ]│ bar 38 px (name fades in after the hero)
├───────────────────────────────────────────────┤
│ TERRESTRIAL PLANET                            │
│ MARS                                          │
│ [FROM SUN 1.52 AU ...]  [PERIOD 687 d ...]    │
│ [EXPLORE SURFACE] [PLAN MISSION]              │ row 30 px
│ ┌───────────────────────────────────────────┐ │
│ │ hero 16:9 (focus ring only, no hover glow)│ │
│ └───────────────────────────────────────────┘ │
│ OVERVIEW  GALLERY  TECHNICAL  MISSIONS        │
│ lead text …                                   │
```
Phone
```
┌─────────────────────────────────────────┐
│ [←]  MARS            [SHARE]       [ × ]│ 44 px
├─────────────────────────────────────────┤
│ TERRESTRIAL PLANET / MARS / stats …     │
│ [EXPLORE SURFACE]    [PLAN MISSION]     │ 44 px (wraps to 2 rows in de, ru)
│ hero …   tabs …   text …                │
```

**Perseverance, /mars (site panel)**

Desktop
```
│ [←] PERSEVERANCE              [SHARE]   [ × ]│ bar
├──────────────────────────────────────────────┤
│ NASA · [ACTIVE]                              │
│ PERSEVERANCE                                 │
│ ROVER · Jezero crater                        │
│ [STAND HERE] [VIEW ROUTE] [ZOOM IN]          │ row (tinted on hover, Mars red)
│ hero …   OVERVIEW JOURNEY GALLERY LEARN      │
```
Phone: same three chips, wrapping after two at 354 px when the labels are long (`Zoom in` + `Stand here` + `View route`).

**Apollo 11, /missions (mission panel)**

Desktop
```
│ APOLLO 11                     [SHARE]   [ × ]│ bar
├──────────────────────────────────────────────┤
│ NASA · [FLOWN]                               │
│ APOLLO 11   (badge)                          │
│ crewed lunar landing                         │
│ [FLY THIS MISSION] [ON THE LUNAR SURFACE ↗]  │ row (was: 3 stacked bars at the foot)
│ hero …   OVERVIEW FLIGHT GALLERY SCIENCE     │
│ dispatch … grid … [VEHICLE: Saturn V][PAYLOAD…]│ (cards stay inline)
```
Phone: the row wraps to 2 lines (`FLY THIS MISSION` ~125 px + the surface link ~190 px > 354 px), 2 × 44 = 94 px.

### 5.4 Cost and gain in the first screen (arithmetic at 1440 × 900, desktop, A6's 52 px nav)

Mars planet panel: nav 52 + bar 38 + padding 14 + identity block ~126 + row 42 + hero 205 + 12 + tabs 58 → Overview text starts ~547 px from the top of the viewport (today ~490 without bar or row: bar +38, row +42, back padding not present). At 1366 × 768 (716 px panel height) ~170 px of Overview text show before scrolling (today ~226). The trade is -56 px of first-screen text for a close that never overlaps and actions that no longer need scrolling. Panels without row actions (SmallBody, EarthObject, Fleet without explorer, Sun …) pay only the bar. §13 measures the real numbers.

### 5.5 Risks the model creates (stated, with the check)

- The bar is a second place where Share can pop in after `loadCardModules()` resolves; the name column absorbs the shift. Check in `panel-shell.spec.ts`.
- A 3-chip row with `de` / `ru` / `ar` labels wraps to 2–3 lines on a phone (L26). Check in §13 shots for `de` and `ar`.
- Removing the foot stack removes a way to reach Plan / Fly on tabs the operator may have used them from; the row is on every tab, so reachability is the same.

## 6. Replacement map

| Old | New |
|---|---|
| `.panel-close`, `.panel-back` private 44 px squares, `position: absolute` | `<Chip>` in `.panel-bar` (`Panel.svelte`) |
| `.content.has-back { padding-top: 58px }`, `class:has-back` | removed |
| `.panel-hero-btn:hover, :focus-visible` accent border + `box-shadow` | `:focus-visible` inset `--color-focus` outline only |
| `.cta-bar` + `.cta` / `.cta-secondary` / `.cta-card` (Planet, Satellite, Mission) | `PanelActions` with `<Chip>`s |
| `.card-cta-bar` + `.cta-card` (SmallBody, EarthObject, Fleet, Site) | Share chip in the bar |
| `.explorer-cta` (Fleet), `.surface-link` (Mission), `.site-cta-bar` (Site) | `PanelActions` |
| `card_open_button`, `panel_plan_mission_cta`, `panel_explore_surface_cta` | `panel_share`, `panel_action_plan`, `panel_action_surface` |
| hard-coded `IN MARS ORBIT ↗` … | 4 `mp_surface_*` keys |
| `#1a33bb`, `#2244dd` in Mission and Planet panels | removed with the CTAs |

## 7. Hit list (baseline: **147 violations** at `08162eae062`, `B1_REV=HEAD python3 b1-check.py`)

By kind: HERO-HOVER-GLOW 1, HERO-GLOW 1, HERO-NO-FOCUS-RING 1, CLOSE-ABSOLUTE 2, NO-BAR 1, HAS-BACK-PADDING 2, CLOSE-NOT-CHIP 2, OLD-KEY 21 (7 in `src` + 14 locales), NO-SHARE-KEY 14, NO-COMPONENT 1, NO-ACTION-ROW 7, OLD-CTA-CSS 37, OLD-CTA-MARKUP 37, HARDCODED-EN 4, RETIRED-BLUE 6, SWEEP-ALLOW 3, NO-SPEC 1, NO-UXD 1, DOC-STALE 4, DOC-MISSING 1. The seven panels: `MissionPanel`, `PlanetPanel`, `SatellitePanel`, `FleetEntryPanel`, `SmallBodyPanel`, `EarthObjectPanel`, `SurfaceScene` (site panel). Allow marker: `b1-keep: <why>` inside the CSS rule or on / just above the markup line. After the slice the script must print `B1-CHECK violations: 0`.

## 8. Allow-list (not touched, with reason)

- `.spec-cta` Vehicle / Payload / Mission cards (`MissionPanel.svelte:1202–1290`, `FleetEntryPanel.svelte:952–1040`): two-line navigation cards with a data value; on UXD-014's allow-list. Their three private navy blues are palette work (new deferred item L29).
- `.panel-hero-btn` (image button), `.gallery-thumb`, `.panel-backdrop` scrim: chip-sweep furniture.
- `.explore-backlink`, Launches-from-here chips, Journey rows, link tiers: inline content (rule 3 of §5.1).
- StarPanel `.enter-system`, DeepSky `.gateway-btn` / `.gallery-link`, `.learn-link`, Message `.mission-link`: other slices (B3) or content (learn links).
- Index panels' × (`.bidx-close`, `.si-close`, `.sidx-close`): A5's files (§11 O6).
- Standalone entity pages' `.cta` (`SiteEntityPage.svelte`, `missions/[id]`, `fleet/[id]`, `explore/[id]`, `lab/[id]`, `+page.svelte`, `+error.svelte`): pages.
- `AudioOverlay` compact dock: unchanged; the bar sits under it.

## 9. Tests, docs, locales

**Tests (three Playwright projects):** new `tests/e2e/panel-shell.spec.ts`:
1. Bar present on a planet, mission, fleet and site panel; `button.panel-close` closes; `.panel-back` appears after following a card link (as `missions.spec.ts:321–345`).
2. Scroll `aside.panel .content` by 600 px: the bar rect is unchanged, `.content` rect starts at the bar's bottom, `document.elementFromPoint` at the × centre returns the × (content never under it).
3. Name appears after the hero has scrolled out and is hidden at scroll 0 (opacity / `hidden`).
4. Hero hover: `getComputedStyle(.panel-hero-btn).boxShadow === 'none'` and `borderColor` unchanged after `hover()`; keyboard focus shows a 2 px outline in `--color-focus`.
5. Chip sizes in the bar and row: 30 px fine, 44 px coarse (three projects).
6. Row is above the hero (`row.bottom <= hero.top`), contains the expected chips per panel (§5.2), at most 3, no `.cta` / `.cta-card` / `.cta-bar` left in any panel.
7. Share opens `.backdrop .card` (reuses `collectible-cards.spec.ts` helpers); `Escape` closes only the overlay.
8. Swipe-down closes only from the bar or at `scrollTop` 0 (touch project).

Changed: `chip.spec.ts` allow-list loses `.panel-close`, `.panel-back`, `.cta-card`; its sweep then verifies the bar and row chips. `collectible-cards.spec.ts:8` comment says "Share". `missions.spec.ts:137,154`, `fly.spec.ts:236` keep working through the kept test ids `fly-mission-btn`, `surface-link`. Visual baselines: regenerate in Docker any PNG that shows a panel (none found, §15). Audio-tour specs are not edited (the `data-audio-stage` stays).

**Docs (rule says the new rule, links UXD-017):** `docs/concept/05_Design_System.md:266` ("close button … 24px circle … top-right within the header") and §5.3 panel anatomy (bar, action row); `docs/uxs/UXS-001.md` "Detail panel tabs" diagram (`:58–66`); `docs/adr/TA.md:219` (the CTA is "Share"); `docs/prd/PRD-036.md:11` ("quiet 'Collector card' CTA"); `src/lib/components/README.md:6` (Panel shell: the bar; `PanelActions`); `src/lib/cards/README.md`; `docs/uxs/IA.md` (§controls: panel action row); `docs/uxs/CHANGE-INVENTORY.md` row B1; `docs/uxs/decisions/UXD-017-panel-shell-and-actions.md` (appendix draft; 013 is unused, 015 and 016 are reserved by the A5 and A6 briefs); UXD-014 gets a "superseded in part" line for the panel CTAs. The 314 px width in IA is UXS-000 SC-2, not B1.

**Locales (14):** §4.4: 7 new keys, 3 removed; `panel_share` copies `lab_ui_share`; the other six go through the glossary and the standard i18n tools; `validate-data` green. Glossary check for "share" in `native-terms.json` was not made (A5 has uncommitted edits to it).

## 10. Order of work

1. Wait for A5 to land (SurfaceScene, index panels). 2. `Panel.svelte` bar + `PanelActions` + hero CSS + `panel-shell.spec.ts` (red first). 3. Convert the 7 panels. 4. Keys and locales. 5. Docs, UXD-017, chip.spec allow-list. 6. Run `b1-check.py` → 0; targeted specs on three projects; shots (§13). `npm run preflight` once before the push, not per change.

## 11. Decisions and open questions (operator)

**Decided (§0a):** D1 Q3 Share = renamed card overlay; D2 Q6 slim fixed bar; D3 holistic model (this brief proposes it; the operator approves §5).

**Open, recommendation first:**

- **O1 Where does Share sit?** (a) **In the bar** (recommended): it is an entity utility like Close, reachable at any scroll depth and on every tab, costs no extra height (the bar exists), and keeps the row for actions so SmallBody, EarthObject and Fleet get no lone-chip row (saves 42 px on three panels); text chip "SHARE" at 30 / 44 px. Cost: the bar's content varies by panel (as the back button already does); worst-case width §4.2. (b) In the row, last chip: one place for every button, but a row holding only Share on three panels and Share jumping after the load of the card code.
- **O2 Short labels?** (a) **Yes** (recommended): `Plan mission`, `Explore surface`, `Share` and four surface-link keys; 6 new strings × 13 locales, 3 keys removed. (b) Keep the long labels with `{name}`: no new translation, but the row wraps to 2–3 lines on Earth and Mars.
- **O3 Look: chip only, or a primary variant?** (a) **Chip only** (recommended): consistency above all, A4's one look, order carries priority; this reverses UXD-014's allow-list entry for panel CTAs and drops the solid blue of Fly and Plan. (b) A filled first chip: stronger "do this" on a mission, but a second look that A4 removed and an unavoidable clash with the soft-fill "on" state.
- **O4 Swipe-to-close.** (a) **Restrict to the bar and `scrollTop` 0, inside B1** (recommended; same file and the same scroll behaviour as P4). (b) Leave it; then it is a deferred item (L-number) with the finger-drag-on-a-scrolled-list case written down. Not tested on a device (§15).
- **O5 Gallery thumbs hover** (`panel-tabs.css:168–173`, accent border + 1.02 scale). **Leave** (recommended: P3 names the hero; the thumb highlight tells which of many); or make it the same inset focus-only look.
- **O6 Index panels' ×** (`bidx-close`, `si-close`, `sidx-close`). **Align after A5 lands**, in a follow-up commit of B1 (recommended: they are the same control family); or leave them as A5 builds them.
- **O7 The Vehicle / Payload / Mission card blues** (`#0c1660`, `#1f4ca8`, …): **leave** for the end-of-work palette review (L4/L29) (recommended) or move them to chip tokens in B1.
- **O8 Phone landscape bar height.** 44 px of ~340 px is 13 %. (a) **Accept** (recommended: the touch rule is 44 px everywhere). (b) 36 px bar in `html[data-touch][data-orientation='landscape']` only, with the chips at 36 (breaks the A4 44 px touch rule).

## 12. Check (re-run by the independent checker; must print `B1-CHECK violations: 0`)

Run from the repo root: `python3 b1-check.py` (working tree) or `B1_REV=<sha> python3 b1-check.py`. Baseline at `08162eae062` (run once, no tests of its own): 147. Contents of `b1-check.py`:

```python
#!/usr/bin/env python3
# B1-CHECK — run from the repo root:  python3 b1-check.py        (working tree)
#                                      B1_REV=HEAD python3 b1-check.py   (a commit, via git show)
# Prints each violation as KIND file:line text, then "B1-CHECK violations: N".
# Allow marker: `b1-keep: <why>` inside the CSS rule, or on / just above the markup line.
import os
import re
import subprocess
from collections import Counter

REV = os.environ.get('B1_REV')
V = []


def add(kind, f, line, text):
    V.append((kind, f, line, ' '.join(str(text).split())[:90]))


def read(f):
    if REV:
        r = subprocess.run(['git', 'show', f'{REV}:{f}'], capture_output=True, text=True)
        return r.stdout if r.returncode == 0 else None
    return open(f, encoding='utf-8').read() if os.path.exists(f) else None


def tracked(pattern_dir):
    r = subprocess.run(['git', 'ls-tree', '-r', '--name-only', REV or 'HEAD', pattern_dir],
                       capture_output=True, text=True)
    files = r.stdout.split()
    if not REV:
        files = sorted(set(files) | set(subprocess.run(['git', 'ls-files', '-o', '--exclude-standard', pattern_dir],
                                                        capture_output=True, text=True).stdout.split()))
    return files


def css_of(src):
    m = re.search(r'<style[^>]*>(.*?)</style>', src, re.S)
    if not m:
        return '', src, 0
    return m.group(1), src[:m.start()] + src[m.end():], src[:m.start(1)].count('\n') + 1


def rules(css, base):
    for rm in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sel = ' '.join(re.sub(r'/\*.*?\*/', '', rm.group(1), flags=re.S).split())
        yield sel, rm.group(2), base + css[:rm.start(2)].count('\n'), rm.group(0)


PANELS = [
    'src/lib/components/MissionPanel.svelte',
    'src/lib/components/PlanetPanel.svelte',
    'src/lib/components/SatellitePanel.svelte',
    'src/lib/components/FleetEntryPanel.svelte',
    'src/lib/components/SmallBodyPanel.svelte',
    'src/lib/surface-scene/EarthObjectPanel.svelte',
    'src/lib/surface-scene/SurfaceScene.svelte',
]
LOCALES = ['ar', 'de', 'en-US', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'nl', 'pt-BR', 'ru', 'sr-Cyrl', 'zh-CN']
OLD_CTA = re.compile(r'(^|[\s,>])\.(cta|cta-bar|cta-secondary|cta-card|card-cta-bar|surface-link|explorer-cta|site-cta-bar)(?![\w-])')

# P3 hero: no hover glow, a keyboard-only focus ring
f = 'src/lib/styles/panel-tabs.css'
src = read(f) or ''
has_ring = False
for sel, body, ln, raw in rules(src, 1):
    if '.panel-hero-btn' not in sel or 'b1-keep' in raw:
        continue
    if ':hover' in sel and re.search(r'box-shadow|border-color|background|outline', body):
        add('HERO-HOVER-GLOW', f, ln, sel)
    if re.search(r'box-shadow\s*:', body):
        add('HERO-GLOW', f, ln, sel)
    if ':focus-visible' in sel and ':hover' not in sel and re.search(r'outline:\s*[^;]*--color-focus', body):
        has_ring = True
if not has_ring:
    add('HERO-NO-FOCUS-RING', f, 1, '.panel-hero-btn:focus-visible without outline: ... var(--color-focus)')

# P4 close / back: a slim bar, no absolute buttons floating over the scroll container
f = 'src/lib/components/Panel.svelte'
src = read(f) or ''
css, markup, base = css_of(src)
for sel, body, ln, raw in rules(css, base):
    if re.search(r'\.panel-(close|back)(?![\w-])', sel) and not re.search(r':hover|:focus', sel) \
            and 'position: absolute' in body and 'b1-keep' not in raw:
        add('CLOSE-ABSOLUTE', f, ln, sel)
if 'panel-bar' not in src:
    add('NO-BAR', f, 1, 'no .panel-bar element')
for i, line in enumerate(src.splitlines(), 1):
    if 'has-back' in line:
        add('HAS-BACK-PADDING', f, i, line)
for bm in re.finditer(r'<button[^>]*?class="panel-(close|back)"', src, re.S):
    add('CLOSE-NOT-CHIP', f, src[:bm.start()].count('\n') + 1, bm.group(0).split('\n')[0])
if not re.search(r'data-audio-stage="panel-close"', src):
    add('CONTRACT', f, 1, 'data-audio-stage="panel-close" is gone (18 audio-tour stages click it)')
if not re.search(r'<aside\s+class="panel"', src):
    add('CONTRACT', f, 1, '<aside class="panel"> is gone (SurfaceScene and AnnotationRings query aside.panel)')

# P5 Share: the old label and its key are gone, the new key exists in 14 locales
for pth in tracked('src'):
    if not pth.endswith(('.svelte', '.ts')):
        continue
    s = read(pth) or ''
    for i, line in enumerate(s.splitlines(), 1):
        if 'card_open_button' in line:
            add('OLD-KEY', pth, i, line)
        if pth not in PANELS and re.search(r'class="[^"]*\b(cta-card|card-cta-bar)\b', line):
            add('OLD-CTA', pth, i, line)
for loc in LOCALES:
    s = read(f'messages/{loc}.json')
    if s is None:
        add('LOCALE-MISSING', f'messages/{loc}.json', 1, 'file missing')
        continue
    if '"card_open_button"' in s:
        add('OLD-KEY', f'messages/{loc}.json', 1, 'card_open_button still present')
    if '"panel_share"' not in s:
        add('NO-SHARE-KEY', f'messages/{loc}.json', 1, 'panel_share missing')

# EP4 / MI4: one row, one component, in the seven panels that have actions
comp = 'src/lib/components/PanelActions.svelte'
csrc = read(comp)
if csrc is None:
    add('NO-COMPONENT', comp, 1, 'file missing')
elif 'data-testid="open-card-btn"' not in (csrc + (read('src/lib/components/Panel.svelte') or '')):
    add('CONTRACT', comp, 1, 'the Share chip lost data-testid="open-card-btn" (collectible-cards.spec.ts)')
for f in PANELS:
    src = read(f) or ''
    css, markup, base = css_of(src)
    if 'PanelActions' not in src:
        add('NO-ACTION-ROW', f, 1, 'does not use PanelActions')
    else:
        a, h = src.find('<PanelActions'), src.find('<PanelHeroImage')
        if a >= 0 and h >= 0 and a > h:
            add('ROW-BELOW-HERO', f, src[:a].count('\n') + 1, '<PanelActions comes after the hero')
    for sel, body, ln, raw in rules(css, base):
        if OLD_CTA.search(sel) and 'b1-keep' not in raw:
            add('OLD-CTA-CSS', f, ln, sel)
    ml = markup.splitlines()
    for i, line in enumerate(ml, 1):
        if re.search(r'class="[^"]*\b(cta|cta-bar|cta-secondary|cta-card|card-cta-bar|surface-link|explorer-cta|site-cta-bar)\b', line) \
                and 'b1-keep' not in line and 'b1-keep' not in ml[max(0, i - 2)]:
            add('OLD-CTA-MARKUP', f, i, line)
        if re.search(r'IN MARS ORBIT|IN LUNAR ORBIT|ON THE SURFACE|ON THE LUNAR SURFACE', line):
            add('HARDCODED-EN', f, i, line)
    for i, line in enumerate(src.splitlines(), 1):
        if re.search(r'#1a33bb|#2244dd', line, re.I) and f.endswith(('MissionPanel.svelte', 'PlanetPanel.svelte')):
            add('RETIRED-BLUE', f, i, line)

# Tests, docs, decision record
f = 'tests/e2e/chip.spec.ts'
for i, line in enumerate((read(f) or '').splitlines(), 1):
    if re.search(r"'\.(panel-close|panel-back|cta-card)'", line):
        add('SWEEP-ALLOW', f, i, line)
if read('tests/e2e/panel-shell.spec.ts') is None:
    add('NO-SPEC', 'tests/e2e/panel-shell.spec.ts', 1, 'file missing')
if not [p for p in tracked('docs/uxs/decisions') if 'UXD-017' in p]:
    add('NO-UXD', 'docs/uxs/decisions', 1, 'UXD-017 missing')
doc_roots = ['docs/adr/TA.md', 'docs/prd/PRD-036.md', 'docs/concept/05_Design_System.md',
             'docs/uxs/UXS-001.md', 'src/lib/components/README.md', 'src/lib/cards/README.md',
             'tests/e2e/collectible-cards.spec.ts']
for f in doc_roots:
    for i, line in enumerate((read(f) or '').splitlines(), 1):
        if re.search(r'Collector card|collector card|24px circle', line):
            add('DOC-STALE', f, i, line)
if 'PanelActions' not in (read('src/lib/components/README.md') or ''):
    add('DOC-MISSING', 'src/lib/components/README.md', 1, 'PanelActions not documented')

for k, f, l, t in V:
    print(f'{k:18} {f}:{l}  {t}')
print('by kind:', dict(Counter(k for k, *_ in V)))
print(f'B1-CHECK violations: {len(V)}')
```

Known limits: the script matches class names in the seven listed panels only (a control renamed to a new class escapes; the runtime sweep in `chip.spec.ts` and `panel-shell.spec.ts` are the second net); it does not measure heights, colours or scroll behaviour; the Share chip test id may live in `Panel.svelte` or `PanelActions.svelte` (the check accepts either); the script has no tests of its own, and the embedded text above (not an earlier scratch copy) was extracted and run: `B1_REV=HEAD python3 b1-check.py` → `B1-CHECK violations: 147`.

## 13. Screenshots for the operator (dev server per AGENTS "Iterating on UI", not Docker)

Desktop 1440 × 900 and phone 390 × 844 (plus phone landscape 844 × 390 for the bar), before (HEAD) and after, **unscrolled and scrolled by one screen**, side by side:
1. Planet `/explore?id=mars` (Explore surface + Plan + Share in the bar), and Jupiter (Plan only). 2. Moon satellite `/explore?id=earth:moon`. 3. Small body `/explore?id=ceres` (Share only, no row). 4. Mission `/missions?id=apollo11` (Fly + surface link) and one mission without flight data. 5. Fleet `/fleet?id=perseverance`, `/fleet?id=saturn-v`, and an ISS fleet entry (Open explorer). 6. Surface site `/mars?site=perseverance` and `/moon?site=apollo11` (Stand here, Zoom in, View route; world tint on hover). 7. `/earth?object=iss` (Share only). 8. A panel after following a card link (the back button in the bar). 9. Hero hover and keyboard focus on a planet and on Fleet (inset ring). 10. A `de` shot of Mars and Apollo 11 for the row wrap (L26), an `ar` shot for RTL. 11. Curator Tour docked over a panel (the 64 px dock above the bar).

## 14. Acceptance (definition of done, per the plan)

1. `python3 b1-check.py` prints `B1-CHECK violations: 0`.
2. §9 docs state the rule and link UXD-017; CHANGE-INVENTORY row B1 updated.
3. `panel-shell.spec.ts` and the touched specs (`chip`, `collectible-cards`, `missions`, `fleet`, `iss`, `tiangong`, `surface-url-mirror`, `tour-stage-execution`, `panel-lightbox`, `type-floor`) green on desktop-chromium, mobile-chromium and mobile-landscape-chromium; nothing skipped.
4. 14 locales carry the 7 new keys, none carries the 3 old ones; `validate-data` green.
5. Shots of §13 shown to the operator; the lead has read the checker's evidence.

### Appendix — draft `docs/uxs/decisions/UXD-017-panel-shell-and-actions.md` (proposed; written when the go comes)

```
# UXD-017 — Panel shell: header bar, Share, and one action row
- Status: proposed
- Decider: the operator, 2026-11-12 (Q3, Q6, "holistic solution across Explore, Worlds and landers")
- Answers: P3, P4, P5, EP4, MI4; slice B1
- Changes: Panel.svelte, PanelActions.svelte, panel-tabs.css; Design System §5.3; UXS-001; IA §controls; TA.md Collectible cards; PRD-036; UXD-014 (panel CTAs leave its allow-list)
## Context  P4 close X over scrolled content; actions stacked at the foot; hero hover glow; "Collector card" at the bottom.
## Options  Close: scrolls away with content | slim fixed bar (chosen). Share: bare share-link action | renamed card overlay (chosen). Actions: foot stack | one row under the identity block (chosen) | row inside Overview only.
## Decision  A fixed bar (back, name after the hero, Share, close; A4 chip sizes). One row of at most 3 chips under the identity block, order in-scene → view → simulate → plan, A4 chip look, no primary variant. Hero: no hover, inset focus ring. Share opens the card overlay; nav "Share this view" shares the URL.
## Consequences  +38/44 px per panel, -69..207 px at the foot; 7 keys added, 3 removed; chip sweep allow-list shrinks.
## Verification  panel-shell.spec.ts, chip.spec.ts sweep, b1-check.py.
```

## 15. NOT VERIFIED (what this brief did not check)

- NV1 No browser, no build, no test run: every height, width, wrap and first-screen figure is CSS arithmetic (padding + line-height + token values). The "~147 px for the name" and "~215 px" bar budget used a character-width estimate for `Compartilhar`; no locale was measured.
- NV2 The statement that a flex row above `.content` needs no stacking fix assumes no consumer positions anything absolutely against `.panel` top; `StationRoute`, `AudioOverlay` and `AnnotationRings` read `aside.panel` geometry (`AnnotationRings.svelte:114`, `SurfaceScene.svelte` HEAD `:1803`, `:4803`, `:7210`, `:7603`) and were not read line by line for dependence on the first child's height.
- NV3 The 18 audio-tour `panel-close` steps and `tour-stage-execution.spec.ts` rely on the attribute, not on geometry; whether any tour step depends on the × being at a fixed pixel position was not checked.
- NV4 That `Chip`'s `...rest` forwards `data-audio-stage`, `aria-label` and `class="panel-close"` is read from `Chip.svelte:44,75–80`; not run. `Chip` uppercases text: the `×` and `←` glyphs are unaffected, not tested.
- NV5 Whether all 25 panels' first child of `.content` is their identity block (the name-reveal fallback): confirmed by reading for Planet, Mission, Fleet, Satellite, SmallBody, EarthObject, Site, Star, StationModule, Sun, Belt; not for Message, Phase, Regime, Museum, Observatory, DeepSky, BlackHole, MilkyWay, Local group/sheet, Virgo, Laniakea, Cosmic web, Exoplanet.
- NV6 Swipe-to-close: the claim that a finger drag on a scrolled list can close the panel comes from reading `onTouchStart/Move/End` (`Panel.svelte:96–112`), which ignore `scrollTop`; not reproduced on a device.
- NV7 `visual.spec.ts` was searched with `grep -i panel` (no hit); the 14 PNGs were not opened, so a panel visible inside a baseline would be missed.
- NV8 Whether `localHref` is required for `/earth` and `/mars` (the unlocalised `{base}/{id}` link, `PlanetPanel.svelte:365`) or the locale is restored by redirect was not tested.
- NV9 The glossary / `native-terms.json` has no checked entry for "share" or the two new action phrases (the file has A5's uncommitted edits); the 13-locale translations of `panel_action_plan`, `panel_action_surface` and the four `mp_surface_*` keys are not drafted.
- NV10 `ObservatoryPanel` / `MuseumPanel` were scanned for buttons and links only; hero, back and card were not read in full. `MessagePanel`, `PhasePanel`, `RegimePanel` likewise.
- NV11 The planned `PanelActions` API (a children snippet; Share owned by the bar) was not prototyped; whether `Panel` receives `onShare` as a prop or a snippet slot is the implementer's call.
- NV12 UXS-001/003/004/013 text about panels was read for the lines cited in §9 only; a fresh grep of every doc for "close", "cta", "hero" was not made.
- NV13 `b1-check.py` ran at baseline (HEAD and working tree both 147); the 147 were not each read, only the kinds and the first block of lines; `OLD-CTA-MARKUP` is line-based, a `class` split from its tag over two lines is missed (the 37 found are single-line `class=` attributes).
- NV14 A6's version of `Nav.svelte` (More menu, Share row) is a brief, not code; the "Share this view" relation is from that brief and `Nav.svelte:439`.
