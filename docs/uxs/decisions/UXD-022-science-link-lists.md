# UXD-022 — Science links: at most five per panel, curated per body, ranked per mission

- **Status**: accepted
- **Date**: 2026-11-12 (proposed and decided)
- **Decider**: the operator, 2026-11-12 — S1, S2 and O6 of `docs/wip/2026-11-11-ux-feedback-plan.md`
  (lines 61–62, 177, 445–450), UXD-010, and Q1 to Q10 of `docs/wip/2026-11-12-slice-B2-brief.md` §9, all
  "approved as recommended" (the brief's line "Operator, 2026-11-12: all open questions of §9 (Q1–Q10)
  approved as recommended"). The number: the brief's draft was written as UXD-015; that number
  went to [UXD-015](UXD-015-flat-chip-row.md) in the meantime, so this record is UXD-022.
- **Answers**: S1, S2, O6; slice B2
- **Changes**: AGENTS.md (stack table, `/science` cross-screen chips row); `docs/adr/TA.md` (the `?`-chip
  paragraph); [UXS-001](../UXS-001.md) detail panel tabs; [UXS-014](../UXS-014.md) (the ruler paragraph
  UXD-010 said was missing); Design System §5.3; [IA §shell-regions](../IA.md);
  `src/lib/components/README.md`; `scripts/README.md`; [UXD-010](UXD-010-ruler-regimes-each-get-their-own-science-card.md)
  (its Verification)

## Context

At `34019040ba8` 102 of 289 panels showed more than five science links (mission panels up to 21, every
station module the same 11), three planet sections sat on 6 of 8 planet panels, 15 small-body and
satellite panels repeated another's list, four ruler panes repeated a card inside their ruler, and the
three per-type default lists (`PLANET_`, `SUN_`, `SMALL_BODY_SCIENCE_SECTIONS`, 21 entries) were dead
fallbacks that would have broken the cap had a body ever lacked a list. 108 Serbian list entries pointed
at section ids that do not exist (fixed in `54975ed8d2d` before B2 started; B2 adds the guard).

## Options

1. A cap in one shared helper, curated lists per body, a ranked pick per mission class, a data test.
2. A cap only (slice the first five): the same five sections on every panel of a type.
3. Hand-curate every panel: 126 mission lists of science content, which S1 ("need not be complete")
   does not ask for.

## Decision

Option 1. `pickScienceLinks` (`src/lib/science-links.ts`) is the one place the cap lives: every list of
`/science` destinations in a panel (counted per distinct destination, at most five) runs through it, the
panels and the `/explore/<id>` entity pages alike. There is no per-type default list: a body without a
curated list shows no science block. Lists are curated per body (the locale overlays' `science_sections`),
per station module and Earth object (a `science` array of `tab/section` slugs in the base file) and
ranked per mission (`rankMissionScience`: the defining phase the flight data has, a pinned history
article where the mission has one, then the mission class's list, at most three per tab, from
language-neutral facts only: destination, crewed, year, and which `flight` fields exist; never the
translated `type`). Each ruler regime has its own best card and none repeats inside one ruler; across
the four rulers a concept may repeat where the physics is the same. The `tab`/`section` pair is
identical in all 14 locales; only `why` is translated. Not counted: inline `ScienceChip`s per field
(ADR-036), single contextual links (the ISS 1957 milestone, the station banner's two links), the
Science Lens panel, outbound library links (`LearnLink`).

"No two panels of one type with the same list" is strict for bodies (planets, moons, small bodies,
belts) and rulers, and for missions, modules and Earth objects the largest group of identical lists is
at most a quarter of the family (126 missions: 31; 22 modules: 5; 31 Earth objects: 7). Fleet engines and
suits are excluded: every engine illustrates the same two primers.

## Consequences

- One helper, one test file, a mission class table (`MISSION_SCIENCE_CLASSES`) that doubles as inbound
  links for the orphan detector, 20 message keys removed (`chip_label_*` of the module and Earth-object
  lists and the banner, `station_banner_eva_link`, `belt_science_cta`), one rewritten (`mp_science_blurb`).
- The Belt panel's raw-path CTA is gone (it linked the same article as its first card).
- Module and Earth-object lists became `ScienceCard expanded={false}` (title and intro), not one-line
  links; the station banner keeps two links.
- Planets lost entries where a section sat on more than half of them; the four Trojan `why` lines (Eurybates,
  Polymele, Leucus, Orus) moved to `orbits/lagrange-points`, where they read true; Orus's `why` called it a
  C-type, it is a D-type (the science review caught it; fixed in 14 locales).
- Per-mission pins carry what only some missions earn: the sky crane (Curiosity, Perseverance), the ion drive
  (Dawn, Psyche, Hayabusa), the Oberth effect (Parker, Solar Orbiter), Lucy's Trojans, the history articles of
  Apollo 11 and Sputnik 1. `mp_science_blurb` reads "Concepts worth knowing for {name}" (not "five": a list can
  hold four).
- The family-share threshold (25 %) is a tuning knob in the test.

## Verification

`src/lib/science-links.test.ts` (cap over all 289 panels' data, real sections, body variety, rulers,
family share, locale parity, reach), `src/lib/science-orphan-detector.test.ts` (module, Earth-object and
body lists count as inbound links), `tests/e2e/science-links-cap.spec.ts` on three projects, and
`node scripts/check-science-links.mjs`, which prints `B2-CHECK violations: 0`.
