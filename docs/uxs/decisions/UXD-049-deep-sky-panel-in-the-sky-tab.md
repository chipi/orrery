# UXD-049 — A deep-sky object's panel has an IN THE SKY tab

- **Status**: accepted (built; unit tests green, e2e and screenshots in Verification)
- **Date**: 2026-11-15
- **Decider**: the operator, 2026-11-15 — all six recommendations of the L42 brief approved (L42-1a, L42-2a, L42-3a, L42-4a, L42-5a, L42-6a)
- **Answers**: L42 (B3 brief Q6)
- **Builds on**: [UXD-008](UXD-008-star-panel-one-hero-and-in-the-sky-tab.md) and [UXD-023](UXD-023-star-and-outer-panels-follow-the-planet-pattern.md) (the star's IN THE SKY tab and the shared panel body); brief `docs/wip/2026-11-15-L42-constellation-finder-brief.md` §13
- **Changes**: `src/lib/universe/sky-finder.ts`, `src/lib/universe/constellation-actions.ts`, `src/lib/universe/constellation-finder.ts`, `src/lib/components/ConstellationFinder.svelte`, `DeepSkyPanel.svelte`, `StarPanel.svelte` (the Serpens lookup and the shared action), 13 message keys in 14 locales

## Context

On `?deepsky=M42` the reader learned "Constellation: Orion" and could not see where in Orion, or how to find it. A star's panel already has the constellation finder (UXD-008); B3 left deep-sky objects out on purpose (brief Q6), not for a technical reason: all 143 objects carry a constellation code, an RA and Dec, and all 47 codes in use have a line figure.

## Decision

1. **A deep-sky panel's tabs are OVERVIEW · IN THE SKY** (L42-1a, L42-2a), the same second slot as the star panel. The tab is always there; the constellation cell stays on OVERVIEW as well.
2. **The finder draws the object as a ring** (`ConstellationFinder` `marker="object"`; the star glow is unchanged for stars), with the nearest named star as a labelled dot and a dashed hairline to the object when that star falls inside the box the figure already fills (it never shrinks the figure).
3. **Six cells, all computed from the object's own RA / Dec / magnitude** (`sky-finder.ts`; no new sourced claim):
   - CONSTELLATION (accent) and POSITION (`5h 35m · −5°`, numbers only).
   - NEAREST BRIGHT STAR: the nearest of the 62 named stars, only within 15 degrees (L42-3a); the row is left out beyond (39 of 143 objects), never a far star. The star's name is its localized name when its overlay has one.
   - BEST MONTHS: a three-month window centred on the month the object stands opposite the Sun, by the mean-Sun rule (the Sun's RA is 0 h on day 79 and advances 24 h in 365.25 days). A calendar rule, not an ephemeris, so a window can be off by a few days. Month names from `Intl.DateTimeFormat` in the reader's locale; the same in both hemispheres.
   - FROM YOUR LATITUDE: the highest altitude is `90 − |latitude − dec|`; over 60 degrees reads "High in the sky", under 20 "Low on the horizon", 0 or less "Never rises", the middle says nothing. The latitude is the browser time zone's (`viewerLatLon`, no permission prompt, L42-6a); the row is left out when the zone is unknown.
   - SEEN WITH: a magnitude rule (L42-4a): to magnitude 6 naked eye, to 9 binoculars, above that a telescope; **no magnitude, no row** (20 of 143). It is a rule on the catalogue V magnitude, not a promise: a large faint object (M31, M33, M44, M42) is listed by its summed magnitude and is easy only under a dark sky.
4. **The zodiac note and the "Show constellation lines" action** are the star tab's (same keys, one shared `showConstellationLines`).
5. **The frame is never guessed.** The figures and the named stars are in the HYG frame (z toward the north pole); a deep-sky object's `x, y, z` is the scene frame (y north), `(x, z, y)` of it. The finder is fed `raDecToHyg(ra, dec)` only; a test compares it with all 143 objects' `x, y, z`.
6. **Serpens' two-part figure merges** (`figureVertices` returns every entry of a code), so M5, M16 and the Serpens Nebula see both halves; `StarPanel`, which took the first entry only, uses the same helper.
7. **The entity pages are not touched** (L42-5a); the latitude row would be client-only there. Plan row L60.

## Not done here

- The entity pages (`/explore/deep-sky/<id>`, `/explore/stars/<id>`) draw no finder (plan L60).
- 20 objects have no catalogue magnitude, so no SEEN WITH row (M35 and the Carina Nebula are visible to the eye in reality; filling `mag` is a catalogue task).
- The nearest-star list is the 62 curated stars, not a bright-star catalogue.
- Constellation names are English in all 14 locales (B3 finding 6), unchanged.
- Month windows and altitudes were not compared with a planetarium.

## Verification

- Unit: `src/lib/universe/sky-finder.test.ts` (frame against all 143 objects, hop distances, months, altitude at several latitudes, band edges, Serpens merge, counts: 104 objects with a hop, 29 / 61 / 33 / 20 bands), `constellation-finder.test.ts` (the hop point never changes the figure).
- e2e: `tests/e2e/explore-deep-sky-panel.spec.ts` (M42, M31, M44, cas-a, M5, 30 Doradus with an unknown time zone).
- Screenshots at 1440 and 390 for M42, M31, M5, 30 Doradus, cas-a, M42 in `de` and `ar`.
