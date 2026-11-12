# Slice B3 brief — outer panels and stars follow the planet pattern (SN2, MW3, MW5)

Read-only brief, written at HEAD `34019040ba8` (A1 type scale, A2 page shell, A3 accent tokens and A4 one chip landed on this branch; A5 is being built in the same checkout; B1 is being briefed in parallel and
`docs/wip/2026-11-12-slice-B1-brief.md` did not exist when this was written). Method: `git grep` and reading every file named below from the repo root; every `file:line` was read at that commit. The data
counts come from a script run as a file (`b3_measure.py`, §2.3), the hit list from `b3-check.sh` (§6, contents in this brief). No browser, no dev server, no Playwright, no build, no test run: nothing
below is a rendered measurement (§12).

## 0a. Decisions: what is recorded and what is not

| # | Status | Text and source |
|---|---|---|
| UXD-008 | **accepted** (operator go 2026-11-11, plan line 460) | Star panel: one hero (photo, else portrait); constellation finder in its own tab "In the sky" with the constellation named and linked; a Gallery tab when the star has more than one image. `docs/uxs/decisions/UXD-008-star-panel-one-hero-and-in-the-sky-tab.md` |
| MW3, Sag A\* | **clarified, no recorded go** | Plan lines 419–425: the panel gets the EHT 2022 image as hero (ESO/EHT Collaboration, CC BY 4.0, existing image tools, provenance row); the Milky Way view stays in the main area; the lensing render becomes an explicit action "See the lensing simulation". UXD-008 line "Consequences" and `CHANGE-INVENTORY.md:35` both say MW3 has no recorded go. **Q1 asks for it.** |
| MW5 | **open question in the operator's words** | "Deep-sky gallery images as hero images here?" (plan line 215). Not answered; UXD-008 "Consequences" adopts it for the plan row ("deep-sky images as heroes where one exists"). **Q3 fixes the rule for part-of images.** |
| Planet heroes | **standing rule** (memory "Explore heroes consistent") | Planet and explore page heroes stay consistent; none changes in a cleanup without a side-by-side and a yes. B3 changes the hero box of 10 star panels, so it owes a side-by-side (Q2, §9). |
| Q3 / Q6 (operator 2026-11-12, plan line 470+) | Q3 answered; Q6 recommendation pending | Q3: "Collector card" becomes "Share", keeps opening the card. Q6: lead recommends one slim fixed header bar on every panel; operator's yes pending. Both are B1's. |

## 0. The point list

| ID | Operator text (plan lines 206, 214, 215, 216–217 context) | State at HEAD |
|---|---|---|
| SN2 | Detail panel broken: all images placed on top push the overview down. Follow the pattern: one hero image, a gallery tab for more images, and a dedicated pattern for linking stars to zodiac signs (Antares → the zodiac chart). Clarified (plan 432–437): "the zodiac chart" is the constellation finder figure ("Scorpius from the Sun's sky"). | `StarPanel.svelte:156–185` stacks up to three blocks above the tab row: the photo (`:156–169`), the portrait (`:171–174`) and the finder (`:176–185`), each with its own caption; own tab markup `:187–217` (OVERVIEW, SYSTEM, TECHNICAL); no Gallery tab; the constellation is a plain string in the kind line (`:144`) and a TECHNICAL cell (`:331–336`); nothing links it anywhere. |
| MW3 | Detail panels look different from all others; align the styling. An image loads in the panel, not the main area (Sagittarius A\* / supermassive black hole). | Eight panels (`MilkyWayPanel`, `LocalGroupPanel`, `LocalSheetPanel`, `VirgoPanel`, `LaniakeaPanel`, `CosmicWebPanel`, `BlackHolePanel`, `DeepSkyPanel`) each carry the same private block: `.head/.kind/.name/.prose/.grid/.cell` in rem units (`MilkyWayPanel.svelte:103–163`, identical in the other seven), no tabs, no hero slot. Selecting the Sag A\* pin calls `enterBlackHole` (`explore-scene-host.ts:2411–2416`) which replaces the main area with the lensing render (`:552–588`) and opens `BlackHolePanel` text-only. |
| MW5 | Deep-sky gallery images as hero images here? | 44 of 141 deep-sky objects have a gallery photo (§2.3). No outer-level panel shows any; `DeepSkyPanel` receives the `image` prop and uses only `caption`, `telescope`, `credit` (`DeepSkyPanel.svelte:70–72,80,105`) and never draws the photo (the photo is the immersive main area, `explore-scene-host.ts:1486–1496`). |

## 1. Cascade — what the earlier slices change in B3, and what in the plan row is outdated

| Earlier slice | What it changes in B3's tactics | Outdated in the plan row? |
|---|---|---|
| **A1 type scale (UXD-002)** | Floor 11 px; `--size-label` 11 px at 60 %, `--size-body` 14 px, `--size-lead` 16 px; panel overview text is the one `.editorial` rule (`panel-tabs.css:72–77`), upright, in the body font. **The eight outer panels were missed by A1's lead rule:** their lead text is `.prose` at `0.85rem` (13.6 px, `MilkyWayPanel.svelte:117–122`) and 37 `rem` font sizes sit in those eight files (§6 `OUTER-REM-TYPE`). They pass the floor (0.7 rem = 11.2 px) and fail the scale. B3 puts them on `.editorial` + tokens. `type-floor.spec.ts:202–213` measures only `panel-star` of the star/outer family. | Nothing in the plan row; the A1 "done when" (no panel text under the floor) held, its lead-size half did not reach these panels. Folded into B3. |
| **A2 page shell (UXD-012)** | Pages only; panels are not pages. No change. | — |
| **A3 tokens (UXD-001)** | Final tokens `tokens.css:9–20`: `--color-accent` `#5070ff`, `-soft/-edge/-strong`, `--color-state` `#889fe7` (small text on a lifted background), `--color-focus`. New B3 CSS writes no colour of its own. `StarPanel.svelte:123` carries an `a3-keep` star-class colour (`#8fe6d8`, palette review L4): untouched, stays. | Nothing. |
| **A4 one chip (UXD-014)** | Tabs stay tabs: `PanelTabRow` and `[role="tab"]` are on A4's allow-list (`chip.spec.ts:291–292`), so moving `StarPanel` onto `PanelTabRow` adds no chip finding. Actions B3 adds are buttons: the sweep (`chip.spec.ts:283–287`) allows `.cta`, `.enter-system`, `.panel-hero-btn` (`:380–388`) and nothing else panel-shaped; `DeepSkyPanel .gateway-btn` is not on the list. B3's new buttons use `Chip kind="action"` or the B1 action row (below); a private button class is a finding, not a line to add. If `.enter-system` is replaced, its allow-list entry goes in the same commit. | Nothing outdated. |
| **A5 (being built)** | A5 puts the INDEX and A–Z together and gives index rows entity links; "the star index on the neighbourhood view is part of it" (`StarIndex.svelte`, `StarIndex` rows `si-row`). B3 does not touch `StarIndex`. Overlap: a star row that links its entity page needs a star target; the star "page" is the panel opened by `?goto=<id>` (`explore-url-sync.svelte.ts:143–161`). B3 keeps that URL contract unchanged so A5's link can use it. A5's E2E on the index must not assert panel internals that B3 moves (`star-tab-*` ids change to the `PanelTabRow` prefix, §5). | — |
| **A6 nav** | Header height token `--nav-height` 52 px; panels already use `var(--nav-height)` offsets. No B3 impact. | — |
| **B1 (parallel brief; shared panel shell)** | **B1 owns:** the hero hover (no glow, `panel-tabs.css:98–103` `.panel-hero-btn:hover`), the close/back header (`Panel.svelte`, Q6 fixed header bar pending), "Collector card" → "Share" and the compact action row near the top of Overview for planet, mission, fleet and surface-site panels. **B3 owns:** what is inside the star and outer panels (head, hero content, tabs, facts, lead). **Where they meet:** (1) B3's hero uses `PanelHeroImage`, so it inherits B1's no-glow with no work; (2) the actions B3 has (`Enter system →`, "See the lensing simulation", `View in gallery`, `Enter a forming system`, `Read more`) go into the row B1 defines; B3 does not invent a second row. **Order: B1 first, then B3.** If B3 must go first, it uses the existing `.cta-bar/.cta` markup (allow-listed) and B1 migrates it. (3) B1's Share applies only to panels that have a card (`cardSpec`, `PlanetPanel.svelte:78–82`); no star or outer panel has one, none is added. | The plan lists "star and outer-level panels follow the planet pattern" without the header and action row; those arrive from B1, not B3. |
| **B2 science links** | B2 caps every panel at 5 and makes lists per type. B3 leaves a `science` snippet slot in the shared body (§4) and does not curate links. Today: MW and BH have one `Read more` link each (`MilkyWayPanel.svelte:99`, `BlackHolePanel.svelte:92`); BH adds one `ScienceCard` (`:94`); LG, Local Sheet, Virgo, Laniakea, Cosmic Web have none; `StarPanel` lists the H–R article plus the overlay `links[]` (`:344–360`). | — |
| **C1 / C2 / C8 (Explore)** | C2 owns MW1/MW2/MW4/MW6 (labels, hover ring, anchor ring) and the "5 LY" ring label colliding with "Barnard's Star" (plan 436); not in B3. C1's `focusBody` is bodies, not stars. C8's per-level "what you are looking at" card (TierContextCard) is a different surface from the panel. | — |
| **Deferred list L1–L28** | L4 palette review owns the `a3-keep` star colours. L10 links UXD-008 from UXS-000 §Next: B3 adds the link when it lands. L26 (taller chips) has no star/outer panel. No deferred item belongs to B3; B3 adds **L29** (second star images, Q4) and **L30** (finder tab for deep-sky objects, Q6). | — |

Adjacent items: **fold in** the `.prose`→`.editorial` lead fix and the type-floor spec coverage (A1 gap, above); **leave** `PlanetPanel`'s own `.head/.cell` CSS (a migration of the planet family to the shared body is a follow-up and would change planet heroes, which the standing rule forbids without a side-by-side); **leave** SunPanel and ExoplanetPanel (Sun already has OVERVIEW/GALLERY/TECHNICAL/MISSIONS on `PanelTabRow`, `SunPanel.svelte:94`; ExoplanetPanel is the planet-of-another-star panel, not in SN2/MW3/MW5).

## 2. Inventory

### 2.1 The planet pattern, in code (what "hero / Gallery tab / tabs" means)

`PlanetPanel.svelte` (564 lines):
- Shell: `<Panel {open} {onClose} title>` (`:151`).
- Head `:153–166`: `.type` mono label, `.name` Bebas 36 px, optional `.stat-row` (CSS `:392–416`).
- **Hero** `:168–177`: `PanelHeroImage src={gallery[0]}` with `onOpen` → `PanelLightbox` (`:350`). `PanelHeroImage.svelte` draws a 16:9 `object-fit: cover` image via `responsive(src, IMAGE_SIZES.panel)` and the reviewed focal point from `heroPositionFor(src)`; CSS `panel-tabs.css:80–110`.
- **Tabs** `:179–192`: `PanelTabRow idPrefix="pp"` (`PanelTabRow.svelte`); tab `visible` gates; tab panel `:194` `role="tabpanel" id="pp-tabpanel"`.
- **Gallery tab** `:183,:339–347`: visible when `gallery.length > 0`; grid is `gallery.slice(1)` when there is more than one image (`:57`), else the single image; `PanelGalleryGrid` (`PanelGalleryGrid.svelte`) + `.gallery-credit`.
- Overview `:195–209`: two `.editorial` paragraphs, then the curated `ScienceCard`s.
- Data: `getPlanetGallery(id)` from `static/data/planet-galleries.json` (counts) + `static/images/planets/<id>/NN.webp`; hero overrides `static/data/planets-hero-overrides.json`.
The same skeleton is in `SunPanel`, `SmallBodyPanel`, `SatellitePanel`, `BeltPanel`, `MissionPanel` (all import `PanelTabRow`, `PanelHeroImage`, `PanelGalleryGrid`, `PanelLightbox`; checked by `git grep`). AGENTS.md:104 states the rule: "GALLERY is always the 2nd tab when present".

### 2.2 Every star and outer-level panel

| Panel (file, lines) | Mounted at | Entity | Shell | Hero | Tabs | Gallery | Constellation | Lead text | Actions |
|---|---|---|---|---|---|---|---|---|---|
| `StarPanel.svelte` (596) | `explore/+page.svelte:1967` | 62 named stars (`?goto=<id>`) | Panel full sheet | up to 3 stacked blocks (photo `:156`, portrait `:171`, finder `:176`), natural-ratio `<img class="real-photo">` (`:158–163`, CSS `:473–478`) | private `.tabs` OVERVIEW/SYSTEM/TECHNICAL (`:187–217`) | none | `ConstellationFinder` above the tabs; name in kind line and a TECHNICAL cell | `.editorial` (fact) + `.prose` 14 px (bio, cultural) | `Enter system →` full-width `.enter-system` above the hero (`:150–154`), H–R article link (`:344`) |
| `MilkyWayPanel` (163) | `:1999` | 19 pins: Sag A\*, Sun, 5 arms, 10 globulars, LMC, SMC | `mobileSheet="partial"` | none | none | none | none | `.prose` 0.85 rem | `Read more →` |
| `LocalGroupPanel` (124) | `:2006` | 33 galaxies | partial | none | none | none | none | `.prose` | none |
| `LocalSheetPanel` (98) | `:2008` | 9 groups | partial | none | none | none | none | `.prose` | none |
| `VirgoPanel` (102) | `:2009` | 7 members | partial | none | none | none | none | `.prose` | none |
| `LaniakeaPanel` (106) | `:2015` | 8 members | partial | none | none | none | none | `.prose` | none |
| `CosmicWebPanel` (109) | `:2010` | 7 structures | partial | none | none | none | none | `.prose` | none |
| `BlackHolePanel` (156) | `:2021` | 4 holes (`?bh=<id>`; MW pin; index rail) | partial | none | none | none | none | `.prose` (the `discovery` string) | `Read more →`, one `ScienceCard`, culture doors |
| `DeepSkyPanel` (183) | `:1986` | 141 objects (`?deepsky=<id>`) | partial | none (photo is the immersive main area) | none | none | `object.con` as a text cell | `.prose` (caption) | `Enter a forming system` (`.gateway-btn`), `View in gallery →`, culture doors |
| `ExoplanetPanel`, `SunPanel` | `:1977`, `:1964` | out of scope | | | | | | | |

The seven outer rows 2–8 are one component copy-pasted: `.head { margin-bottom: .5rem }`, `.kind` 0.7 rem, `.name` 1.1 rem sans 700, `.prose` 0.85 rem, `.grid` auto-fit, `.cell` 0.82 rem (e.g. `LaniakeaPanel.svelte:61–106`). The planet look is mono label, Bebas 36 px name, 7 px-gap two-column `.cell` boxes with mono 11 px values (`PlanetPanel.svelte:392–458`). That difference is MW3's "look different".

### 2.3 Data and images per panel type (measured by `b3_measure.py`)

Script: `/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/b3_measure.py` (plus `b3_list_photos.py`), output `b3_measure.out`, run from the repo root as files. "Exact" = the pictured object is the entity (normalised id, name or designation match, file exists under `static/images/deep-sky/`). "Representative" = hand-read from the object list: the photo shows a named part of the entity or the galaxy the group is named after (the `REP` table in the script).

| Panel type | Entities | Exact hero available | Representative only | None | Which |
|---|---|---|---|---|---|
| Named stars | 62 | **10 (16 %)**, all `kind: real`, one slot `01` each; **0 stars have a second image** | — | 52 | altair, antares, barnards-star, betelgeuse, fomalhaut, proxima-centauri, rigel, rigil-kentaurus, sirius, vega |
| Deep-sky objects | 141 | **44 (31 %)**, all 44 files on disk and with a provenance row (50 of 50 gallery files credited); by category: star-forming 12/13, supernova remnant 4/4, planetary nebula 7/10, galaxy 11/45, nebula 3/6, star cluster 2/27, globular 1/30 | — | 97 | 6 gallery images have no catalogue object (`hst-pillars`, `chandra-crab`, `pale-blue-dot`, `pluto-nh`, `sun-sdo`, `hst-orion`) |
| Milky Way pins | 19 | 2: `omega-centauri` → `hst-omega-centauri`; `sun` → `sun-sdo` (the Sun's own photograph, in the gallery file with no catalogue object) | 2: `lmc` → `jwst-tarantula` (30 Doradus), `smc` → `jwst-ngc346` (NGC 346) | 15 | `sagittarius-a-star` is a black hole (below) |
| Local Group | 33 | 1: `andromeda` → `hst-andromeda` (1600×512, 3.1:1) | 2: `lmc`, `smc` as above | 30 | |
| Local Sheet | 9 | 0 | 2: `ic-342-group` → `euclid-ic342`, `m101-group` → `hst-pinwheel` | 7 | |
| Virgo Supercluster | 7 | 0 | 0 | 7 | |
| Laniakea | 8 | 0 | 0 | 8 | |
| Cosmic web | 7 | 0 | 1: `perseus-pisces` → `euclid-perseus` | 6 | |
| Black holes | 4 | M87\*: the EHT 2019 image is already in the repo as the science-page photo `/images/science/black-holes-m87.webp` (1280×1280, with a provenance row, EHT, CC BY 4.0) | — | Sag A\* (no EHT 2022 file anywhere in `static/`, `git grep` for `EHT`, `eso2208`), Cygnus X-1 (no image), Gargantua (fiction, none) | |

Consequences for the "done when": the **Laniakea panel has no usable hero** (0 of 8); the shot will show the shared head, lead and facts with no image slot, not an empty frame. The Local Group shot uses Andromeda. The Milky Way shot uses omega Centauri or Sag A\* after the fetch. The star shot uses Antares or Sirius.

Image facts that shape the hero box: star photos are 600×600 (Antares) up to 2401×3001 (Sirius, portrait) and `PanelHeroImage` crops to 16:9 `cover` (`panel-tabs.css:104–110`); deep-sky originals range 1600×512 to 1600×1901 and exist only as `.jpg` + `.thumb.jpg` (700 px wide, 17–140 kB), **not on the WebP ladder** (`responsive()` returns a bare `src` for such an image, `responsive-image.svelte.ts:3–9`); `heroPositionFor` only knows the 11 surfaces in `image-hero.ts:52–64` (no `stars`, `black-holes`, `deep-sky`), so a reviewed focal point cannot be stored today.

### 2.4 Image tooling and provenance rules that apply (AGENTS.md, `scripts/IMAGE-PIPELINE.md`)

- Every committed image must end on `/credits` through `static/data/image-provenance.json` (AGENTS.md "NON-NEGOTIABLE — every committed image…"). Star photos carry rows `star-<id>-01` keyed on `/images/stars/<id>/01.webp` (rows at `image-provenance.json:62522–62696`).
- Agency first, Commons last. ESO public images are the named Tier-2 source `eso-public` (CC BY 4.0, `IMAGE-PIPELINE.md` Tier 2 table). The EHT 2022 image is ESO release `eso2208-eht-mwa` ("First Image of Sagittarius A\*", 4076×4076, credit "EHT Collaboration", read at `eso.org/public/images/eso2208-eht-mwa/` while writing this brief; the licence line CC BY 4.0 is the plan's statement, ESO's standard, not read on that page).
- Display images are WebP derived from `masters/` (LFS) by `scripts/vision/build-display-ladder.mjs`; never hand-place a `.jpg` under `static/images/` and never run `build-image-provenance.ts` or `compute-phash.ts` whole-file on an un-pulled tree (AGENTS.md "Never run a whole-file regenerator…"). Add rows surgically (`image-provenance.json` keyed by the `.webp` path, `image-ladder.json` merged, `image-phashes.json`). Runbook: "Adding a new gallery image" `IMAGE-PIPELINE.md:160–206`. Dedup guards: `validate-image-dupes.ts`, `validate-image-phash-dupes.ts`. Alt text: `static/data/image-alt-text` and `scripts/i18n-tools/maps/alt-text-sources.json` (star photos have entries `:3455–3464`).
- New staged fetches land in `static/images/_staging/` and ship through `/dev/staging` promote (AGENTS.md "Staging ground").
- Existing tools to use, not new scripts: `fetch-assets.ts` (stage), `image-find-source.mjs`, `image-match.mjs`, `move-image-to-gallery.ts`, `replace-gallery-slots.ts`, `vision/hero-crop-sheet.mjs` (focal point). Memory rule "Reuse image tooling": no duplicate scratch scripts.

## 3. Findings that shape the proposal

1. **The star "gallery tab" has no content today.** 0 of 62 stars have a second image; a tab that appears only with more than one image (UXD-008 item 3) ships hidden. The planet rule shows the tab when there is at least one image, which for a star would repeat the hero (Q4).
2. **The eight outer panels are one component copy-pasted**, in rem units outside the A1 scale (§1). The fix for MW3's "look different" is one shared body, not eight edits.
3. **The deep-sky photos are the only hero supply for outer levels, and they cover few entities**: 4 of 19 Milky Way pins, 3 of 33 Local Group galaxies, 0 of 8 Laniakea (§2.3). MW5 gives heroes to roughly one panel in ten at the outer levels. Seven of the ten usable entries are part-of images (Tarantula for the LMC) that need an honest caption (Q3).
4. **MW3's second half is a behaviour change in the scene host, not a panel change.** `selectMilkyWay` redirects the Sag A\* pin to `enterBlackHole` (`explore-scene-host.ts:2413–2416`); `enterBlackHole` replaces the view, closes the star panel and sets `bridge.activeBlackHole` and `bridge.bhPanelOpen` together (`:568–569`). The back target (`scaleNavBackTarget(contextId, !!activeBlackHole, …)`, `explore/+page.svelte:841`), the `?bh=` sync (`explore-url-sync.svelte.ts:251–270`), the curvature/time lenses (`+page.svelte:799–800`) and the index rail entries (`:192`) all read `activeBlackHole`. Splitting "panel open" from "lensing takeover active" touches all of them. `MilkyWayPanel` has a Sag A\* branch (`:24–25,38–39`, `explore_mw_sag_a_blurb`) that the pin redirect makes unreachable by clicking.
5. **Only Milky Way pins have a deep link for panels** (`?galaxy=<id>`, `explore-url-sync.svelte.ts:226–248`). Local Group, Local Sheet, Virgo, Laniakea and Cosmic Web members open by canvas pick only (`pickLocalGroup`…`pickCosmicWeb`, `explore-scene-host.ts:2430–2558`); the only `window.__explore*` hook for these is `__exploreSelectLocalGroup` (`:1698`) and the hooks are DEV-only (`explore-milky-way.spec.ts:7–9`). E2E for those panels needs a selection route (Q8).
6. **Constellation names are English-only** (`iau-constellations.ts:1–3`: "English names; localized display can overlay later"); a "named and linked" constellation in the tab is English in all 14 locales unless names are localised (Q5).
7. **A "zodiac" relation exists nowhere in the data.** `git grep -i zodiac` hits only UXD-008, one exoplanet bio and a comment in `fly-helio-scene.ts:509`. The operator's wording ("link stars to zodiac signs") needs either the 12 (13 with Ophiuchus) zodiac constellation codes as a list in `iau-constellations.ts` or no zodiac wording (Q5).
8. **No test guards the star or outer panel layout**; `StarPanel.assets.test.ts` guards only that the photo `src` goes through `assetUrl` (it reads the source text with a regex on `{assetUrl(star.photo.src)}`, so moving the `<img>` into `PanelHeroImage` breaks that test as written: it is rewritten, not deleted, §8).
9. **Hero crop of star photos changes** when they go from natural ratio to the planet's 16:9 cover (Sirius 2401×3001 loses most of its height). That is a visible hero change and the standing rule applies (Q2).

## 4. Proposal

### 4.1 One shared body: `src/lib/components/UniversePanelBody.svelte`

Not a new look: the planet panel's skeleton as one component, so star and outer panels match it. It does not replace `Panel.svelte` (B1 owns the shell) and it does not touch `PlanetPanel`.
Props: `kind` (label string), `name`, optional `stats` (the planet `.stat-row`), `hero?: {src, alt, caption?, credit?: boolean, onOpen?}`, `gallery?: string[]`, `tabs?` (extra tabs as `{id, label}` plus snippets), `lead` (string, rendered as `.editorial`), `facts: {label, value, accent?}[]`, and snippets `actions`, `science` (B2's slot), `extra`.
Behaviour:
- Head = mono `.type`, Bebas `.name`, same CSS as `PlanetPanel.svelte:392–416`, written once in this component (tokens only).
- Hero = `PanelHeroImage` + `PanelLightbox` when `hero` exists; **no hero ⇒ no slot** (no empty frame). Caption line (`.hero-caption`, existing mono 11 px label look) names the pictured object when it is not the entity ("30 Doradus, in the Large Magellanic Cloud"), plus `ImageCredit` for the hero path.
- Tabs = `PanelTabRow` with `idPrefix`, OVERVIEW always, GALLERY **second and only when `gallery.length >= 2`** (grid = all images except the hero), extra tabs after; the row is not drawn when only OVERVIEW exists (one tab is not navigation).
- Overview = `lead` as `.editorial`, `facts` as the planet `.cell` grid, then the `science` snippet, then `actions` (or B1's row when it exists).
All eight outer panels shrink to data mapping (kind, name, lead, facts). Their private `.head/.kind/.name/.prose/.grid/.cell/.learn-link` rules and all 37 `rem` sizes are deleted.

### 4.2 StarPanel

- Head as now (swatch + spectral/constellation kind line, name); the swatch stays (star identity, `a3-keep` colours untouched).
- **One hero** (UXD-008 item 1): `star.photo` when present, else `StarPortrait` (kept as the fallback hero; its caption `star_portrait_caption` stays as its `.hero-caption`). The photo and the portrait never show together. The photo's `real/artist` label (`star_photo_real/artist`) moves into the hero caption.
- Tabs via `PanelTabRow idPrefix="star"`: OVERVIEW · **IN THE SKY** (when `star.con` has a figure; 62 of 62 stars do, §2.3) · SYSTEM (when `hasSystem`) · TECHNICAL · GALLERY second-position only with ≥ 2 images (hidden for all 62 stars at ship, Q4).
- **IN THE SKY tab:** `ConstellationFinder` (moved from above the tabs, its caption `star_finder_caption` kept), the constellation named, and an action "Show constellation lines" that turns the existing Constellations layer on (`setConstellations`, `explore/+page.svelte:1006–1008`; no per-constellation highlight in B3). A "Zodiac constellation" line when `star.con` is one of the 13 codes (Q5). The constellation cell stays in TECHNICAL.
- `Enter system →` moves out of the head into the action slot (B1's row). Overview content unchanged (`fact` as `.editorial`, `bio`/`cultural` as body 14 px).
- Gallery data (only when Q4 says yes): language-neutral sidecar `static/data/universe/star-gallery.json` `{ "<id>": [{src, kind}, …] }`, loader `getNamedStarGallery(id)` in `src/lib/data/universe.ts`; the hero stays the overlay's `photo` so none of the 140 overlay files (10 stars × 14 locales) changes.

### 4.3 Outer-level panels

- Kind, name, lead, facts through `UniversePanelBody`; `.prose` lead → `.editorial`; facts in the planet `.cell` look.
- **Heroes (MW5):** one loader `getUniverseHero(kind, id)` in `src/lib/data/universe.ts` returning `{src, alt, caption, credit path}` or null, from a small hand-curated map `static/data/universe/panel-heroes.json` keyed `<level>/<id>` → `{ photoKey | src, pictured?: "30 Doradus" }` (schema `static/data/schemas/` + `validate-data`, so every key must resolve to an existing gallery key or file and every file to a provenance row). Entries at ship: the 10 entries of §2.3 (8 distinct photos; lmc and smc appear at two levels) (omega-centauri, sun, lmc, smc at the Milky Way; andromeda, lmc, smc at the Local Group; ic-342-group, m101-group at the Local Sheet; perseus-pisces at the Cosmic web) plus the black holes below. A deep-sky `photoKey` entry uses the existing gallery record (`getDeepSkyGallery`) for caption, telescope and credit in the locale already loaded; no image is copied.
- Image URL for a `photoKey` is `${assetOrigin}/images/deep-sky/<key>.jpg` (the hero uses the full `.jpg`, or `.thumb.jpg` below 400 px CSS width: the panel is 400 px, `image-sizes.ts:13`). They are not on the WebP ladder; B3 either generates the ladder for the 8 used originals through `build-display-ladder.mjs` (needs the masters, LFS) or serves `.thumb.jpg` (700 px, enough for a 400 px panel at 1x, soft at 2x). Q2/NV decide.
- `DeepSkyPanel` gets the same shared body; its hero is the photo it already has (`image`/`photoKey`), shown in the panel too so the panel matches the others (the immersive main area stays).
- `LaniakeaPanel`, `VirgoPanel`: no hero (none exist); same head, lead, facts.

### 4.4 Black holes and Sag A\* (MW3)

- `BlackHolePanel` on the shared body with the hero: Sag A\* = EHT 2022 (new), M87\* = EHT 2019 (the existing science file, referenced, not copied: "one image library per place", AGENTS.md gallery-counts paragraph), Cygnus X-1 and Gargantua = no hero.
- **New image:** fetch `eso2208-eht-mwa` through the existing tools into staging (ESO Tier 2 `eso-public`), derive the WebP ladder from a master, serve at `/images/black-holes/sagittarius-a-star/01.webp` (the stars lane is the precedent: `/images/stars/<id>/01.webp`, rows `star-<id>-01`), add the provenance row surgically (id `bh-sagittarius-a-star-01`, author "EHT Collaboration", agency "ESO", CC-BY-4.0, source URL), the `image-ladder.json` and `image-phashes.json` rows, alt text, and `/credits` shows it. The fetch is free (no paid run). It is a repo change to shared data files; it is listed in §8 and waits for the operator's Q1 yes.
- **Behaviour (if Q1 says yes):** selecting a hole opens the panel in place; the main area does not change. The panel's action "See the lensing simulation" (new key `explore_bh_see_lensing`, 14 locales) enters the existing takeover; `?bh=<id>` keeps entering the takeover directly so existing links and `explore-scale-picker.spec.ts:79` keep working, and the takeover keeps its panel. Implementation: `selectMilkyWay` stops redirecting (`:2413–2416`), a `bridge.bhPanelOpen` without `activeBlackHole` state, the index rail entries open the panel, the dead Sag A\* branch in `MilkyWayPanel` becomes the live one or goes (Q1).

## 5. Replacement map

| Old | New | Notes |
|---|---|---|
| `StarPanel` `.tabs` buttons `id="star-tab-*"`, `aria-controls="star-tabpanel"` (`:187–217`) | `PanelTabRow idPrefix="star"` → ids `star-tab-<id>`, panel `star-tabpanel` | same ids, same prefix: e2e that reads `star-tabpanel` keeps working |
| `StarPanel` `.panel-hero.star-hero` ×2, `.star-finder` above tabs (`:156–185`) | one `PanelHeroImage` (photo) or `StarPortrait` as hero; finder inside the IN THE SKY tab | |
| `StarPanel .real-photo` natural-ratio `<img>` (`:158–163`, `:473–478`) | `PanelHeroImage` 16:9 cover + focal point | Q2 |
| `.enter-system` (`:150–154`, allow-list `chip.spec.ts:388`) | B1 action row / `Chip kind="action"` | allow-list entry removed in the same commit |
| `MilkyWayPanel/LocalGroupPanel/LocalSheetPanel/VirgoPanel/LaniakeaPanel/CosmicWebPanel/BlackHolePanel/DeepSkyPanel` private head/body CSS | `UniversePanelBody` | 66 private rules, 37 rem sizes |
| `.prose` lead (0.85 rem) | `.editorial` (`--size-lead`) | A1 gap |
| `selectMilkyWay` → `enterBlackHole('sagittarius-a-star')` (`explore-scene-host.ts:2413–2416`) | open the panel; takeover only from the panel action | Q1 |
| `StarPanel.assets.test.ts` regexes on `{assetUrl(star.photo.src)}` | assert the hero `src` goes through `assetUrl` in `UniversePanelBody`/`PanelHeroImage` props | rewrite |

## 6. Hit list and the check

Baseline at `34019040ba8`: **132 violations** (66 `OUTER-PRIVATE-RULE`, 37 `OUTER-REM-TYPE`, 9 `NO-SHARED-BODY`, 3 `STAR-HERO-STACK`, and one each of the other 19 kinds). The first run is saved in the scratchpad as `b3-baseline.txt`; this brief does not add a baseline file to the repo. Kept here and in the scratchpad, not added to the repo. Allow marker: `b3-keep: <why>` on the hit line.

```bash
#!/usr/bin/env bash
# B3-CHECK — run from anywhere inside the repo. Prints each violation as "KIND file:line text", then
# "B3-CHECK violations: N". Allow marker: `b3-keep: <why>` on the same line (CSS/markup) as a hit.
set -u
cd "$(git rev-parse --show-toplevel)"
C=src/lib/components
OUTER="$C/MilkyWayPanel.svelte $C/LocalGroupPanel.svelte $C/LocalSheetPanel.svelte $C/VirgoPanel.svelte $C/LaniakeaPanel.svelte $C/CosmicWebPanel.svelte $C/BlackHolePanel.svelte $C/DeepSkyPanel.svelte"
STAR=$C/StarPanel.svelte
N=0
hit() { printf '%-18s %s\n' "$1" "$2"; N=$((N + 1)); }
grep_hits() { # kind, ERE, files...
  local kind=$1 re=$2; shift 2
  local line
  while IFS= read -r line; do
    case "$line" in *b3-keep*) continue ;; esac
    hit "$kind" "$(printf '%s' "$line" | cut -c1-110)"
  done < <(git grep -n -E "$re" -- "$@" 2>/dev/null)
}

# 1. Star panel keeps a private tab strip and private hero stack (planet pattern = PanelTabRow + one PanelHeroImage)
grep_hits STAR-PRIVATE-TABS 'class="tabs"|role="tablist"' $STAR
grep_hits STAR-HERO-STACK 'class="panel-hero star-hero"|class="star-finder"' $STAR
git grep -q 'PanelTabRow' -- $STAR || hit STAR-NO-TABROW "$STAR:1 PanelTabRow is not used"
git grep -q 'PanelHeroImage' -- $STAR || hit STAR-NO-HERO "$STAR:1 PanelHeroImage is not used"
# the finder must come after the tab row (inside the In the sky tab), never above it
fl=$(grep -n '<ConstellationFinder' $STAR | head -1 | cut -d: -f1)
tl=$(grep -n "tab === 'sky'" $STAR | head -1 | cut -d: -f1)
{ [ -n "$fl" ] && [ -n "$tl" ] && [ "$fl" -gt "$tl" ]; } || hit FINDER-NOT-IN-TAB "$STAR:${fl:-0} ConstellationFinder is not inside the sky tab"

# 2. Outer panels: private rem type and private head/body rules instead of the shared body
grep_hits OUTER-REM-TYPE 'font-size:[[:space:]]*[0-9.]+rem' $OUTER
grep_hits OUTER-PRIVATE-RULE '^[[:space:]]*\.(head|kind|name|prose|grid|cell|cell-label|cell-value|learn-link)[[:space:]]*\{' $OUTER
for f in $STAR $OUTER; do
  git grep -q 'UniversePanelBody' -- "$f" || hit NO-SHARED-BODY "$f:1 does not use UniversePanelBody"
done

# 3. Sagittarius A*: selecting the pin takes over the main area instead of opening the panel (MW3)
grep_hits BH-TAKEOVER-ON-PIN "enterBlackHole\('sagittarius-a-star'\)" src/lib/three/explore-scene-host.ts
git grep -q 'explore_bh_see_lensing' -- messages/en-US.json || hit NO-LENSING-ACTION "messages/en-US.json:1 explore_bh_see_lensing is missing"

# 4. Data and provenance
git grep -q '/images/black-holes/sagittarius-a-star/01.webp' -- static/data/image-provenance.json || hit NO-EHT-PROVENANCE "static/data/image-provenance.json:1 no row for the EHT 2022 image"
[ -f static/images/black-holes/sagittarius-a-star/01.webp ] || hit NO-EHT-FILE "static/images/black-holes/sagittarius-a-star/01.webp missing"
git grep -q 'getUniverseHero' -- src/lib/data || hit NO-HERO-LOADER "src/lib/data:1 getUniverseHero is missing"
git grep -q 'getNamedStarGallery' -- src/lib/data || hit NO-STAR-GALLERY-LOADER "src/lib/data:1 getNamedStarGallery is missing"

# 5. Locale keys for the new tab
git grep -q '"panel_tab_sky"' -- messages/en-US.json || hit NO-SKY-TAB-KEY "messages/en-US.json:1 panel_tab_sky is missing"

# 6. Tests
[ -f tests/e2e/universe-panels.spec.ts ] || hit NO-E2E "tests/e2e/universe-panels.spec.ts missing"
[ -f src/lib/components/UniversePanelBody.test.ts ] || hit NO-UNIT "src/lib/components/UniversePanelBody.test.ts missing"
git grep -q "panel-milky-way" -- tests/e2e/type-floor.spec.ts || hit TYPE-FLOOR-GAP "tests/e2e/type-floor.spec.ts:1 no outer-level panel in PANEL_LINKS"

# 7. Docs say the rule
git grep -q 'In the sky' -- docs/uxs/UXS-001.md || hit DOC-UXS-001 "docs/uxs/UXS-001.md:1 no star-panel tab contract"
git grep -q 'UniversePanelBody' -- src/lib/components/README.md || hit DOC-README "src/lib/components/README.md:1 UniversePanelBody not listed"
git grep -q -E '^\| B3 .*\| (done|landed)' -- docs/uxs/CHANGE-INVENTORY.md || hit DOC-INVENTORY "docs/uxs/CHANGE-INVENTORY.md:35 B3 row not done"

echo "B3-CHECK violations: $N"
```

Known limits of the check: it tests file and string presence, not rendering. `NO-GALLERY-TAB` is deliberately not a check kind: with Q4 = defer no star has a Gallery tab, and a check that demanded one would force a content change. If Q4 = "add second images" add `git grep -c` on `star-gallery.json` entries. `OUTER-PRIVATE-RULE` counts rule openers by name, so a renamed class escapes; the Playwright computed-style spec (§8) is the second net. If Q1 = no (Sag A\* behaviour stays), delete the `BH-TAKEOVER-ON-PIN`, `NO-LENSING-ACTION` and `NO-EHT-*` checks and record why in the UXD.

## 7. Allow-list (not touched, with reason)

- `PlanetPanel`, `SunPanel`, `SmallBodyPanel`, `SatellitePanel`, `BeltPanel`, `MissionPanel` own CSS and heroes: the standing rule on planet and explore heroes; migration to the shared body is a follow-up with a side-by-side.
- `ExoplanetPanel`, `MessagePanel`, `RegimePanel`, `StationModulePanel`: other families, not in SN2/MW3/MW5.
- `StarPortrait.svelte`, `ConstellationFinder.svelte` drawing code: unchanged (canvas, `a3-keep` data colours, L4).
- `StarPanel.svelte:123` `a3-keep` colour and the SYSTEM tab SVG: unchanged.
- `PanelTabRow` and its `[role="tab"]` buttons: A4 allow-list.
- `DeepSkyImmersion`, the lensing scene (`black-hole-scene.ts`), `MilkyWayPanel`'s science lens: unchanged.
- `StarIndex`, `ExploreBodyIndex`: A5.

## 8. Tests, docs, locales

**Tests**
- New `src/lib/components/UniversePanelBody.test.ts` (`svelte/server` `render`, the `Chip.test.ts` pattern): no hero ⇒ no `.panel-hero`; one tab ⇒ no tab row; GALLERY is the 2nd tab and only with ≥ 2 images; `.editorial` on the lead; caption names the pictured object when `hero.pictured` is set.
- New `tests/e2e/universe-panels.spec.ts` on the three Playwright projects: `?goto=antares` (one hero, no finder above the tab row, IN THE SKY tab shows the finder, OVERVIEW visible without scrolling at 1440×900 and 390×844), `?goto=vega`, `?galaxy=omega-centauri` (hero present), `?galaxy=perseus` (no hero, no empty frame), `?deepsky=…` (hero), `?bh=sagittarius-a-star` (per Q1). Local Group / Local Sheet / Virgo / Laniakea / Cosmic web member panels: Q8.
- `tests/e2e/type-floor.spec.ts:202–213`: add `panel-milky-way` (`/explore?galaxy=omega-centauri`), `panel-black-hole` (`/explore?bh=sagittarius-a-star`), `panel-deep-sky` (`/explore?deepsky=m42` — object id read from `deep-sky-objects.json`, `m42`). Keep `panel-star`.
- Rewrite `StarPanel.assets.test.ts` (§5). Update `explore-scale-picker.spec.ts:79` only if Q1 changes what `?bh=` shows (it should not).
- `chip.spec.ts` sweep: remove `.enter-system` (`:388`) when the button goes; add nothing for `.gateway-btn` (it becomes `Chip kind="action"` or the B1 row).
- Data: the `panel-heroes.json` schema + `validate-data` gate (every key resolves, every image has a provenance row); `validate-gallery-credits`, `validate-image-dupes`, `validate-image-phash-dupes` for the EHT file.
- Re-run on all three projects: `explore-deeplinks`, `explore-milky-way`, `explore-laniakea`, `explore-virgo`, `explore-local-sheet`, `explore-cosmic-web`, `explore-scale-picker`, `explore-science-lens-shells`, `panel-lightbox`, `panel-gallery-viewer`, `type-floor`, `chip`, `a11y`, and the `visual.spec.ts` baselines that contain an Explore panel (regenerated in Docker, never from the dev machine).

**Docs (state the rule; link UXD-008, a new UXD for MW3/MW5 if Q1/Q3 are answered)**
- `docs/uxs/UXS-001.md` "Detail panel tabs" (`:58–69`) and the GALLERY extension (`:109–119`): star and outer-panel contract (one hero, GALLERY second when present, IN THE SKY for stars, no hero ⇒ no slot).
- `docs/uxs/UXS-014.md` §Selecting and understanding an object (`:25`) and `UXS-016.md:40` ("the LocalGroupPanel family"): the family is `UniversePanelBody`.
- `AGENTS.md:104` (panel tabs + galleries row) add IN THE SKY; design rules section if it lists panel anatomy.
- `docs/adr/TA.md` (panel family, §Pipeline for star images and the new `black-holes` image lane, `panel-heroes.json`), `docs/uxs/CHANGE-INVENTORY.md:35` (row B3 → done with the commit ids), `src/lib/components/README.md:6` (list `UniversePanelBody`), `src/lib/universe/README.md` (hero loader), `docs/uxs/decisions/UXD-008…` untouched (an accepted record is not rewritten); the new decision goes in a new UXD, `docs/uxs/UXS-000…` §Next link (L10).
- `static/data/image-provenance.json` row, `/credits` and `/colophon` counts (image totals change by 1).

**Locales (14, glossary and standard tools)**
New keys: `panel_tab_sky` ("IN THE SKY"), `star_show_constellations`, `star_zodiac_note` (if Q5 yes), `explore_bh_see_lensing`, `panel_hero_caption_part_of` ("{part}, in {whole}"). No removed key: `star_finder_caption`, `star_photo_*`, `star_portrait_caption` are kept. Hero captions for deep-sky photos come from `deep-sky.json` + `i18n/<locale>/deep-sky.json` (titles/captions already localised there; names, telescopes and credits shared). Constellation names stay English (finding 6, Q5). Per-locale check required for the `ar` (RTL tab row) and `de` (long words in a 400 px tab row: OVERVIEW · IN THE SKY · TECHNICAL is the widest case) layouts. `validate-data` green. Numbers in captions (distances) are not new text.

## 9. Screenshots for the operator (dev server per AGENTS "Iterating on UI", not Docker; before = HEAD, after = the slice; desktop 1440×900 and phone 390×844)

The "done when" set: 1. a star with a photo (`/explore?goto=antares`, before/after, Overview visible without scrolling), 2. Milky Way panel with a hero (`?galaxy=omega-centauri`) and one without (`?galaxy=perseus`), 3. Local Group panel (Andromeda, hero) via `__exploreSelectLocalGroup('andromeda')`, 4. Laniakea panel (no hero, the shared look) — selection by canvas click (NV3), 5. Sag A\* panel with the EHT hero and the "See the lensing simulation" action (after Q1).
**Owed by the standing hero rule:** a side-by-side of all 10 photographed star heroes, old natural-ratio vs 16:9 cover (and the portrait fallback for a star without a photo), before the hero box changes. Also: the IN THE SKY tab, the Gallery tab (needs a star with 2 images, only after Q4 = yes), a `de` and an `ar` shot of the star tab row, a part-of hero caption (LMC).

## 10. Decisions and open questions (operator), recommendation first

- **Q1 (MW3, needs the recorded go).** Sag A\* (and the other holes): panel opens in place with the EHT hero; the Milky Way view stays; "See the lensing simulation" enters the takeover; `?bh=` still enters the takeover directly. **Recommendation: yes, for all four holes**, so a hole behaves the same wherever it is selected; M87\* uses the EHT 2019 image already in the repo, Cygnus X-1 and Gargantua have no hero. Alternative: Sag A\* only. Cost: scene-host and URL-sync changes (finding 4), one image fetch with provenance.
- **Q2 (hero box).** Stars move from natural-ratio photos to the planet's 16:9 cover box. **Recommendation: same 16:9 box as planets** (consistency above all), add `stars`, `black-holes` and `deep-sky` as hero-override surfaces so a reviewed focal point is stored per image (`image-hero.ts:52–64`, `hero-crop-sheet.mjs`), and review the 10 star crops side by side before it lands. Alternative: natural ratio capped at 280 px height for the star panel only (no consistency, no crop).
- **Q3 (MW5, part-of images).** May a part-of photo be the hero of its parent (Tarantula for the LMC, NGC 346 for the SMC, IC 342 and M101 for their groups, the Perseus Cluster for Perseus-Pisces) when the caption names what is pictured? **Recommendation: yes, caption mandatory**; 7 of the 10 entries are such cases and without them the Local Sheet and Cosmic web get no hero. Alternative: exact matches only (3 panels at the outer levels: omega Centauri, the Sun, Andromeda).
- **Q4 (Gallery tab).** No star has a second image. **Recommendation: build the mechanism and the sidecar, ship with no visible Gallery tab, put second images for the 10 photographed stars on the deferred list as L29** (content work through the image tools, with provenance, free). Alternative: source second images for the 10 stars inside B3 (about 10–20 images, each through the runbook).
- **Q5 (constellation link and zodiac).** "Named and linked" has no existing target page. **Recommendation:** the tab shows the constellation name, a "Zodiac constellation" line from a 13-code list added to `iau-constellations.ts`, and a button that turns on the existing Constellations layer. English names stay (existing limitation); localising 88 names × 13 locales is a separate glossary job, not B3. Alternative: no zodiac wording, name only.
- **Q6 (finder for deep-sky).** Deep-sky objects have a constellation code and a sky direction; the finder would work for them too. **Recommendation: not in B3** (the points name stars only); L30 on the deferred list.
- **Q7 (sequence).** **Recommendation: B1, then B3**, so the actions land in B1's row and the hover rule is already gone.
- **Q8 (testing the deep levels).** Members of the Local Group … Cosmic web have no URL. **Recommendation: no new URLs in B3**; component tests cover those panels, the e2e covers Milky Way, star, hole and deep-sky by URL, and the Local Group and Laniakea shots are taken on the dev server with the dev hooks and a canvas click. Alternative: generalise `?galaxy=` to every level (a C-slice change, new URL contract).
- Not asked, decided here: the shared body is a new component, the planet family is not migrated.

## 11. Acceptance (definition of done, per the plan)

1. `bash b3-check.sh` (from this brief) prints `B3-CHECK violations: 0` (or only the kinds removed by an operator "no" on Q1).
2. Docs in §8 state the rule; `CHANGE-INVENTORY` row B3 done; new UXD recorded for MW3/MW5 once Q1/Q3 are answered.
3. `UniversePanelBody.test.ts`, `universe-panels.spec.ts`, `type-floor.spec.ts` and the re-run list green on desktop-chromium, mobile-chromium, mobile-landscape-chromium; changed visual baselines regenerated in Docker and reviewed; nothing skipped.
4. Every star and outer-level panel: one hero at most, no hero ⇒ no slot, tabs on `PanelTabRow`, lead on `.editorial`, no `rem` font sizes, the finder only in IN THE SKY; the star Overview text is on screen without scrolling at 1440×900 and 1366×768.
5. The EHT file has a master, a ladder, a provenance row, a phash row, alt text and shows on `/credits`; `validate-data` and the image guards green.
6. Locales: new keys in 14, `de` and `ar` tab-row shots; `validate-data` green.
7. The operator receives the §9 sheets (including the 10-star hero side-by-side) and answers Q1–Q5.

## 12. NOT VERIFIED (what this brief did not check)

- NV1 Nothing here was rendered. Heights, the 16:9 crop outcome for each of the 10 star photos, whether the star Overview fits above the fold after the change, and the tab-row width in `de`/`ar` are reasoned from CSS, not measured.
- NV2 The match table (§2.3) is by normalised id/name/designation plus a hand-read `REP` list; I looked at no photo to confirm it shows the object I mapped (for instance `jwst-ngc346` as the SMC, `euclid-perseus` as the Perseus-Pisces core). Objects with no catalogue id match were not searched by sky position.
- NV3 How to select a Laniakea, Virgo, Local Sheet or Cosmic web member in a browser for the shots: only the `pick*` functions (`explore-scene-host.ts:2430–2558`) were read, not run; the screenshot route for Laniakea is a canvas click at an unknown position.
- NV4 Whether `responsive()` and the service worker handle a `.jpg` without a ladder entry for a panel hero (read `responsive-image.svelte.ts:3–9`, not run), and whether the 8 deep-sky originals have masters in LFS (not pulled; `masters/` is `fetchexclude`d).
- NV5 The ESO release page was read for id, size and credit only; the CC BY 4.0 licence line, the exact credit string in the Commons mirror (plan says "ESO/EHT Collaboration", ESO says "EHT Collaboration") and a master file download were not checked. No file was fetched.
- NV6 `explore-scale-picker.spec.ts:79` and the BH back-target logic were read, not run; splitting `bhPanelOpen` from `activeBlackHole` was not prototyped, so the true size of the scene-host change (finding 4) is a reading of call sites, not an estimate from a spike.
- NV7 Whether `MilkyWayPanel`'s Sag A\* branch is truly unreachable (a `?galaxy=sagittarius-a-star` cold load goes through `selectMilkyWay` and so redirects; no other caller was searched beyond `git grep selectedMwId`).
- NV8 B1's brief did not exist at writing; the ownership split in §1 is from the plan rows, the Q3/Q6 note and the current code, not from B1's text. A5's brief was read for its star-index statement only.
- NV9 `b3-check.sh` ran once (132) and has no tests of its own; the 37 `rem` and 66 private-rule counts come from that run and were not read line by line. The `tl`/`fl` finder-order test assumes the tab marker is written `tab === 'sky'`.
- NV10 The count of constellation codes in the zodiac set (13) and that all 62 stars' `con` code has a figure in `constellation-lines.json` (62 of 62 by the script) were not checked against the IAU list or by drawing each figure.
- NV11 Locale impact of `panel_tab_sky` and the part-of caption template in the 13 translated locales was not drafted.
