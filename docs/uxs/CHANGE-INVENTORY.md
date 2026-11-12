# Orrery UX — change inventory

Every UX slice in flight, in one register: the decisions and feedback points behind it, its status,
the surfaces it touches, and which spec or ADR it will need to state. The decisions are UX decision
records ([decisions/](decisions/README.md)); the inputs are in
[UXR-001](records/UXR-001-2026-11-11-operator-feedback.md); the slice definitions ("change" and "done
when") are in `docs/wip/2026-11-11-ux-feedback-plan.md` lines 311–400. Where this register sits among
the UX documents: [UXS-000](UXS-000-orrery-ux-architecture.md).

**Status**: planned · in progress · in review (built and checked, waiting for the operator's
screenshots) · done · dropped. Update a row when its status changes; add a row for every new slice.
**Will touch** is a proposal from the slice text and the spec set, to be confirmed in the slice
brief. **Waits on** names an open question or operator decision (UXS-000 §Open); a slice does not
start its affected part until it is answered.

The slice plan is dated 2026-11-11 and all statuses are as of that day, on branch `tech-debt/0.9.9`.

## Foundations

| Slice | Change | Points | Decisions | Status | Surfaces | Will touch | Waits on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Type scale: tokens, an 11 px floor, labels at 60 %, upright leads, italic only for captions | X1, P1, P2 | UXD-002, UXD-003, UXD-011 | in review | every route and panel type; home route cards | IA §shared-tokens, UXS-002 to UXS-006, UXS-013, UXS-015, `05_Design_System.md`, AGENTS.md | — |
| A2 | Page shell: one container, h1, lead and section label for every text page (32 routes, 27 files) | RP1, CR1, LI1, G1, G2, G5 | UXD-002, UXD-012 | in review | credits, colophon, library, episodes, gallery, deep-sky, posters, patches, sourcing, programs, program pages, privacy, live, essays, science, 4 hubs, entity pages | IA §page-shell, Design System §3.2/§3.3/§4.6/§5.8, AGENTS.md, TA.md | — |
| A3 | Link and accent colour: teal replaced in the UI by the blue token family (`--color-accent` #5070ff, `--color-state` #889fe7, `--color-ok` #4ade80); Lab workspace on the same tokens; science diagrams and Lab figures keep their data colours (`a3-keep`); the /fly HUD cyan is held for its own assessment (L1) | X2, G4, teal redesign | UXD-001 | in review | credits, colophon, library, posters, science, explore HUD, home glyphs, panels, Lab, tier badges, reading/watch-list covers | IA §shared-tokens, `05_Design_System.md`, AGENTS.md, UXS-002, UXS-003 | — (Q1, Q12–Q14 answered) |
| A4 | One chip and one filter component across Explore, Worlds, gallery, programs, missions, fleet, launches, stations, /fly and /plan: 30 px fine / 44 px coarse, 4 px corners, outline at rest, one active look (world tint on the Worlds); compact FILTERS strip with the count after the label (one key); Reset view, Watch live, HUD actions, group-by, pull tabs on the same chip; 24 px hit areas for small non-chip controls | C1, C3, G3, PG1, MI1, FL1, E8, ISS1 | UXD-014, UXD-001, UXD-002 | in review | explore, moon, mars, venus, earth, missions, fleet, launches, deep-sky, programs, iss, tiangong, colophon, fly, plan | IA §controls, Design System §5.7/§5.7a, AGENTS.md, TA.md, `chip.css`, `Chip.svelte` | — (D1–D8, O1–O3 answered) |
| A5 | Layer chips: one flat horizontal row on Explore and every world (`LayerChipRow`), no groups or masters; Earth = SURFACE, LAUNCHPADS, MUSEUMS, OBSERVATORIES, ORBITERS (one chip for every orbiter); the A–Z tab is absorbed into the INDEX panels (real links per row, prerendered while closed) | C2, W7 | UXD-015, UXD-014 | in review | explore, moon, mars, venus, earth | IA §controls, Design System §5.7, AGENTS.md, TA.md, ADR-096 item 11 | — (Q5 answered) |
| A6 | Nav bar: right-hand controls 32 px on fine pointers / 44 px on touch (one `.nav-btn` base, the A4 chip look); High contrast, Share and Debug in one More menu (drawer rows on phones); the bar is 52 px from one token (SC-1 closed); the hamburger break stays 1219 px, the per-locale width report feeds L2 | N1 | UXD-016, UXD-014 | in review | nav bar, all routes | IA §shell-regions, Design System §4.1/§5.1, AGENTS.md, TA.md, UXS-000 SC-1, `Nav.svelte`, `LocalePicker.svelte`, `tokens.css` | — (Q answered 2026-11-12) |

## Panel shell

| Slice | Change | Points | Decisions | Status | Surfaces | Will touch | Waits on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | Hero, close and actions: no hover glow on the hero (inset focus ring only); one fixed header bar on every panel (back, name after the hero, Share, close, A4 chips); "Collector card" becomes "Share" in the bar and still opens the card; one action row of at most three chips under the identity block, no foot stack | P3, P4, P5, EP4, MI4 | UXD-018, UXD-014 | in review | planet, satellite, small body, mission, fleet, earth-object and surface-site panels | `Panel.svelte`, `PanelActions.svelte`, IA §controls, Design System §5.3, UXS-001, TA.md, PRD-036 | — (Q3, Q6, D1–D4, O1–O8 answered) |
| B2 | Science links: a shared cap of five per panel, ranked picks, every ruler regime its own card | S1, S2, O6 | UXD-010 | planned | every panel, the orbit ruler | UXS-001, UXS-014 | — |
| B3 | Outer panels and stars: one hero, a Gallery tab, the constellation finder in "In the sky"; deep-sky heroes; the EHT image for Sagittarius A\* | SN2, MW3, MW5 | UXD-008 | planned | star, Milky Way, Local Group, Laniakea panels | UXS-001, UXS-014, UXS-016 | — (MW3 has no recorded go) |

## Explore

| Slice | Change | Points | Decisions | Status | Surfaces | Will touch | Waits on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | Select equals focus: one `focusBody`, chip-off clears a selection, mission links, New Horizons | E3, E5, SS4, I4, EP1, IM5, IM6, L35 | UXD-019 | built (untested in a browser) | explore, the index, the ruler, iconic missions | UXS-014 | — |
| C2 | Readability: per-level exposure lift, light-year rings, one label declutter, hover rings, subtle anchor ring | E2, SN1, MW1, MW2, MW4, MW6 | UXD-004 (context) | planned | every explore level | UXS-014, UXS-016 | — |
| C3 | HUD fixes: fixed-width scale bar, Vega pill, level picker, planet-scales overlay | E4, SS1, SS2, SS3 | none yet | planned | explore HUD | UXS-014 | — |
| C4 | Orbit ruler: one row per regime, hover and click draw the regime, thumbnails, collapsible, one bottom-left stack | O1, O2, O3, O7, W2, W4 | none yet | planned | explore, earth, moon, mars | UXS-005 and a ruler section (none today) | — |
| C5 | Ruler data: founding missions linked, country codes stripped | O4, O5 | none yet | planned | the ruler | none (data) | — |
| C6 | Index: meta line, filters, planet dots in their colours, nation colours on Moon and Mars | I1, I2, I3, WM3 | none yet | planned | explore index, Moon and Mars index | UXS-001, UXS-006 | — |
| C7 | Iconic missions: title, milestone boxes sharp, date and number in the header | IM1 to IM4, IM7 | none yet | planned | iconic missions | UXS-014 | — |
| C8 | Explore navigation: one shell table, breadcrumb with home icons, a "what you are looking at" card, one welcome hint | E1, W1, E7, E9, E10 | none yet | planned | explore nav, breadcrumb, hub, home grid | IA §nav-groups, UXS-014 | D4 |
| C9 | Explore to Worlds: a link both ways for Earth, Moon, Mars, Venus | E6 | none yet | planned | planet panels, world pages | UXS-014, IA | D5 |
| C10 | Planet heroes: full-disc true-colour heroes for every planet; no artist concepts in the hero slot | EP2, EP3 | none yet (see BACKFILL B-033) | planned | all nine planet panels | UXS-001 | — |

## Worlds

| Slice | Change | Points | Decisions | Status | Surfaces | Will touch | Waits on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | Orbiter selection: the selected orbiter stays visible; the view shifts left of the panel | W3 | none yet | planned | moon, mars, earth, venus | UXS-005, UXS-006, ADR-072 | — |
| D2 | Panel order for sites and orbiters: a photo first; a "Details" tab for orbiters; a panorama that opens facing the real photo | W6, WM1 | UXD-007 | planned | surface-site and orbiter panels, panoramas | UXS-006, ADR-074 | — |
| D3 | Venus galleries | VE1 | none yet | planned | venus | UXS-006 | — |
| D4 | Moon traverses: line style only, or Mars parity | WM2 | none yet | planned | moon | UXS-006 | Q8 |
| D5 | Square brackets on Mars and Moon locations | W5 | UXD-006 (rejected) | dropped (operator, 2026-11-11) | — | — | — |

## Catalog

| Slice | Change | Points | Decisions | Status | Surfaces | Will touch | Waits on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | Program page: empty sections hidden, mini-cards for related programs, surface sites and hardware | PG2 to PG6 | none yet | planned | program pages | UXS-004 | — |
| E2 | Program data: roster links, a "Milestones" section | PG7 to PG9 | none yet | planned | program pages | none (data) | — |
| E3 | Missions page: one agency palette, colour in the filters, a redesigned era strip | MI2, MI3 | none yet | planned | missions | UXS-004 | D7 |
| E4 | Fleet: line-up as a view toggle, a compact "Missions" tab | FL2, FL3 | none yet | planned | fleet | UXS-004 | — |
| E5 | ISS: the assembly player at a fixed height | ISS2 | none yet | planned | iss | ADR-040 | — |

## Pages

| Slice | Change | Points | Decisions | Status | Surfaces | Will touch | Waits on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | Credits and colophon: one collapse approach, a totals line, cutaways split | CR2, CO1, CO2, CO3 | none yet | planned | credits, colophon | a page-shell section | Q7, Q9 |
| F2 | Library additions | LI2, LI3 | none yet | planned | library | a page-shell section | Q10 |
| F3 | Home: hero capped, the Lab card in Learn, more engaging above the fold | H1, H2, H3 (H8 settled for card titles only) | UXD-003 (card titles) | planned | home | IA §home-cards, UXS-013 | D1, D2, D3 |
| F4 | The deep-sky viewer fits one screen; facts label above value | G5, G6 | UXD-009 | planned (added after the slice plan) | `/gallery/deep-sky` | a gallery spec (none today) | — |

## Plan, Fly, Launch

| Slice | Change | Points | Decisions | Status | Surfaces | Will touch | Waits on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G1 | Plan to Fly: grouped destinations, the chosen rocket and payload carried, markers on the play bar | PL1, PL2, PL3, FY3 | none yet | planned | plan, fly | UXS-002, UXS-003 | — |
| G2 | Fly visuals: brighter 2D, the destination body drawn, HUD rows as a label/value grid | FY1, FY4 | UXD-004 (context) | planned | fly | UXS-003 | — |
| G3 | Ascent: a ground-relative downrange so the first seconds rise vertically; new camera shots | FY2, LA1 | none yet | planned | fly launch | UXS-003, ADR-077 | D6 |

## Content and last

| Slice | Change | Points | Decisions | Status | Surfaces | Will touch | Waits on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H | Content (research, alongside): add Kaguya and Chandrayaan-2, propose further candidates | MI5, PG7, FL3 | none yet | planned | missions, fleet data | none (data) | the operator picks candidates |
| I | README and docs refreshed with screenshots of the finished UI | GH1 | none yet | planned (last) | README, docs | README | the finished UI |

## Work outside the slice plan, in 0.9.9

| Item | Change | Decisions | Status | Surfaces | Will touch | Waits on |
| --- | --- | --- | --- | --- | --- | --- |
| Output step | One OutputPass per composer, sRGB colour textures, data maps linear | UXD-004 | in review | `/iss`, `/tiangong`, `/explore`, `/fly`, surface routes | `docs/adr/TA.md` (done at `9fdf4cc4a6b`), AGENTS.md | the final independent check and e2e; the look is accepted "for now" (plan line 460) |
| Staging removal | No staging; Pages serves only the docs | UXD-005, ADR-097 | done (items 1.1 to 1.5 of the 0.9.9 plan); item 1.6 (a patch the operator applies) and the post-deploy leftovers are outside this register | CI, docs | AGENTS.md, `CLAUDE.md`, `docs/ops/*` | — |
