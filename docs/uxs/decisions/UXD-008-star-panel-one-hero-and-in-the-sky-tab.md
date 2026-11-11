# UXD-008 — Star panel: one hero, the constellation finder in an "In the sky" tab, a Gallery tab for more

- **Status**: accepted
- **Date**: 2026-11-11 (the operator's point and clarification, then the go)
- **Decider**: the operator raised the point (SN2, `docs/wip/2026-11-11-ux-feedback-plan.md` line
  206: "all images placed on top push the overview down … one hero image, a gallery tab for more
  images, and a dedicated pattern for linking stars to zodiac signs") and, on the Antares screenshot,
  clarified that "the zodiac chart" is the constellation finder figure (lines 432–437). The tab layout is the lead's resolution (slice B3). The operator, 2026-11-11 (session go after the UXD check), recorded in `docs/wip/2026-11-11-ux-feedback-plan.md`, line starting "- Operator go, 2026-11-11 (session" (line 460): the fixes for W6, SN2, G5/G6 and O6 "are accepted as decided".
- **Answers**: SN2; slice B3 (outer panels and stars)
- **Changes**: UXS-001 (detail panel tabs; no star-panel section today) and UXS-014 §Selecting and
  understanding an object (see UXS-000 §Next).

## Context

`StarPanel` stacks the constellation finder figure ("Scorpius from the Sun's sky") under the star
portrait and above the tabs; together they push Overview below the fold (plan lines 432–434). The
planet panels already follow one pattern: one hero, a Gallery tab for more images.

## Options

The sources record one layout and no alternatives.

## Decision

The star panel follows the planet pattern:

1. **One hero at the top**: the photo if there is one, otherwise the portrait.
2. **The constellation finder in its own tab, "In the sky"**, with the constellation named and
   linked.
3. **A Gallery tab when the star has more than one image.**

## Consequences

- Slice B3 applies the same pattern to the outer-level panels (Milky Way, Local Group, Laniakea) so
  their panels match the others (MW3), and uses deep-sky images as heroes where one exists (MW5).
- Related items on the same screen belong to other slices: the "5 LY" ring label colliding with
  "Barnard's Star" (C2, label declutter) and the italic lead (A1,
  [UXD-002](UXD-002-type-scale-and-the-11px-floor.md)).
- The Sagittarius A\* panel (MW3) is clarified in the plan (EHT 2022 image as hero, lensing render
  as an explicit action) but not recorded as an operator decision; it is not part of this record
  (UXS-000 §Open).

## Verification

Planned in slice B3: shots of a star with photo and of the outer panels. No test guards the tab
layout today (not checked by this document).
