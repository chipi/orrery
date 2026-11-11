# UX feedback — the operator's list (2026-11-11), numbered, with a proposed order

Every point from the operator's list, one row each, in the operator's words (typos fixed). IDs are
for tracking; tick with the commit id. Order and phases are a proposal for the operator to confirm.
The teal accent redesign is part of this list (operator: merge it in).

## Proposed phases

| Phase | What | Why this order |
|---|---|---|
| 0 | Foundation: text-style inventory and alignment, link colour, panel text, labels, one chip/filter component, nav compactness, teal → muted blue | everything else builds on these; done once, used everywhere |
| 1 | Shared panel behaviour: hero hover, close button, share link, buttons higher, science links 1–5 with variety | one component change reaches every panel |
| 2 | Explore (all levels), orbit ruler, index, iconic missions | the biggest surface; depends on 0 and 1 |
| 3 | Worlds (Moon, Mars, Earth, Venus) | shares orbit ruler and panels with Explore |
| 4 | Catalog: programs, missions, fleet, ISS | filters from phase 0 |
| 5 | Random pages (gallery, credits, colophon, library) and home | text styles from phase 0 |
| 6 | Plan, Fly, Launch (simulation and HUD) | separate code paths |
| 7 | Content and data: new missions, program reviews, hero images, Venus galleries, library additions | research; can run in parallel with 2–6 |
| 8 | GitHub README and docs, text and graphics | last, so screenshots show the finished UI |

Method for 0–6: `ux-baseline-review` flow — mock-up or before/after shots first, operator approves
per screen, then the change, then e2e on all three Playwright projects.

## Decisions the operator owns (asked once, before the phase that needs them)

- D1 Full redesign now, or this consistency pass first (proposal: consistency pass; it is the base a redesign needs).
- D2 Home: video instead of the hero graphic? A Higgsfield test video is a paid run — size and cost estimate first.
- D3 TV home and TV app: scope.
- D4 Explore: drop the second-level nav under Explore and use the breadcrumb as the way through the levels (keep separate pages in the sitemap)?
- D5 Explore: zooming into Earth / Mars / Moon / Venus switches to the world page, or an explicit "open world view" link?
- D6 Launch camera: the operator shares example shots first.
- D7 Missions/era filter designed with Higgsfield (paid) or in code.

## GitHub

| ID | Point |
|---|---|
| GH1 | Refresh README and all docs, with text and graphics. |

## Cross-cutting — text

| ID | Point |
|---|---|
| X1 | Some text is too tiny; many panels start with a smaller italic font for no reason. Inventory all text styles and align them across the site: identify key content surfaces, same font, same/similar sizes, smaller/bigger and italic only when needed. Not a full design-system redesign; consistency that helps later tightening. |
| X2 | Credits, colophon, library and other pages: links are a turquoise colour. Use the muted blue used in many places; nothing close to glowing. (Includes the site-wide teal accent redesign.) |

## Panels

| ID | Point |
|---|---|
| P1 | All overview texts are too tiny and italic; they should not be italic or smaller than other texts. |
| P2 | Labels are too small and barely readable. |
| P3 | Hovering the hero image should not make a blue glow; the pointer change is enough. |
| P4 | When scrolling, the panel's close X in the corner goes over the content: let it scroll away or find another way. |
| P5 | "Collector card" link becomes "Share", placed higher, not all the way down. |

## Science links

| ID | Point |
|---|---|
| S1 | Same science links repeat across panels of the same type. Assess; we need variation: pick the most appropriate science sections for each page. Need not be complete. |
| S2 | Sometimes too many: 1–5 is more than enough, varied per type. |

## Controls

| ID | Point |
|---|---|
| C1 | Chips are the only oval things and feel oversized. Rethink them across Explore, Worlds etc.: less vertical and horizontal space, good stacking. |
| C2 | Earth groups chips in 2 sections; the current solution is not good. |
| C3 | Unified filters, in UX terms, across all surfaces. |

## Nav bar

| ID | Point |
|---|---|
| N1 | The upper-right section of the nav bar is oversized compared to the normal nav; make it more compact. Idea: second-level nav goes horizontal under the main nav? |

## Random pages (all)

| ID | Point |
|---|---|
| RP1 | All pages share one style, vibe and standard approach. For fonts, Gallery is the best so far. |

### Gallery home
| ID | Point |
|---|---|
| G1 | Content starts further left, aligned with the page title, as on other pages. |

### Gallery entity page
| ID | Point |
|---|---|
| G2 | Italic opening text for no reason. |
| G3 | Filter pills look fine but are specific to this page; align with other filters: one style across all pages. |
| G4 | The footer font where sources are discussed is completely different from everything else. The muted blue used there is a better choice for coloured text than the turquoise elsewhere. |

### Gallery item page
| ID | Point |
|---|---|
| G5 | Italic opening text for no reason. |
| G6 | At the bottom, a muted line that starts with the object repeats on each page; looks like labels without real values, like a table whose value row is hidden. |

### Credits
| ID | Point |
|---|---|
| CR1 | Opening text is italic and tiny; make it like colophon or other pages. |
| CR2 | Page is really long (for a reason): collapse every per-source section by default? Colophon shows the first few and "show more" — decide one approach. |
| CR3 | Check: are all Moon, Mars and Earth images properly credited as used now? |

### Colophon
| ID | Point |
|---|---|
| CO1 | Missing a totals summary at the start like credits: how much content of each type. |
| CO2 | Page is really long (for a reason). |
| CO3 | Split "spacecraft cutaways" in two: cutaways and launcher sketches? |

### Library
| ID | Point |
|---|---|
| LI1 | Opening text is italic and tiny; make it like colophon or other pages. |
| LI2 | Add the JPL planetary models in their own section? |
| LI3 | Other things to add based on what we analysed and researched: Moon and Mars landings, rover routes etc. |

## Home page

| ID | Point |
|---|---|
| H1 | Opening image is too big; one must scroll to reach the basic intro. |
| H2 | Lab square is missing from the Learning section. |
| H3 | Home needs to be more engaging without scrolling. |
| H4 | TV home still needs to be in TV style, and what the TV app needs. (D3) |
| H5 | Is video instead of the welcome hero graphic the right approach? (D2) |
| H6 | Test making a video with Higgsfield in this visual language, bringing more of the website into it. (D2, paid) |
| H7 | Complete redesign now, after the fact? (D1) |

## Explore — overall

| ID | Point |
|---|---|
| E1 | A welcome message inviting the user to zoom in and explore. |
| E2 | Scene too dark, not enough contrast; hard to see details on a normal screen in daylight. |
| E3 | Deselecting all chips (only Sun and belts left) must also clear any active selection; e.g. a planet selected, then planets deselected → selection gone. Same for every chip. |
| E4 | The reference-distance ruler (lower right) must keep a fixed width at every zoom; the ruler value inside adjusts. |
| E5 | Clicking most smaller bodies and some planets only opens the panel; the object must also be selected. |
| E6 | Zooming into Earth, Mars, Moon, Venus switches to the world pages, or an option to switch into those detail pages — a link between the two sections. (D5) |
| E7 | Does the second-level nav under Explore need to exist? Beyond the solar system the breadcrumb copies it; maybe the breadcrumb on all Explore surfaces is the way to navigate them. Keep them as separate pages in the sitemap and main nav, without duplicated logic. (D4) |
| E8 | "Reset view" on the present level looks awful; align with how reset view looks elsewhere. |
| E9 | Next to the breadcrumb, explain the layers — like the lander image-layer explanation. Dedicated science articles explaining the layers, linked from here; maybe an article per layer, linked when looking at that layer. |
| E10 | Breadcrumbs are boring: instead of small circles reuse the home-page icons, more graphical; reuse the home-page text per layer on the pages to explain what we are looking at. |

## Explore — our solar system

| ID | Point |
|---|---|
| SS1 | Why is Vega in a rounded border when I open Explore? |
| SS2 | The solar-system picker on the right is cut off by the screen edge. |
| SS3 | Planet-scales popup is crowded, labels not aligned; find a better way. |
| SS4 | "Who lives here" from the belt orbital pane: some bodies don't get focus like the main planets do. Same pattern everywhere: always focus what we can; if nothing can be clicked, don't render a link. |

### Explore panels
| ID | Point |
|---|---|
| EP1 | Planet/body panels: the missions tab entries are not links to the missions; link them; sort like elsewhere (most recent first). |
| EP2 | Jupiter, Saturn, Uranus, Neptune heroes match the 3D render; achieve the same for every planet. Mars hero is blurry and not representative (not even red). |
| EP3 | Explore heroes: pure planets only — no artist concepts or mission images (e.g. "Magellan Orbit Artist Concept" on Venus, "American Apollo spacecraft as seen from Soviet Soyuz" on Earth). |
| EP4 | Bottom of overview: plan a mission, explore surface, collector card feel stuck at the bottom and big, one per row; bring some higher, at least on some tabs. |

## Orbit ruler (Explore and Worlds — global)

| ID | Point |
|---|---|
| O1 | Ruler too narrow: some rows (scattered) wrap to 2 lines; one row per item. |
| O2 | Hovering a ruler segment shows that region in the scene as rings, clear which part of the orbit it is; same on click (now only a panel opens, nothing in the 3D model). |
| O3 | Detail pane "who lives here": a small image of each body instead of dull grey circles. |
| O4 | Founding missions should be links to those missions (few are; most are not — check we have them). Remove the country code from the list. |
| O5 | With new missions added, review the mission list per orbit segment. |
| O6 | All orbit panes repeat the same science links (light minute, light year): variety, different per pane, best matches, no repetition. |
| O7 | Collapse / minimise the orbit ruler. |

## Index (Explore)

| ID | Point |
|---|---|
| I1 | Feels too basic when opened: add something next to the planet name; inspiration from the Moon index or other worlds. |
| I2 | Filters at the top, like the Moon index. |
| I3 | All planets are blue: colour per planet, best match, in the little circles. |
| I4 | Not every click focuses the body in Explore (only opens the panel); check both behaviours for each item. |

## Iconic missions

| ID | Point |
|---|---|
| IM1 | Top of the panel is too big before the list. "Hover any spacecraft to read why it's iconic" becomes the title; "Why are they all in one plane?" becomes a tooltip behind the (i). |
| IM2 | Key dates are blurry in the scene; boxes have empty space; 3 rows and some long labels cut off. |
| IM3 | Mission name repeated in every box — one separate mission box instead? |
| IM4 | Date and milestone number in the box header; the rest of the box for the milestone name. |
| IM5 | Clicking a milestone box opens that mission in the right panel (as other links do). |
| IM6 | New Horizons does not open the full mission panel like the others. |
| IM7 | Move the Iconic missions chip to the top, more space for the list below; maybe no scroll needed on desktop. |

## Stellar neighbourhood

| ID | Point |
|---|---|
| SN1 | Light-year circles are very unclear, hard to see. |
| SN2 | Detail panel broken: all images placed on top push the overview down. Follow the pattern: one hero image, a gallery tab for more images, and a dedicated pattern for linking stars to zodiac signs (Antares → the zodiac chart). |

## Milky Way (and levels beyond)

| ID | Point |
|---|---|
| MW1 | Labels overlap each other (same on other surfaces when zooming out further). |
| MW2 | Hovering a galaxy makes the label jump. |
| MW3 | Detail panels look different from all others; align the styling. An image loads in the panel, not the main area (Sagittarius A* / supermassive black hole). |
| MW4 | Some items (Sagittarius, Perseus arm) don't show they are clickable on hover; a click isn't marked clearly — use the Stellar-neighbourhood style (small circle around the point on hover/click). |
| MW5 | Deep-sky gallery images as hero images here? |
| MW6 | The circle around the Sun is too big, too obvious, doesn't scale with zoom; make it subtle as in Stellar neighbourhood. Same for the Milky Way on Local Group and all levels up. |

## Catalog — programs

| ID | Point |
|---|---|
| PG1 | The 3 filters at the top (era, kind, agency) are unique to this page; align with other similar ones. |

### Program page
| ID | Point |
|---|---|
| PG2 | Good overall. Sputnik's hardware section is empty: hide an empty section and its label. |
| PG3 | Related programs more visual: a rail of mini cards from the programs page instead of plain links, placed above "Go deeper in Orrery". |
| PG4 | Missions: reserve the right side so it doesn't jump between missions (Mercury: sub-heading text 1 vs 2 rows). |
| PG5 | Surface sites: a card rail with surface cards inspired by the landing-zone panels, reusing their hero, same style and size as the mini cards; after Missions, before Hardware. |
| PG6 | Hardware as smaller compact cards: rectangular, low height, mini hero on the left. |
| PG7 | Space Shuttle has only 3 missions and Ariane 2 — looks odd. Not all, but we miss missions we have in the project and could add specific ones; review all programs with 1–3 missions that don't match the story. |
| PG8 | Cassini has 4 "missions" that are segments of one: link and card the items that have no links; maybe rename to "milestones" where a program has milestones rather than missions. |
| PG9 | Cassini's hardware section is empty though we have the hardware; review every program's related hardware — link what we have, don't add new. |

## Catalog — missions

| ID | Point |
|---|---|
| MI1 | Filters look ugly, text too tiny and unreadable; align with filters elsewhere. The total is at the far end of the screen; put it after the label. |
| MI2 | Timescale/era filter needs to be much better; design one (Higgsfield? D7). |
| MI3 | Each mission has a colour code; bring it to the matching filters. |
| MI4 | "Fly this mission" goes up under the vehicle/payload buttons; don't hide the cool parts. |
| MI5 | Add missions: 2007 Kaguya / SELENE, 2019 Chandrayaan-2; review all programs for other good candidates. |

## Catalog — fleet

| ID | Point |
|---|---|
| FL1 | Same filter comments as missions. |
| FL2 | Line-up looks tiny and almost hidden; style it better. |
| FL3 | Crew Dragon: overview says 2 missions, the crew page shows 4; no people photos, only empty placeholders. Recompose the tab: name it "Missions", remove people photos, compact crew list, make clear which missions we have and can navigate into. |

## ISS

| ID | Point |
|---|---|
| ISS1 | "Watch live" is a plain text link: a first-class chip, or a better solution. |
| ISS2 | The assembly player changes height as content changes; fix its height. |

## Worlds (all)

| ID | Point |
|---|---|
| W1 | A welcome message inviting the user to zoom in and explore; maybe show a few locations at the start zoom to hint there is more. |
| W2 | "View from my location" is badly placed; it overlaps the orbit ruler. |
| W3 | Selecting an orbiting object and opening its panel: mark it selected and shift the scene left of the panel so the object shows; now objects are hidden when the panel opens. |
| W4 | "As seen from you" section overlaps the orbit ruler when shown. |
| W5 | Mars detailed locations have square brackets, Moon's don't; align. |
| W6 | "Stand here" must always show an image; sometimes graphics show and one must hunt for an image. |
| W7 | Earth groups chips in 2 groups (on Earth / in space); other worlds don't; make it consistent. |

### Moon / Mars
| ID | Point |
|---|---|
| WM1 | Lunar Prospector (orbiter): story panel and surface section show its cutaway. Stories exist only for landing sites; for orbiters on Worlds (Moon, Mars, Earth, Venus) show the cutaway differently — rename the tab "Details"? A solution for all orbiters. |
| WM2 | Are the Moon rover traverses aligned with the style we used (Mars)? |
| WM3 | Index blue/red colour coding: what is it? Reuse the footer's per-nation colours. |

### Venus
| ID | Point |
|---|---|
| VE1 | No gallery on any of the 3 sites, including no hero images. |

## Plan

| ID | Point |
|---|---|
| PL1 | Destination dropdown is too long with no organisation; restructure to find a destination easily. |
| PL2 | A plan opened in Fly does not carry the chosen launch; payload is empty (should have one). |
| PL3 | No launch sequence; add the option as for other missions. |

## Fly

| ID | Point |
|---|---|
| FY1 | Too dark in 2D; orbital rings barely visible. |
| FY2 | The first seconds after launch still move fast horizontally rather than vertically; adjust the numbers and the sim. |
| FY3 | Flight-plan markings on the play bar at the bottom (with play/pause). |
| FY4 | Tighten the HUDs: content wraps to the next row after its label; start in the label's row and wrap only the remainder. Tidy, aligned, no orphan labels. |

## Launch

| ID | Point |
|---|---|
| LA1 | Assess a camera on top during launch, moving around for better effects, rather than always the same side view. The operator has example shots to share. (D6) |

---

# Slice plan (deduplicated, 2026-11-11)

Built from three read-only code maps of every item (where it lives, what it does now, the cause).
The 119 points above reduce to the slices below. Each slice is small enough to check in one sitting:
before/after screenshots of the named screens (desktop 1440x900 + phone 390x844, landscape where it
matters), the named e2e specs on all three Playwright projects, and the operator's yes before the
next slice that builds on it. One slice = one or a few commits on `tech-debt/0.9.9`.

Already checked, no work: **CR3** — all 1,203 Moon/Mars/Earth surface tiles map to a credit entry
(539 hotspot provenance rows with author, licence, source); on-screen attribution in the scenes was
not audited.

## A. Foundations (needs Q1, Q2)

| Slice | Points | Change | Done when |
|---|---|---|---|
| A1 Type scale | X1, P1, P2 | 4–5 type tokens in `tokens.css`; the 11 panel `.editorial` rules (Crimson italic 13–14 px, 60 %) become upright body size; labels (`.stat-label`/`.cell-label` 6 px at 25 %, eyebrows 8 px) ≥ the floor at ~55 %; 7–8 px strings raised | no panel text under the floor (computed-style e2e on 6 panel types); shots of every panel type |
| A2 Page shell | RP1, CR1, LI1, G1, G2, G5 | one page-shell class (container, h1, lead, section label); credits/library/deep-sky/posters italic leads become the upright lead; gallery hub strip text aligned with the title; the double nav padding on gallery hub/patches/sourcing removed | shots of credits, colophon, library, gallery hub, deep-sky, posters, patches, programs, sourcing aligned on one grid |
| A3 Link and accent colour | X2, G4, teal redesign | one link token (Q1 blue); teal (`#4ecdc4`, ~640 uses in ~123 files) replaced in UI by the token; science diagrams and Lab art keep theirs (2026-11-09 rule) | grep: no teal in UI files outside the allow-list; shots of credits, colophon, library, posters, science, explore HUD |
| A4 One chip and filter | C1, C3, G3, PG1, MI1, FL1, E8, ISS1 | one `Chip` (≈28–32 px, ≥11 px text, one active colour) for Explore/Worlds layer chips, gallery pills, programs group-by, missions/fleet/launches filters; the filter count sits right after the FILTERS label; the Explore level reset becomes the shared "Reset view" button; ISS "Watch live" becomes a chip | shots of explore, moon, earth, missions, fleet, launches, deep-sky, programs, iss; e2e for those routes |
| A5 Chip groups | C2, W7 | Q5: group every world (On ground / In space) or flatten Earth | Earth column no longer collides with the ruler at 768 px high |
| A6 Nav bar | N1 | on desktop pointers the right-hand toggles drop to ~32 px with a tighter gap; rarely used ones (contrast, share, debug) move into one menu | nav bar height and right cluster match the main links; touch keeps 44 px |

## B. Panel shell (needs Q3, Q6)

| Slice | Points | Change | Done when |
|---|---|---|---|
| B1 Hero, close, actions | P3, P4, P5, EP4, MI4 | no hover glow on the hero (focus ring for keyboard only); close/back buttons per Q6; "Collector card" → "Share" (Q3) and the action buttons (plan, explore surface, fly, share) become one compact row near the top of Overview | shots of planet, mission, fleet, surface-site panels, scrolled and unscrolled |
| B2 Science links | S1, S2, O6 | a shared helper caps every panel at 5; the MissionPanel push-chain (up to ~21 cards) becomes a ranked pick by mission type/phase; generic defaults replaced by curated per-body lists; orbit-regime links varied (keplers-laws and apsides repeat 4–5×) | no panel > 5; no two panels of one type with the same list (unit test over the data) |
| B3 Outer panels and stars | SN2, MW3, MW5 | star and outer-level panels follow the planet pattern: one hero, a Gallery tab, the constellation finder in a tab; deep-sky images as heroes where one exists | shots of a star with photo, Milky Way, Local Group, Laniakea panels |

## C. Explore

| Slice | Points | Change | Done when |
|---|---|---|---|
| C1 Select = focus | E3, E5, SS4, I4, EP1, IM5, IM6 | one `focusBody` for planets, moons, small bodies, belts; every entry point (scene click, index, who-lives-here, panel links, iconic milestone boxes) selects and focuses; turning a chip off clears a selection of that kind; links only for bodies in the scene (Pallas, Hygiea, Quaoar, Sedna become plain text or get data); New Horizons opens the mission panel; mission links per Q4, newest first | e2e: every entry point leaves the body selected and centred; chip-off clears it |
| C2 Readability | E2, SN1, MW1, MW2, MW4, MW6 | per-level exposure/ambient lift; light-year rings as fat lines with readable labels; one shared label declutter + steady label offset for the outer levels; hover/selection ring on every pickable; the Sun/Milky Way anchor ring becomes the neighbourhood-style small dot + ring on hover | shots per level at default zoom, daylight-brightness check |
| C3 HUD fixes | E4, SS1, SS2, SS3 | fixed-width scale bar with the value changing; Vega pill only on hover/selection; level picker opens leftward at the right edge; planet-scales overlay redrawn readable | shots at three zooms; picker fully on screen at 1280 px |
| C4 Orbit ruler | O1, O2, O3, O7, W2, W4 | one row per regime; hover/click draws the regime as rings in the scene; body thumbnails instead of grey dots; collapsible; the locate button and "As seen from you" readout join one bottom-left stack with the ruler | shots on explore, earth, moon, mars; no overlap at 1280x720 and 1440x900 |
| C5 Ruler data | O4, O5 | founding missions linked where the mission exists (Pioneer 10, Voyager 1/2, Dawn, New Horizons, Parker, Solar Orbiter, Mariner 4/10, Mars Express, Hope); country codes stripped; lists reviewed after H | every listed mission that exists is a link |
| C6 Index | I1, I2, I3, WM3 | Explore index rows get a meta line (type, distance, diameter, moons) and kind filters; planet dots in each planet's colour; Moon/Mars index dots use the nation colours (`colorFor(site)`) like the footer | shots of both indexes |
| C7 Iconic missions | IM1, IM2, IM3, IM4, IM7 | title = "Hover any spacecraft…", "why one plane" behind (i); chip first in its row; milestone boxes sharp (screen-constant), date + number in the header, milestone name in the body, mission name once | shots at default and zoomed |
| C8 Explore navigation | E1, W1, E7, E9, E10 | one shell table feeds nav, hub, home grid, picker; breadcrumb/picker uses the home-page icons and per-level text; a per-level "what you are looking at" card (TierContextCard pattern) with science links; one welcome hint for Explore and Worlds; second-level nav per D4 | shots of each level; sitemap per D4 |
| C9 Explore → Worlds | E6 | per D5: "Go to Mars" in the planet panel and "Back to Explore" on the world page, or switch on zoom | link both ways for Earth, Moon, Mars, Venus |
| C10 Planet heroes | EP2, EP3 | full-disc true-colour heroes for every planet (Mars first); artist concepts and mission shots kept out of the hero slot | shots of all 9 planet panels next to the 3D body |

## D. Worlds

| Slice | Points | Change | Done when |
|---|---|---|---|
| D1 Orbiter selection | W3 | the selected orbiter stays visible after the fly-to (today low orbiters hide when altitude flips `orbitsInView`); the view shifts left of the open panel | shots: LRO, Lunar Prospector, MRO selected with the panel open |
| D2 Panel order for sites and orbiters | W6, WM1 | a photo first on every site; orbiters get a "Details" tab with "The spacecraft" cutaway, not "On the surface" | shots of 3 landers, 3 orbiters |
| D3 Venus galleries | VE1 | `getVenusSiteGallery` stops returning [] and uses the Moon/Mars ladder (mission + fleet galleries exist: 3–4 images each) | gallery and hero on Venera 13, Vega 1, Vega 2 |
| D4 Moon traverses | WM2 | per Q8: line style only, or Mars parity (patches, photos, stops, densify Chang'e 3 and Chandrayaan-3's 9-point routes) | shots side by side |
| D5 Brackets | W5 | DROPPED (operator 2026-11-11) | — |

## E. Catalog

| Slice | Points | Change | Done when |
|---|---|---|---|
| E1 Program page | PG2, PG3, PG4, PG5, PG6 | empty sections hidden; one mini-card for related programs (above "Go deeper"), surface sites (after Missions) and compact hardware cards; the mission detail keeps a fixed height | shots of Sputnik, Apollo, Cassini, Mars rovers |
| E2 Program data | PG7, PG8, PG9 | roster links to missions and hardware that exist (lists in the map); a `milestone` flag and "Milestones" section where rows are segments (Cassini) | every roster row naming an existing mission or fleet entry links |
| E3 Missions page | MI2, MI3 | one agency palette (three exist today); colour dots in the agency filter; era strip redesign per D7 | shots |
| E4 Fleet | FL2, FL3 | line-up as a first-class view toggle; crew tab → "Missions": compact list, no portraits, links only to missions that exist, one count; `gemini-3` → `gemini3` id normalisation | Crew Dragon, Soyuz, Gemini shots; no dead mission links |
| E5 ISS | ISS2 | assembly player at a fixed height | no height change across phases |

## F. Pages

| Slice | Points | Change | Done when |
|---|---|---|---|
| F1 Credits and colophon | CR2, CO1, CO2, CO3 | one collapse approach (Q7) for both; colophon totals line from `original-work.json` totals; cutaways split into spacecraft and launchers (Q9) | shots; TOC anchors open their section |
| F2 Library | LI2, LI3 | after Q10 | — |
| F3 Home | H1, H2, H3 | hero capped so the intro and actions are above the fold at 1440x900 and 1366x768; Lab card in Learn (needs a glyph) | shots at 1366x768, 1440x900, 390x844 |

## G. Plan, Fly, Launch

| Slice | Points | Change | Done when |
|---|---|---|---|
| G1 Plan → Fly | PL1, PL2, PL3, FY3 | destinations grouped (inner, asteroids, Jupiter/Saturn systems, outer); the chosen rocket and a default payload carried to Fly (`rocket=` param, `vehicle`, `fleet_refs`) so the launch sequence starts; launch and descent beats as markers on the play bar | e2e: plan → fly shows rocket, payload, working launch, markers |
| G2 Fly visuals | FY1, FY4 | brighter 2D rings and stars; the destination body drawn (today Earth and Mars are hard-coded); HUD rows as label/value grid, wrapping only inside the value | shots of a Mars, Jupiter and Moon flight |
| G3 Ascent | FY2, LA1 | downrange drawn ground-relative so the first seconds rise vertically; new camera shots after the operator's examples (D6) | ascent frames 0–20 s show vertical climb |

## H. Content (research; runs alongside)

MI5 + PG7 + FL3 ids: add Kaguya/SELENE and Chandrayaan-2; propose the next candidates from the
gaps found (program rows, fleet craft, sites without a mission entry) for the operator to pick.

## I. Last

GH1 — README and docs refreshed with text and screenshots of the finished UI.

## Questions for the operator (asked once, before the slice that needs them)

- Q1 Link/accent blue: `#889fe7` (status chips, rings) or `#7fb0e0` (gallery, programs)? Links only, or every UI teal?
- Q2 Text floor 10 or 11 px? Lead text in Space Mono upright (as Gallery)? Keep Crimson italic only for quotes and captions?
- Q3 "Share": renamed card overlay, or a real share-link action?
- Q4 A mission link in a body panel: open the mission panel in place, or go to /missions?
- Q5 Chip groups: group every world, or flatten Earth?
- Q6 Panel close X: scrolls away with the content, or a slim fixed header bar?
- Q7 Credits/colophon length: every section collapsed with its count, or "first N + show all"?
- Q8 Moon traverses: line style only, or the Mars extras (patches, photos, stops)?
- Q9 "Launcher sketches": the launchers inside the 198 cutaways, or the exploded launcher art?
- Q10 Library: which "JPL planetary models", and which landing/rover research items?
- Need a screenshot or URL: G5/G6 (which gallery page; the bottom line), O6 ("light minute / light year" — the regime data has neither), W5 (brackets — both bodies draw them), SN2 ("the zodiac chart" — none exists), MW3 (the Sag A* image), W6 (which sites show graphics).
- D1–D7 above.

## Clarifications from the operator's screenshots (2026-11-11)

- MW3 (Sagittarius A*, `/explore?bh=sagittarius-a-star`): selecting Sag A* replaces the main area with
  the gravitational-lensing ray-trace (a blurry render) and opens a text-only panel whose subtitle names
  the "Event Horizon Telescope image 2022" — but no image is shown anywhere, and the repo has no EHT
  image yet. Slice B3: the panel gets the EHT 2022 image as its hero (ESO/EHT Collaboration, CC BY 4.0
  — fetch with the existing image tools, provenance row); the Milky Way view stays in the main area; the
  lensing render becomes an explicit action in the panel ("See the lensing simulation"). Same screen
  also shows teal values and "Read more" (A3) and the italic science card (A1).

## Answers (2026-11-11)

- Q1: blue D, `#5070ff` (today's global link colour, `--color-accent-text`). Open: links only, or every UI teal.
- Q2: floor 11 px everywhere; labels 11 px at ~60 %; body 14 px; lead/overview 15–16 px upright in the body font; italic only for quotes and photo captions, ≥ 14 px.
- SN2 (Antares, `/explore?goto=antares`): "the zodiac chart" is the constellation finder figure
  ("Scorpius from the Sun's sky") that `StarPanel` stacks under the star portrait, above the tabs —
  together they push Overview below the fold. Slice B3: one hero at the top (photo, else the portrait),
  the constellation finder in its own tab ("In the sky") with the constellation named and linked, a
  Gallery tab when there is more than one image. Same screen: "5 LY" ring label collides with
  "Barnard's Star" (C2 label declutter); the italic lead (A1).
- G5/G6 ("gallery item page" = the deep-sky full-screen viewer, `/gallery/deep-sky`, e.g. Mystic
  Mountain): the fact labels OBJECT · CONSTELLATION · DISTANCE · CAPTURED sit at the very bottom edge
  of the window, so their values fall below it and the row reads as labels with the values hidden. Fix
  (slice F4, new): the viewer fits one screen — image height capped so caption, credit line and the
  facts row with values are visible at 1440x900 and 1366x768 without scrolling; facts as label above
  value. Same screen: the italic caption (A1, Q2 keeps italic only for real captions — this is one, so
  it stays italic at ≥ 14 px) and the teal-ish facility line (A3).
- O6 (`/explore?regime=GIANTS`): the pane's one science card is "Planetary stats" — the same as
  TERRESTRIAL; across the Explore ruler `keplers-laws`, `apsides` and `hill-sphere` also repeat
  (SUN has `light-minute`, which the operator remembered). Slice B2 gives every regime its own best
  match, no repeats within a ruler. Same screen confirms: Pioneer 10 / Voyager 2 not linked and "(USA)"
  in the labels (C5), SCATTERED wrapping to two lines (C4/O1), the close X drawn over the scrolled text
  (B1/P4), the Vega pill behind the panel (C3/SS1), oversized chips (A4), italic science card (A1).
- W5 (Mars/Moon square brackets): dropped by the operator (2026-11-11); slice D5 removed.
- W6 ("Stand here"): inside the panorama the view opens facing the generated fill that pads a partial
  panorama, and the operator has to rotate to find the real photo. Slice D2: the panorama opens facing
  the centre of the real photo region (per-site initial heading from the panorama's photo span), on
  every site with a panorama; e2e asserts the initial view centre is inside the photo span.
- Surface colour fix (OutputPass) done on the branch: code `8e9a7c8d1d9`, docs `a07218d5429`;
  before/after shots sent for approval. /iss and /tiangong share the composer but use ACES tone mapping
  — left unchanged (one flag) pending the operator.
