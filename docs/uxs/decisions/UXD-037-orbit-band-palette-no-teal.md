# UXD-037 — The orbit bands, and the old teal in the UI, leave #4ecdc4 and #7fd9d2

- **Status**: accepted (built; checked by unit tests, `accent-colour.spec.ts` on three projects and screenshots, not yet by the operator)
- **Date**: 2026-11-14
- **Decider**: the operator, 2026-11-14 ("yes on losing old teal"); the proposal and its swatch sheet (contrast and distance numbers below) approved as written, Earth MEO included
- **Answers**: the 0.9.9 arc's "replace the site-wide `#4ecdc4`" in the places [UXD-001](UXD-001-ui-accent-blue-replaces-teal.md) and [UXD-024](UXD-024-orbit-ruler-one-row-draws-its-regime.md) had left as data colours
- **Builds on**: UXD-001 (no teal in rings, states, chips), UXD-024 (the ruler draws the regime in the highlight blue `#889fe7`; the regime colour stays on the dot, the chip and the panel eyebrow)
- **Changes**: `static/data/orbit-regimes{,-moon,-mars,-explore}.json`, `earth-objects.json` (ISS), `explore-orbiters.json` (MRO, MAVEN, Juno), `trajectories/voyager-2.json`, `src/lib/explore/paths-legend.ts`, `src/lib/epoch-bands.ts`, `DebugPanel.svelte`, the two `dev/` routes, `tests/e2e/accent-colour.spec.ts`; `05_Design_System.md` §2.5 and the contrast rule, UXD-025

## Context

The orbit bands still wore the old accent: LEO, LLO, LMO and the explore TERRESTRIAL zone `#4ecdc4`, HLO, HMO and KUIPER `#7fd9d2`. The two were 10 apart (CIE76 ΔE) on the Moon and on Mars, so the lowest two bands read as one. Earth MEO `#7b9cff` was 15 from the highlight blue `#889fe7`, so a selected MEO row looked like a hovered row.

## Decision

1. **Two band hues, shared by every world.** The lowest band (LEO, LLO, LMO, TERRESTRIAL) is `#8fd16a` (green, hue 98; 11.2:1 on `#04040c`; ΔE 97 from the highlight blue). The second band (HLO, HMO, KUIPER, and Earth MEO) is `#f28bb8` (rose, hue 334; 8.9:1; ΔE 48). Both clear 5.7:1 on the 22 % hover tint of a chip. Neighbouring bands are at least 46 apart (the old HLO/LLO pair was 10). The other bands keep their colours.
2. **The old teal in the rest of the UI** takes the same green: ISS, MRO, MAVEN, Juno (object identity), the commercial-era band of the timeline strip; its Skylab band (`#5fc4e0`, a cyan the guard found once the `--band-color` exemption went) is magenta `#da47eb`; and the `?debug=1` panel and the two `dev/` routes take the highlight blue. Voyager 2's path (the one teal line of the PATHS legend, in `paths-legend.ts` and its trajectory file) is `#da47eb` (magenta): the other 17 path colours are pastel and crowded, green sat 13 from `#b2e066`, magenta is 46 or more from every other path.
3. **Kept**: Lab art and science diagrams (UXD-001); the Kármán limb glow, the tides and the tidal-lock overlay of the 3D scenes (physical look, not UI; WebGL pixels are outside the guard).
4. **The guard now covers the bands.** `accent-colour.spec.ts` no longer exempts `--regime-color` or `--band-color`; a band that goes teal again fails it. `--accent` (the fleet category colour) stays exempt until the fleet page's own change.

## Not decided here

Earth MOON `#aaaacc` (ΔE 22 from the highlight blue), NRHO and SCATTERED `#9c6ee0` (36), OORT `#1e3a8a` (1.97:1 as text) and BELT `#8b6f47` (4.34:1) are not teal and are unchanged.
