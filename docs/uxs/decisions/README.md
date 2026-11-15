# UX decision records (UXD)

The UX counterpart of ADRs: one record per decision about how Orrery looks, reads or behaves for a
visitor. ADRs keep architecture decisions; UXDs keep UX ones. Where they live among the UX
documents: [UXS-000](../UXS-000-orrery-ux-architecture.md).

**Why they exist.** Orrery's UX rules sit in many places (IA, the UXS documents, the design system
doc, AGENTS.md, TA.md) and a decision's date and reasoning get written into the rule it changed, or
only into the operator's working notes. From here a spec or rules document states the current rule
and links the UXD that set it; the reasoning and the options weighed live in the UXD.

## Rules

- **One decision, one record**, numbered in order: `UXD-NNN-<slug>.md`.
- **Status**: `proposed` then `accepted` or `rejected`; later `superseded by UXD-NNN`. An accepted
  record is not rewritten; a change of mind is a new record that supersedes it. A `rejected` record
  keeps a proposal that was weighed and dropped, so it is not proposed again by accident.
- **The decider is the operator.** A record is `accepted` only on the operator's recorded go: the
  date and where it was given (a message, a line in a working plan, a dated operator note). Where the
  operator decided the question and a lead agent worked out the fix, the record says which part
  is which.
- **Every accepted record names the rules it changes** (spec, IA, design system, AGENTS.md or TA.md
  section), and those rules link back to it. A decision is not done until its rules say it.
  UXS-000 §Next lists the lines still to link.
- **Input is traceable**: the feedback points (X1, P3 …), questions (Q1 …) and slices (A1 …) it
  answers, from the working plan and [UXR-001](../records/UXR-001-2026-11-11-operator-feedback.md).
- **Every record cites its source**: file and line, or the operator note name and date. No decision,
  date or reason is written that a source does not show.
- **Applied project-wide.** A decision lands in every route, component, doc, test and locale in
  one pass ([UXD-011](UXD-011-decisions-apply-project-wide.md)).

## Template

```markdown
# UXD-NNN — <the question, as a short title>

- **Status**: proposed | accepted | rejected | superseded by UXD-NNN
- **Date**: YYYY-MM-DD (proposed) · YYYY-MM-DD (decided)
- **Decider**: the operator — <where the go was given, with the source line>
- **Answers**: feedback point ids, Q-ids, slice id
- **Changes**: <spec / IA / design system / AGENTS.md / TA.md sections that now state the rule>

## Context

What is true today and why it is a question (with evidence and file or line references).

## Options

1. … — for / against.
2. …

## Decision

The option chosen, in one paragraph a reader can apply.

## Consequences

What changes in the app, the specs and the tests; what it costs; what it rules out.

## Verification

How the rule is checked (the guard), or what is not checked yet.
```

## Index

| UXD                                                          | Decision                                                                                          | Status   | Date       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------- | ---------- |
| [UXD-001](UXD-001-ui-accent-blue-replaces-teal.md)           | The UI accent is blue D `#5070ff`; it replaces every UI teal, and cyan is out                      | accepted, implemented in A3 | 2026-11-11 |
| [UXD-002](UXD-002-type-scale-and-the-11px-floor.md)          | Type scale: 11 px floor, labels at 60 %, upright Space Mono leads, italic only for quotes and captions | accepted | 2026-11-11 |
| [UXD-003](UXD-003-home-route-card-titles-upright.md)         | Home route-card titles are upright Space Mono; the 4.5 px icon text stays deleted                 | accepted | 2026-11-11 |
| [UXD-004](UXD-004-one-outputpass-per-composer.md)            | One OutputPass per composer; colour textures sRGB, data maps linear                               | accepted | 2026-11-11 |
| [UXD-005](UXD-005-no-staging-verify-on-prod.md)              | No staging: Pages serves only the docs; releases go straight to prod and are verified there       | accepted | 2026-11-10 |
| [UXD-006](UXD-006-mars-moon-square-brackets-dropped.md)      | Mars/Moon square brackets on detailed locations: not aligned, dropped                             | rejected | 2026-11-11 |
| [UXD-007](UXD-007-panorama-opens-facing-the-photo.md)        | A site panorama opens facing the real photo, not the generated fill                               | accepted | 2026-11-11 |
| [UXD-008](UXD-008-star-panel-one-hero-and-in-the-sky-tab.md) | Star panel: one hero, the constellation finder in an "In the sky" tab, a Gallery tab for more     | accepted | 2026-11-11 |
| [UXD-009](UXD-009-deep-sky-viewer-fits-one-screen.md)        | The deep-sky viewer fits one screen; facts read label above value                                 | accepted | 2026-11-11 |
| [UXD-010](UXD-010-ruler-regimes-each-get-their-own-science-card.md) | Each Explore ruler regime gets its own best science card, no repeats within a ruler        | accepted | 2026-11-11 |
| [UXD-011](UXD-011-decisions-apply-project-wide.md)           | Decisions apply project-wide, no partial updates; screenshots after each slice                    | accepted | 2026-11-11 |
| [UXD-012](UXD-012-one-page-shell.md)                          | One page shell: container, title, lead and section label for every text page                     | accepted | 2026-11-11 |
| [UXD-014](UXD-014-one-chip-and-filter.md)                      | One chip and one filter for every toggle, filter, choice and HUD action                         | accepted | 2026-11-12 |
| [UXD-015](UXD-015-flat-chip-row.md)                           | Layer chips are one flat row on Explore and every world; the INDEX absorbs the A–Z                | accepted | 2026-11-12 |
| [UXD-016](UXD-016-compact-nav-and-more-menu.md)               | Compact nav controls (32 px fine / 44 px touch), one More menu for High contrast, Share and Debug, one 52 px bar | accepted | 2026-11-12 |
| [UXD-017](UXD-017-one-index-on-every-scale.md)                | One INDEX on every /explore scale: all selectable objects, black holes in the scale they belong to | accepted (its "no camera move" line is superseded by UXD-019; amended 2026-11-13 by C6: solar-system meta line, chips for every row, nation dots on the Worlds; and by C6-F: filter chips folded behind a FILTERS button) | 2026-11-12 |
| [UXD-018](UXD-018-panel-shell-and-actions.md)                 | Panel shell: one fixed header (badge line carrying back and × at the badges' 24 px, the name below at full width; Share the action row's last chip; Overview three values per row), one action row of at most three chips, no hero hover glow | accepted | 2026-11-12 |
| [UXD-019](UXD-019-select-equals-focus.md)                     | Select = focus: every pick opens the panel, rings the body and takes the camera; a chip off clears its kind, a select turns it on; mission links open in place | accepted | 2026-11-12 |
| [UXD-020](UXD-020-explore-readability-pins-rings-labels.md) | /explore readability: one 12 px label, one 44 px ring (gold anchor, blue hover), one placement pass, a steady label offset, 2 px light-year rings | accepted | 2026-11-12 |
| [UXD-021](UXD-021-explore-hud-scale-bar-picker-pills-references.md) | /explore HUD: one fixed-width scale bar (120 px, the value follows), a picker ladder that stays on screen and a row that clears a docked panel, direction pills for their owner only, an aligned REFERENCES grid in the reader's language, Reset always in its slot | accepted | 2026-11-12 |
| [UXD-022](UXD-022-science-link-lists.md)                      | Science links: at most five per panel through one helper, curated per body, ranked per mission class, each ruler regime its own card, the section pair identical in every locale | accepted | 2026-11-12 |
| [UXD-023](UXD-023-star-and-outer-panels-follow-the-planet-pattern.md) | Star, outer-scale and black-hole panels follow the planet pattern: one shared body, one hero or none, GALLERY with two images, IN THE SKY for stars, deep-sky and EHT heroes, black holes open in place | accepted | 2026-11-12 |
| [UXD-024](UXD-024-orbit-ruler-one-row-draws-its-regime.md)    | Orbit ruler: one line per row, a fold, the hovered or open regime drawn in the scene in the highlight blue, one bottom-left column on the Worlds, photos for the residents, 23 founding missions linked and no country tags | accepted | 2026-11-13 |
| [UXD-025](UXD-025-lists-carry-a-round-photo.md)               | Lists carry a round 28 px photo of the row's own thing: one `EntityThumb`, one resolver over a generated manifest (the blessed hero slot's 192 px WebP), the row's identity colour as ring and neutral for teal, the dot when there is no file; built for the regime panel, its founding missions, the solar-system and Worlds INDEXes, the station lists, the belt members, the fleet panel and the entity pages (T1 to T4); the PATHS legend follows; T5 (L46) the neighbourhood and outer-scale INDEXes and the Related lists | accepted | 2026-11-13 |
| [UXD-026](UXD-026-iconic-missions-legend-and-milestone-boxes.md) | Iconic missions: the legend is a one-line title with an (i) (the why-one-plane popover), the hovered craft's tagline a card beside its row (no shift), ICONIC MISSIONS the first chip, 28 px rows; the milestone boxes are screen-sized sprites (`n/N · date` over the name, 12 px at every zoom, no mission name, one mission box at Today, the shared placement pass) | accepted | 2026-11-13 |
| [UXD-027](UXD-027-explore-levels-one-table-glyphs-card-and-hint.md) | Explore levels: one shell table (`SCALE_SHELLS`) read by the nav dropdown, hub, home grid, picker, card and lens story (D4: the dropdown stays); the level's glyph in the picker chip and rungs and in the nav rows (own gradient defs per instance); a "what you are looking at" card under the picker row (what the level is, the story, up to five `/science` links, folded on touch and remembered); one welcome hint on `/explore` and the four Worlds (shown until the first zoom or drag, not stored); 4 keys in 14 locales | accepted | 2026-11-13 |
| [UXD-028](UXD-028-explore-and-worlds-link-both-ways.md) | Explore and the Worlds: an explicit link both ways, no switch on zoom (D5); one table (`WORLD_LINKS`) read by the "Go to Mars" view chip of the Earth, Mars, Venus and Moon panels (Venus new), the `/explore/<id>` page and the Worlds' "Back to Explore" chip, the first control of the view row (the touch cluster wraps), which returns to `/explore?id=<body>` with the panel open and the camera on it (the Moon is `earth:moon`); 5 keys in 14 locales, `panel_action_surface` removed | accepted | 2026-11-13 |
| [UXD-029](UXD-029-planet-heroes-whole-disc-on-black.md) | Planet heroes: the whole disc on black, planets only (EP2, EP3; B-033); the planet panel's hero is `contain` on `#000` in the 16:9 box, the nine heroes are pictures of the planet itself, Mars slot 04 with a tighter crop waits for the operator's yes | accepted | 2026-11-13 |
| [UXD-030](UXD-030-worlds-selected-orbiter-stays-visible-and-framed.md) | The Worlds: a selected orbiter stays visible (W3); while an orbiter is selected the orbits count as in view (the orbiter, its ring, the other orbiters, the ruler; one pure rule, `orbitsInViewNext`), the selected orbiter wears the outline pass, the view shifts beside the open panel for every selection in the 3D view (the Explore framing is now `createPanelFramer`, shared), closing an orbiter's panel ends the selection, a deep link waits for the markers and then flies | accepted | 2026-11-14 |
| [UXD-031](UXD-031-station-assembly-player-fixed-box.md) | The station assembly player keeps one height across its phases (ISS2; E-decisions 22a, 23a): the chip is two fixed one-line rows (name; launcher · date) with an ellipsis, the whole phase in the title and a live region, the hint one row (two reserved at 480 px and below); `/iss` and `/tiangong` share it | accepted | 2026-11-14 |
| [UXD-032](UXD-032-program-page-card-rails-and-compact-hardware.md) | The program page (PG2 to PG6; E-decisions 1a to 4a): a section with no rows draws nothing, one 176 px `MiniCard` in a `CardRail` for related programs and surface sites, "Go deeper" drops its `program` rows, hardware is 56 px cards with a 72×48 mini hero (departs from UXD-025 on this page only), the mission pane keeps one box (meta and name one line, blurb three), Earth surface cards link `?object=` | accepted | 2026-11-14 |
| [UXD-033](UXD-033-program-roster-links-and-milestones.md) | Program rosters (PG7 to PG9; E-decisions 5a to 9a): a row that names an existing mission, craft or module links to it (`linked_id`, or `link` for a craft or module, with the station for a module), hardware lists hold the flown vehicles of the program's missions (launch sites left out), missions that exist join the rosters of Soviet lunar, Ariane, Space Shuttle and Mariner, and rows that are episodes, phases, decisions or plans carry `milestone: true` and sit under a Milestones section after Missions | accepted | 2026-11-14 |
| [UXD-034](UXD-034-worlds-orbiter-detail-tab-and-panorama-opening.md) | The Worlds' orbiter panel (WM1, W6; D-decisions 4a to 7a): an orbiter (and the 9 Earth objects with a drawing) has a DETAIL tab, not STORY, with the heading "The spacecraft" (one new key); the five drawings the lander filter hid are shown (17 of 19 orbiters); landers keep STORY and "On the surface"; the hero stays first below the action row (guard test); the audit of the 30 panoramas (new `photo_span_deg` on the 18 partial ones, Insight's opening yaw fixed, a running fly-in no longer overwrites the opening view) and the e2e UXD-007 promised | accepted | 2026-11-14 |
| [UXD-035](UXD-035-fleet-view-toggle-and-one-missions-list.md) | The fleet page (FL2, FL3; E-decisions 16a to 21a): GRID and LINE-UP are one view radiogroup on the FILTERS row (the kind group only in LINE-UP, FILTERS disabled not removed, `?view=lineup&kind=`, old `category=launcher&view=lineup` links still work, leaving the line-up leaves the category filter alone); one MISSIONS tab for every entry from `fleetMissionRows` (flights and linked missions, a link and a round photo only where the mission exists, the rest plain text, crew as one line of names, no portraits, no patch, no empty circle; ADR-053 amended), one count shared with the OVERVIEW button, which prints the mission's name for a single mission; the same list on `/fleet/<id>`; the six `gemini-N` ids renamed; E3's era strip left for the end of the arc | accepted | 2026-11-14 |
| [UXD-036](UXD-036-venus-galleries-use-the-worlds-ladder.md) | Venus galleries (VE1; D-decisions 8a, 9a): `getSurfaceSiteGallery` is the one gallery ladder of the Moon, Mars and Venus (the three site loaders are one-line calls), so Venera 13, Vega 1 and Vega 2 have a hero and a GALLERY tab, on the heroes already blessed (`missions/venera-13/02`, `vega-1/02`, `vega-2/03`) that the INDEX rows already showed; Moon and Mars galleries frozen and compared before/after for all 55 sites; the photo-first guard no longer exempts Venus; no image, slot, override or data file changed | accepted | 2026-11-14 |
| [UXD-037](UXD-037-orbit-band-palette-no-teal.md) | The orbit bands and the old UI teal (operator "yes on losing old teal"): the lowest band of every world is green `#8fd16a`, the second (HLO, HMO, KUIPER, Earth MEO) rose `#f28bb8`; ISS, MRO, MAVEN, Juno and the commercial era take the green, Voyager 2's path magenta `#da47eb`, the debug panel and dev routes the highlight blue; `accent-colour.spec.ts` no longer exempts regime or era colours | accepted | 2026-11-14 |
| [UXD-038](UXD-038-one-length-rule-for-the-long-text-pages.md) | One length rule for the long text pages (CR2, CR3, CO1, CO2, CO3; decisions 24a, 26a, 27a, 28a): every list on `/credits` and `/colophon` draws its first 10 rows and a "Show all N" chip (`ShowAll`, `$lib/preview-list`), the source and section headers stay open so a contents link lands on its header, the `/credits` contents list is capped below 768px only; the colophon opens with one line "N original works in K sections" counted from the sections it draws (`colophonSections`), and the interface-graphics count is the glyph registry's in both the contents and the heading; the 198 cutaways split into 158 spacecraft and 40 launcher sketches by a `kind` field in `original-work.json` (the exploded 76 stay whole); a unit guard that every Moon, Mars and Earth scene image has a credit row, plus a browser audit script | accepted | 2026-11-14 |
| [UXD-039](UXD-039-home-two-column-hero-one-glyph-component-and-type-scale.md) | The home page (H1, H2, H3, H8, D1, D2, D3; decisions 33a to 41a): from 1024 px the hero is two columns (the wordmark, tagline, subhead and CTAs left, the same picture 400 px wide right) so the CTAs and the "What is this?" heading are in the first screen at 1366x768 and 1440x900; one `RouteGlyph` component and one `RouteGlyphDefs` draw every route-card icon on the home grid and the section hubs (the 535-line copies are gone), the Lab card is first under LEARN, and the glyphs render as before (two drawings kept for earth, programs, live, essays); the cards heading is "All {count} destinations" with the grid's count in 14 locales; body text on `--size-body`, `--size-lead` and `--size-meta`; the TV two-panel layout kept, its overflow fixed, a TV emulation spec; the hero file is not touched, no video, L3 kept | accepted | 2026-11-14 |
| [UXD-040](UXD-040-gallery-viewer-fits-hub-strips-keep-text-and-one-page-note.md) | The gallery pages (G2 to G6; decisions 42a to 44a): the deep-sky viewer is a two-row grid whose image takes the height the caption stack leaves, so the facts, the credit line and the "show in the sky" button are inside 1366x768 and 1440x900 (the figure scrolls on a phone and in a short window, the image has a 200 px floor), the button's dark-teal text is the page background token (4.96:1); G2 to G4 mean `/gallery/deep-sky`; one `.page-note` footer in the shell file replaces the four footers of deep-sky, posters, patches and sourcing (framed, 12 px, muted blue); the `/gallery` posters and insignia strips keep their text (no clamp, none under a thumbnail); first gallery spec | accepted | 2026-11-14 |
| [UXD-041](UXD-041-library-names-its-data-sources-and-lists-every-link.md) | The library (LI2, LI3; decisions 29a to 32a, with 25a): a "Planetary models (NASA JPL)" block (three `data-sources.json` entries: the approximate Keplerian elements, the planetary physical parameters, the satellite parameters) and a "Moon and Mars surface data" block (LROC NAC traverses, the USGS Apollo 17 traverse, the HiRISE-traced Zhurong route, the two Mars sources) as header asides in the one style, both read from `data-sources.json` so `/credits` and `/library` cannot drift; `build-link-provenance.ts` reads the /science article links and the essay sources (544 rows, 30 new publishers) so "Every external link Orrery sends you to lives here" is true, with a unit test that fails when one is missing; each source block draws its first 10 entity clusters and a "Show all N" chip (UXD-038's rule) | accepted | 2026-11-14 |
| [UXD-042](UXD-042-plan-to-fly-handoff-grouped-destinations-and-the-journey-bar.md) | Plan to Fly (PL1 to PL3, FY3; decisions G-1a to G-9a): `rocket=<rockets.json id>` is written by /plan (also into its own URL) and read by /fly through one pure mapping to the vehicle name and the launcher ref, so a plan flight shows the chosen rocket and the payload "Generic spacecraft · N kg" (N the mass the ascent integrates); START WITH LAUNCH and `?launch=1` work for plan flights, and no launcher means no launch button (the dead button's cause, `resolveLauncher(undefined, '—')`, fixed); the nine planetary moons fly their host's arc with the moon named (`LoadedMission.targetMoon`); the destination `select` has five `optgroup`s; one marker row on the play bar for the whole journey (ascent beats, cruise milestones and stages, descent beats where a profile exists): 2 px ticks with hover and focus labels, a click seeks, ticks closer than 10 px collapse with a count | accepted | 2026-11-14 |
| [UXD-043](UXD-043-fly-2d-seen-on-the-dark-destination-drawn-and-hud-grid.md) | `/fly` visuals (FY1, FY4; decisions 10a to 14a): the 2D canvas's rings are neutral white at 0.45 alpha / 1.25 px and the stars 0.15 to 0.51, the not-yet-flown arcs 0.75 (the approved 0.45 measures 1.8:1, under the 3:1 floor), one const object with a contrast test; the 2D scale fits the destination or trajectory (1.5 AU floor, eased, "1 AU = N px" readout, `fly_2d_scale_label` in 14 locales); the 2D draws only the active destination (the host plus the named moon for the nine moon destinations; no hard-coded Mars); the nine moon textures load in 3D and the targeted moon is highlighted (`#889fe7`); every `/fly` label/value block (the `.hud` panels, the info card, the CAPCOM rows) is a `fit-content(50%) / 1fr` grid whose value wraps inside its own column | accepted | 2026-11-14 |
| [UXD-044](UXD-044-moon-traverses-take-the-mars-line-style.md) | Moon traverses (WM2, L49; Q8: line style only): every Moon route draws the Mars style, the blue-white-amber ramp by distance driven (the files carry no time), casing, kilometre milestones, landing ring, hover card in km from landing; sol ticks, replay, photo pins and the Journey tab stay Mars-only; no LROC or published track was found for Chang'e 3 (Yutu) and Chandrayaan-3 (Pragyan), so they stay 9-point outlines flagged `approximate` and labelled "Approximate route" (`traverse_approximate_route`, `traverse_hover_km` in 14 locales) | accepted | 2026-11-15 |
| [UXD-045](UXD-045-index-row-type-is-a-glyph-with-a-tooltip.md) | INDEX rows: the type is a 14 px glyph with a tooltip (hover, keyboard focus) and hidden text for a screen reader, so the name keeps the row's width; 14 drawings in `index-kind-glyph.ts`; stars keep their constellation as text; the solar-system and Local Group rows are unchanged | accepted | 2026-11-15 |
| [UXD-046](UXD-046-the-launch-runs-a-seeded-camera-director.md) | The launch runs a seeded camera director by default (opening pool, shot pools, beats, blends, framing, clouds, smoke, limb, night lights, a vertical first rise); the light comes from the Sun at the pad at the real launch time, seeded for Plan flights and date-only missions; the Shuttle keeps its payload in the bay; reduced motion gets cuts only; `?cam=classic` for one release; `?debug=1` view on /fly. |
| [UXD-047](UXD-047-the-launch-draws-the-real-pad-of-its-site-and-era.md) | The launch draws the pad of its launch site and year (G4, L58): 16 low-detail models in five families (Apollo/Shuttle LC-39, Soviet, SpaceX, ULA, service towers) at true height against the rocket, picked per launch-site fleet record and launch year (`pad-family.ts`, one row per record, tested), moving parts a pure function of the mission time; the generic tower stays for a site with no model; each model listed on /colophon; only the LC-39 and strongback sizes are fetched-verified, the rest approximate | accepted | 2026-11-15 |
| [UXD-048](UXD-048-missions-one-agency-palette-era-tiles-with-photos-and-agency-dots.md) | /missions has one palette for its 14 agencies (cards, agency bars, filter dots, era dots), nine era tiles with a flagship photo, agency dots and a real radiogroup (ar mirrored), agency chips with dot and count, a showing line and a redesigned card (E3, MI2, MI3, D7). | Unit test of the palette contrast and colour-blind distance; e2e on the strip, the filters and the card. |
| [UXD-049](UXD-049-deep-sky-panel-in-the-sky-tab.md) | A deep-sky object's panel has an IN THE SKY tab (L42, OVERVIEW · IN THE SKY): the constellation figure with the object ringed (direction from RA / Dec in the HYG frame, never the scene x, y, z; Serpens' two parts merged), six computed cells (constellation, position, nearest named star within 15 degrees, best months by the mean-Sun rule, latitude band from the time zone, viewing band by magnitude: naked eye to 6, binoculars to 9, telescope above, none without a magnitude), the zodiac note and the lines action; 13 keys in 14 locales; the entity pages stay as they are (L60) | accepted | 2026-11-15 |

Open questions (D7, Q3 to Q6) are not records; they are listed in
[UXS-000 §Open](../UXS-000-orrery-ux-architecture.md#open).

## Decisions made before this series

The dated decisions already written into IA, the UXS documents, AGENTS.md, the ADRs and the
operator's notes are extracted, one row each, into [`BACKFILL.md`](BACKFILL.md): date, decision,
who, and where it is stated. They are history, not re-decided; a backfilled decision becomes a
full UXD only when it is revisited.
