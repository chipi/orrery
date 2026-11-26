# F10 + F11: private Moon missions and European launchers — build plan

Operator 2026-11-25: "add these missions and fleet assets, even the ones that failed, and do descents
and all we can"; F11 asks for European launch companies (ICEYE is a satellite company, not a launcher).
The sourced facts are in the `2026-11-25-*-sourced.md` notes next to this file; every number below that
is not in them is an ESTIMATE and goes in `estimatedFields`.

## What exists

| Subject | Mission page | Fleet card | Moon site | Descent | Model |
|---|---|---|---|---|---|
| Beresheet | yes | yes | yes | yes | yes |
| IM-1 Odysseus | yes | yes (`im-1-odysseus`) | no | **no** | Nova-C (`buildNovaC`, /moon marker only) |
| Hakuto-R M1 | **no** | program card `hakuto-r` | no | no | **no** |
| ispace M2 RESILIENCE | **no** | covered by `hakuto-r` | no | no | **no** (Hakuto-R airframe, own lander) |
| Blue Ghost M1 | **no** | **no** | no | no | **no** |
| IM-2 Athena | **no** | **no** | no | no | Nova-C (taller variant) |
| Peregrine M1 | **no** | **no** | — (never reached the Moon) | — | **no** (fleet/cruise only) |
| Vega / Vega C, Spectrum, Miura 1, ICEYE | — | **no** | — | — | (fleet cards first; models later) |

## Steps, in order

1. **Mission pages** (base JSON, `missions/index.json`, en-US overlay, 13 locales): hakuto-r-m1,
   ispace-m2, blue-ghost-m1, im-2, peregrine-m1. Fleet refs both ways (ADR-052 validator).
2. **Fleet cards**: blue-ghost, im-2-athena (or a Nova-C program card with both flights — decide on
   the existing `im-1-odysseus` pattern), peregrine, resilience (or keep the `hakuto-r` program card),
   plus F11's Vega, Vega C, Spectrum, Miura 1 and an ICEYE constellation card.
3. **Moon sites** for the five that reached the surface (LROC coordinates), with site stories.
4. **Lander models**: Hakuto-R (M1/M2), Blue Ghost; reuse Nova-C for IM-1/IM-2 in the descent scene.
5. **Descent profiles** (one per landing attempt, the Beresheet failure pattern for the crashes):
   - Hakuto-R M1: hover at ~5 km after the altimeter was rejected, fuel out, free fall (impact speed
     and time not found: estimated from the fall from ~5 km).
   - ispace M2: last telemetry at 192 m, too fast (151 vs 187 km/h in the sources: conflict noted).
   - Blue Ghost M1: powered descent 08:22 UTC, engine off 08:32, RCS to ~1 m/s, touchdown 08:34 UTC
     (NSSDCA 08:45 conflicts), upright, within 100 m.
   - IM-1: NASA TM-20250010290 timeline; first contact 23:23:45 UTC at ~7.8 m/s, -44.5° path angle
     (the briefing's 6 mph / 2 mph conflict noted), leg broke, ~30° tilt.
   - IM-2: touchdown ~17:30 UTC, on its side in a 20 m crater; touchdown speed unverified.
6. **Images**: public domain only (LROC, NASA, SCALPSS); company photos link out.
7. **Gates**: science-reviewer on every mission and card, the i18n manifest, validate-data,
   frame audit on the new descents (desktop and phone), the full unit suite.

## Decided (operator 2026-11-25, "1 yes. 2 yes")

- Group 5 of the 0.9.12 order, ahead of W13 + W14.
- Unflown European launchers (RFA One, Miura 5, Maia, Zephyr) get fleet cards now, marked in development.

## Progress (2026-11-26)

- **Done, committed:** mission pages (5), fleet cards (blue-ghost, im-2-athena, peregrine; hakuto-r covers
  both ispace flights), descents (5), models (Hakuto-R, Blue Ghost, Nova-C detail, Peregrine), Moon sites
  with /moon markers and site stories (5), 14 locales throughout; science-reviewer pass on F10 with its
  fixes applied (Beresheet's ~950 m/s is the horizontal speed at last contact; ispace M2 timing unified;
  a mislabelled helicopter photo removed from the IM-1 story). Model credits regenerated.
- **F11 committed:** Vega, Vega C, Miura 1, RFA One, Maia, Latitude (PLANNED for the unflown three; the
  schema has no development status). Science review running.
- **Operator decision needed:** Isar Spectrum (no free photo, only logos), HyImpulse SR75 (only an SL1
  artist impression) and ICEYE (only renders) need either an `artistic_impressions` waiver in
  `static/data/license-waivers.json` (operator reviewer + date) or another hero rule. Held back.
- **Not done:** /colophon entries and thumbnails for the Hakuto-R, Blue Ghost and Peregrine models
  (`scripts/build-original-work.mjs` + `capture-colophon-thumbs.ts` + 14-locale `original-work` text);
  frame audit of the new descents on a phone profile.
