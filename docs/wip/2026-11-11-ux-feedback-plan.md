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
