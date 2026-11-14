# UXD-031 — The station assembly player keeps one height across its phases

- **Status**: accepted (built; checked by e2e on three projects and by screenshots, not yet by the operator)
- **Date**: 2026-11-14 (proposed 2026-11-13, decided and built)
- **Decider**: the operator, 2026-11-13/14 — the recommendations of `docs/wip/2026-11-13-slice-E5-brief.md` §12 approved as written (E-decisions 22a and 23a, "approved all E-series recommendations", `docs/wip/2026-11-11-ux-feedback-plan.md` "## E. Catalog")
- **Answers**: ISS2 of the UX feedback plan; slice E5
- **Builds on**: [UXD-014](UXD-014-one-chip-and-filter.md) (the control row's chips)
- **Changes**: `src/lib/components/StationAssemblyControl.svelte` (shared by `/iss` and `/tiangong`), `src/lib/components/StationAssemblyControl.test.ts` (new), `tests/e2e/station-assembly-height.spec.ts` (new); `docs/concept/05_Design_System.md` 5.18, `docs/adr/TA.md`, the component README, the change inventory

## Context

The player's box grew upward with the wrapped text of its "launched on" line. On `/iss` the phase strings run from 29 to 129 characters (a module, a dock event, a truss install with its crew list), so the play button, the scrub bar and the date moved as the phase changed (ISS2: "changes height as content changes").

## Decision

1. **Two fixed rows (E-decision 22a).** The chip is two rows of `1.3em`, each one line (`white-space: nowrap`, ellipsis): row 1 the rocket glyph and the phase name (bold; a button to the module's panel where there is one), row 2 "launcher · date" (the date never cut, the launcher takes the ellipsis). The empty state fills the same two rows. The whole phase text (`name · launcher · date`) is in the chip's `title` and in a visually hidden `aria-live="polite"` element, so the cut text is still reachable.
2. **The hint (E-decision 23a).** One row with an ellipsis above 480 px; at 480 px and below it reserves two rows (`height: 2.5em`, clamped at two) so the instruction stays whole and the box never changes height.
3. **Both stations.** One component, so `/tiangong` follows `/iss`.
4. **The control row on a phone.** The scrub input may shrink (`min-width: 0`) and the date readout is `5.5rem` at 480 px and below, so the date stays inside the box at 360 and 393 px (it ran past the box edge before).

5. **A landscape phone (touch, 480 px tall or less).** The box sits at `bottom: 3.5rem` with tighter padding (about 124 px tall) so it fits between the top-left HUD chips (3D, RESET VIEW, SPIN) and the drawer tabs. Measured at 802 x 293: before, the box ran from y 68 to 205 and covered the chips' row (bottom 104), hiding the play and reset buttons behind RESET VIEW and SPIN; after, from y 113 to 237, 9 px under the chips and 8 px above the drawer (top 245).

## Consequences

- The box height does not depend on the phase, the width or the locale's phase text; the controls sit at the same y in every phase.
- Crew lists and long launcher strings are cut on screen (full in the title and the live region). The data is unchanged.
- On a 360 to 393 px phone the scrub bar is short (about 50 to 110 px) because the three 44 px touch chips and the date take the row.

## Not done

- No data edit (the dock and truss strings stay English constants in every locale; not touched).
- No layout outside the player was changed. The landscape fit (decision 5) is by media query on height; a landscape window shorter than about 290 px was not measured.
- The live region's addition is small and was not asked for in the plan; a reviewer may cut it.

## Verification

`StationAssemblyControl.test.ts` (two chip rows in both states, the title and live text, the stylesheet's fixed heights and the 480 px rule, the phase data's second-row fields) and `tests/e2e/station-assembly-height.spec.ts` (60 scrub positions on `/iss` and `/tiangong` in en, de and ar: box height, box top and the y of play, scrub, date, chip and hint within 1 px, the date inside the box, the box inside the viewport and clear of the drawer; also at 360 px; desktop, mobile and mobile-landscape projects). Run counts are in the E5 row of the change inventory.
