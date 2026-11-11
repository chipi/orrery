# UXD-011 — Decisions apply project-wide: no partial updates, and screenshots after each slice

- **Status**: accepted (a process decision)
- **Date**: 2026-11-11 (proposed and decided)
- **Decider**: the operator — "we cannot have partial updates, we have to sync the entire project
  with all decisions we are doing. quality over speed" and "provide smaller screenshots after each
  segment so I can visually validate" (operator note `decisions-apply-project-wide`, modified
  2026-11-11); "Definition of done — every slice (operator, 2026-11-11: no partial updates,
  quality over speed)" and "Checks and balances (operator, 2026-11-11: invest time up front)"
  (`docs/wip/2026-11-11-ux-feedback-plan.md` lines 465 and 481)
- **Answers**: the whole feedback list; every slice
- **Changes**: UXS-000 §How a UX change moves and §Definition of done (this series). AGENTS.md has
  no line for it yet.

## Context

A decision applied to the screens that were looked at but not to the rest leaves the site
inconsistent, which is what the operator's feedback list was about (operator note `decisions-apply-project-wide`).

## Options

The sources record the rule and no alternatives.

## Decision

1. **A decision is applied everywhere in one pass**: every route and component in `src/` (a
   repo-wide search, not the sample screens), the docs that state the rule, the tests that guard it,
   and all 14 locales for any text. The slice is not done until a repo-wide search shows no leftover
   outside a documented allow-list.
2. **Tests move with the work**: expectations changed by the decision are adjusted, new tests guard
   the rule (site-wide where possible), obsolete tests are removed; no suite is left red or skipped.
3. **Each slice runs the same way**: a read-only brief first; implementation against it; an
   independent checker that did not write the code re-runs the searches and the suites; the lead
   reads the evidence and the screenshots, then reports (plan lines 481–492).
4. **Screenshots after each slice**: a small set of downscaled before/after shots, desktop 13-inch
   laptop and phone, for the operator to validate visually.

## Consequences

- Slices are larger and slower; the operator chose that ("quality over speed").
- A decision cannot ship as a sample: for example the type floor ([UXD-002](UXD-002-type-scale-and-the-11px-floor.md))
  was applied across 121 files at once rather than to the panels the operator pointed at.
- Each new decision gets a UXD before the slice is called done (UXS-000 definition of done, item 5).

## Verification

Process, not code. The checker's evidence (searches and suites with their output) is the record; the
checks are re-run by an agent other than the implementer.
