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
| [UXD-025](UXD-025-lists-carry-a-round-photo.md)               | Lists carry a round 28 px photo of the row's own thing: one `EntityThumb`, one resolver over a generated manifest (the blessed hero slot's 192 px WebP), the row's identity colour as ring and neutral for teal, the dot when there is no file; built for the regime panel, its founding missions, the solar-system and Worlds INDEXes, the station lists, the belt members, the fleet panel and the entity pages (T1 to T4); the PATHS legend follows | accepted | 2026-11-13 |
| [UXD-026](UXD-026-iconic-missions-legend-and-milestone-boxes.md) | Iconic missions: the legend is a one-line title with an (i) (the why-one-plane popover), the hovered craft's tagline a card beside its row (no shift), ICONIC MISSIONS the first chip, 28 px rows; the milestone boxes are screen-sized sprites (`n/N · date` over the name, 12 px at every zoom, no mission name, one mission box at Today, the shared placement pass) | accepted | 2026-11-13 |

Open questions (D1 to D7, Q3 to Q10) are not records; they are listed in
[UXS-000 §Open](../UXS-000-orrery-ux-architecture.md#open).

## Decisions made before this series

The dated decisions already written into IA, the UXS documents, AGENTS.md, the ADRs and the
operator's notes are extracted, one row each, into [`BACKFILL.md`](BACKFILL.md): date, decision,
who, and where it is stated. They are history, not re-decided; a backfilled decision becomes a
full UXD only when it is revisited.
