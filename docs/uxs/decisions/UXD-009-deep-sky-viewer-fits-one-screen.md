# UXD-009 — The deep-sky viewer fits one screen; facts read label above value

- **Status**: proposed
- **Date**: 2026-11-11 (proposed; the operator's point and clarification)
- **Decider**: the operator raised G5 ("italic opening text for no reason") and G6 ("at the bottom,
  a muted line … looks like labels without real values", `docs/wip/2026-11-11-ux-feedback-plan.md`
  lines 99–100) and identified the screen from a screenshot: the "gallery item page" is the deep-sky
  full-screen viewer (lines 438–444). The fix is the lead's resolution under "Answers (2026-11-11)". Awaiting the operator's go, when its slice (F4) is reviewed.
- **Answers**: G5, G6; slice F4 (deep-sky viewer fit, added after the original slice plan)
- **Changes**: the spec that will cover the gallery (no UXS covers `/gallery/deep-sky` today; see
  UXS-000 §Next).

## Context

On `/gallery/deep-sky` (example: Mystic Mountain) the fact labels OBJECT, CONSTELLATION, DISTANCE and
CAPTURED sit at the very bottom edge of the window, so their values fall below it and the row reads
as labels with the values hidden (plan lines 438–441).

## Options

The sources record one fix and no alternatives.

## Decision

The viewer **fits one screen**: the image height is capped so the caption, the credit line and the
facts row **with its values** are visible at 1440×900 and 1366×768 without scrolling. The facts are
laid out **label above value**.

Same screen, other rules that already apply: the caption is a real caption, so it keeps italic at 14
px or more ([UXD-002](UXD-002-type-scale-and-the-11px-floor.md)); the facility line's teal-ish colour
is slice A3 ([UXD-001](UXD-001-ui-accent-blue-replaces-teal.md)) (plan lines 443–444).

## Consequences

- Slice F4 (not in the first slice table; the plan names it in this answer) changes the viewer's
  layout. It is not yet in the plan's slice table (section F, lines 377–383), so
  [CHANGE-INVENTORY](../CHANGE-INVENTORY.md) carries it as F4.

## Verification

Planned: shots at 1440×900 and 1366×768. No test guards the fit today (not checked by this
document).
