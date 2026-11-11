# UXD-010 — Each Explore ruler regime gets its own best science card, no repeats within a ruler

- **Status**: accepted
- **Date**: 2026-11-11 (the operator's point and the clarification) · fix as recorded in the plan
- **Decider**: the operator raised O6 ("all orbit panes repeat the same science links … variety,
  different per pane, best matches, no repetition", `docs/wip/2026-11-11-ux-feedback-plan.md` line
  177) and showed the GIANTS pane (lines 445–450). "Slice B2 gives every regime its own best match,
  no repeats within a ruler" is the lead's resolution under "Answers (2026-11-11)". No separate
  operator "go" line exists in the sources; accepted here as the plan's recorded answer, confirmed
  by the slice's screenshots and the unit test.
- **Answers**: O6, S1, S2; slice B2 (science links)
- **Changes**: UXS-014 / UXS-016 (no ruler section exists today; see UXS-000 §Next). The cap of five
  science links per panel (S2) is part of the same slice.

## Context

On `/explore?regime=GIANTS` the pane's one science card is "Planetary stats", the same as
TERRESTRIAL. Across the Explore ruler `keplers-laws`, `apsides` and `hill-sphere` also repeat. The
operator remembered a "light minute / light year" pair; the regime data has neither, and only SUN has
`light-minute` (plan lines 445–448).

## Options

The sources record one rule and no alternatives.

## Decision

**Every ruler regime gets its own best-matching science card, and no card repeats within one ruler.**
Pane links vary per pane.

## Consequences

- Slice B2 also caps every panel at five science links and replaces the generic defaults and the
  MissionPanel push-chain (up to about 21 cards) with a ranked pick by type and phase (plan line
  339).
- The orbit ruler's other issues from the same screen belong to other slices: wrapping rows (C4),
  unlinked founding missions and the country codes (C5), the close X drawn over scrolled text (B1),
  the Vega pill (C3).

## Verification

Planned, not written: "no panel over 5; no two panels of one type with the same list (unit test over
the data)" (plan line 339). Not checked by this document.
