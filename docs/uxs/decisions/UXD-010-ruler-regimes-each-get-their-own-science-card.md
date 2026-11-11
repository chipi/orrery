# UXD-010 — Each Explore ruler regime gets its own best science card, no repeats within a ruler

- **Status**: accepted
- **Date**: 2026-11-11 (the operator's point and clarification, then the go)
- **Decider**: the operator raised O6 ("all orbit panes repeat the same science links … variety,
  different per pane, best matches, no repetition", `docs/wip/2026-11-11-ux-feedback-plan.md` line
  177) and showed the GIANTS pane (lines 445–450). "Slice B2 gives every regime its own best match,
  no repeats within a ruler" is the lead's resolution under "Answers (2026-11-11)". The operator, 2026-11-11 (session go after the UXD check), recorded in `docs/wip/2026-11-11-ux-feedback-plan.md`, line starting "- Operator go, 2026-11-11 (session" (line 460): the fixes for W6, SN2, G5/G6 and O6 "are accepted as decided".
- **Answers**: O6, S1, S2; slice B2 (science links)
- **Changes**: UXS-014 / UXS-016 (no ruler section exists today; see UXS-000 §Next). The cap of five
  science links per panel (S2) is part of the same slice.

## Context

On `/explore?regime=GIANTS` the pane's one science card is "Planetary stats", the same as
TERRESTRIAL. Across the Explore ruler `keplers-laws`, `apsides` and `hill-sphere` also repeat. The
regime data (`science_link` per `orbit-regimes-explore/*` entry in
`static/data/i18n/en-US.core.json`, read at `9fdf4cc4a6b`) holds: SUN `scales-time/light-minute`;
TERRESTRIAL and GIANTS `planets/planetary-stats`; BELT and KUIPER `orbits/keplers-laws`;
HELIOPAUSE and OORT `orbits/hill-sphere`; SCATTERED `orbits/apsides`. No regime links `light-year`.
The operator remembered a "light minute / light year" pair (plan lines 445–448); the data confirms
light-minute on SUN only. The plan's note that the regime data has neither is wrong about
light-minute.

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
