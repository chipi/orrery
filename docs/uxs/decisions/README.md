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

Open questions (D1 to D7, Q3 to Q10) are not records; they are listed in
[UXS-000 §Open](../UXS-000-orrery-ux-architecture.md#open).

## Decisions made before this series

The dated decisions already written into IA, the UXS documents, AGENTS.md, the ADRs and the
operator's notes are extracted, one row each, into [`BACKFILL.md`](BACKFILL.md): date, decision,
who, and where it is stated. They are history, not re-decided; a backfilled decision becomes a
full UXD only when it is revisited.
