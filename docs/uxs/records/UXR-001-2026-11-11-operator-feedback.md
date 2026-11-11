# UXR-001 — Operator feedback list (2026-11-11)

- **Date**: 2026-11-11
- **Who**: the operator
- **Full list**: `docs/wip/2026-11-11-ux-feedback-plan.md` lines 1–307, "the operator's words (typos
  fixed)", one row per point with an id. This record summarises it by area and does not duplicate it.
- **Related**: the slice plan in the same file (lines 311–400), the decisions it produced
  ([UXD-001](../decisions/UXD-001-ui-accent-blue-replaces-teal.md) to
  [UXD-011](../decisions/UXD-011-decisions-apply-project-wide.md)), and
  [CHANGE-INVENTORY](../CHANGE-INVENTORY.md).

## What it is

A single list of everything the operator found wrong or missing on the site, from tiny text and
turquoise links to Explore, Worlds, Catalog, Plan, Fly and Launch. The teal accent redesign planned
for 0.9.9 is part of the list: "operator: merge it in" (plan line 5). The plan counts "119" points;
counting the id rows in the file gives 120 (including GH1 and the dropped W5). Not reconciled here.

## The points, by area

| Area                       | Ids                                | What the operator asked for                                                                                                                                            |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-cutting text         | X1, X2                             | Text too tiny and italic for no reason; one set of text styles across the site; links not turquoise but the muted blue                                                  |
| Panels                     | P1 to P5                           | Overviews and labels too small and italic; no blue glow on the hero hover; the close X not drawn over scrolled content; "Collector card" becomes "Share", higher         |
| Science links              | S1, S2                             | The same science links repeat across panels of one type; one to five per panel, varied                                                                                 |
| Controls                   | C1 to C3                           | Chips oversized and the only oval things; Earth's two chip groups; one unified filter pattern                                                                          |
| Nav bar                    | N1                                 | The upper-right of the nav is oversized; more compact, maybe second-level nav horizontal under the main nav                                                            |
| Random pages               | RP1; G1 to G6; CR1 to CR3; CO1 to CO3; LI1 to LI3 | One style across Gallery, Credits, Colophon, Library; italic and tiny leads; the long pages (collapse); totals on Colophon; Library additions; the deep-sky bottom line (G6) |
| Home                       | H1 to H8                           | Hero too big; Lab card missing in Learn; more engaging without scrolling; TV home; video and a full redesign questions; typography and styling                         |
| Explore, overall           | E1 to E10                          | Welcome hint; scene too dark; chips clear selection; fixed-width ruler; select as well as open; link to the world pages; second-level nav versus the breadcrumb; reset view; layer explanations; graphical breadcrumbs |
| Explore, solar system      | SS1 to SS4; EP1 to EP4             | The Vega pill; the picker cut off; the planet-scales popup; "who lives here" focus; panel mission links; planet heroes true to the 3D render, pure planets only; actions too low |
| Orbit ruler                | O1 to O7                           | One row per item; hover and click draw the regime in the scene; thumbnails; founding missions as links; mission list review; varied science links; collapsible          |
| Explore index              | I1 to I4                           | Richer rows, filters at the top, a colour per planet, every click focuses                                                                                              |
| Iconic missions            | IM1 to IM7                         | A smaller panel top; milestone boxes sharp with date and number in the header; clicking opens the mission; New Horizons; the chip first                                 |
| Stellar neighbourhood      | SN1, SN2                           | Light-year circles unclear; star panel pushes the overview down (one hero, a Gallery tab, a link from stars to the constellation)                                        |
| Milky Way and beyond       | MW1 to MW6                         | Overlapping and jumping labels; panels unlike the others (and the Sagittarius A\* image); unmarked clickable items; deep-sky heroes; the Sun ring too obvious            |
| Catalog, programs          | PG1 to PG9                         | The three filters unique to the page; empty sections hidden; related programs, surface sites and hardware as cards; programs with few missions; Cassini; hardware links  |
| Catalog, missions          | MI1 to MI5                         | Filters ugly and tiny; a better era filter; colour per agency in the filters; "Fly this mission" higher; add Kaguya and Chandrayaan-2                                     |
| Catalog, fleet             | FL1 to FL3                         | The same filter notes; the line-up looks hidden; Crew Dragon missions tab and no portraits                                                                              |
| ISS                        | ISS1, ISS2                         | "Watch live" as a first-class chip; the assembly player's fixed height                                                                                                  |
| Worlds                     | W1 to W7; WM1 to WM3; VE1          | Welcome hint; the locate button and the "As seen from you" readout overlap the ruler; selected orbiters hidden; "Stand here" always an image; orbiters' tab; traverse parity; index colours; Venus galleries (W5, the brackets, was dropped) |
| Plan                       | PL1 to PL3                         | A destination dropdown that is organised; the chosen launch carried to Fly; a launch sequence                                                                            |
| Fly                        | FY1 to FY4                         | 2D too dark; the first seconds of ascent move sideways; flight-plan markers on the play bar; tidier HUD rows                                                            |
| Launch                     | LA1                                | A launch camera on top moving around; the operator has example shots to share                                                                                          |
| GitHub                     | GH1                                | Refresh the README and all docs, with text and graphics, last                                                                                                          |

## What happened to it

- **Decisions the operator owns** (D1 to D7) and **questions** (Q1 to Q10) were asked once, before the
  phase that needs them. Q1 and Q2 were answered on 2026-11-11 ([UXD-001](../decisions/UXD-001-ui-accent-blue-replaces-teal.md),
  [UXD-002](../decisions/UXD-002-type-scale-and-the-11px-floor.md)); the rest are open
  ([UXS-000 §Open](../UXS-000-orrery-ux-architecture.md#open)).
- **Clarifications from the operator's screenshots** (2026-11-11, plan lines 417–458) covered MW3,
  SN2, G5 and G6, O6, W5 and W6. They produced [UXD-006](../decisions/UXD-006-mars-moon-square-brackets-dropped.md) (dropped) and the proposals [UXD-007](../decisions/UXD-007-panorama-opens-facing-the-photo.md)
  to [UXD-010](../decisions/UXD-010-ruler-regimes-each-get-their-own-science-card.md); MW3 is planned in slice B3 and the proposals in their own
  slices, all without a recorded operator go.
- **Already checked, no work**: CR3. All 1,203 Moon, Mars and Earth surface tiles map to a credit
  entry (539 hotspot provenance rows); on-screen attribution in the scenes was not audited (plan
  lines 319–321).
- **Reduced to slices**: the points reduce to the slice plan, one table per area (A to I), each with
  its "done when" (plan lines 311–400). The status of each slice is in the
  [change inventory](../CHANGE-INVENTORY.md).
- **Process the operator added the same day**: no partial updates, a definition of done, and checks
  and balances for every slice ([UXD-011](../decisions/UXD-011-decisions-apply-project-wide.md)).
- **To check at the end**: science diagrams and Lab art keep their own colours "for now" (plan lines
  460–463).
