# UXD-015 — Layer chips are one flat horizontal row on Explore and every world, and the INDEX absorbs the A–Z

- **Status**: accepted
- **Date**: 2026-11-12 (proposed and decided)
- **Decider**: the operator, 2026-11-12 — flat row on every world, Earth's two master switches dropped
  ("A4/A5 follow-up", "A3–A6 answers", "A5 last two"), then ONE ORBITERS chip on Earth and OBSERVATORIES
  for the ground telescopes ("A4–A6 open items": "1 sync all orbiters to listen 1 chip, 2a, 3a, 4a,
  5a"), and "basically we absorb A–Z into index" ("L20 / L25 / L28 and the A–Z";
  `docs/wip/2026-11-11-ux-feedback-plan.md`). Inputs: C2, W7, plan Q5
- **Answers**: C2, W7; slice A5
- **Changes**: `src/lib/components/LayerChipRow.svelte`, `src/lib/surface-scene/SurfaceScene.svelte`,
  `SurfaceIndexPanel.svelte`, `src/lib/components/ExploreBodyIndex.svelte`, `EntityIndex.svelte`,
  `src/routes/explore/HudControls.svelte`, `src/routes/explore/+page.svelte` (ruler constants),
  `src/routes/{moon,mars,venus}/+page.svelte`; messages (two keys added, 15 removed, one renamed);
  `scripts/i18n-tools/native-terms.json` (`observatory`); [IA §controls](../IA.md); Design System §5.7
  (`docs/concept/05_Design_System.md`); AGENTS.md "Design system" block; `docs/adr/TA.md`;
  [ADR-096](../../adr/ADR-096.md) item 11; `src/lib/components/README.md`;
  `src/lib/surface-scene/README.md`

## Context

At `81e0d43c0dd` Earth showed its layers as a column of 10 items with two full-row headers
(ON EARTH / IN SPACE) that were master switches, reaching about 534 px down and into the orbit ruler on
short windows, with two chips both labelled TELESCOPES; Moon, Mars and Venus showed flat lists;
Explore had five inline chips. The four scene routes (/moon /mars /venus /explore) also carried a
floating A–Z tab beside the INDEX pull tab: two index affordances for the same objects.

## Options

1. Group every world (ON GROUND / IN SPACE). 2. Flatten Earth and every world. 3. Two stacked rows.
For the Earth row: keep four category chips under ORBITERS, or one ORBITERS chip like the other worlds.
For the A–Z: keep the tab, or put the links into the INDEX.

## Decision

Option 2: one flat horizontal row of chips on Explore and every world, from one component
(`LayerChipRow`), wrapping between chips where the width runs out; no captions, no groups, no master
switches, no greyed chip. Earth's row is SURFACE · AUTO, LAUNCHPADS, MUSEUMS, OBSERVATORIES, ORBITERS:
one ORBITERS chip switches every orbiter (stations, space telescopes, constellations, comsats and the
Moon orbiters), as on Moon, Mars and Venus; the four category chips and both masters are gone. The
ground telescopes chip is OBSERVATORIES (`observatory` is in the glossary first, 13 locales). The
chip look is [UXD-014](UXD-014-one-chip-and-filter.md).

The INDEX absorbs the A–Z. On /moon, /mars, /venus and /explore each INDEX row whose object has an
entity page also carries a real link to it, and the separate A–Z tab is removed. The INDEX panel is
always in the DOM (hidden while closed) and, before the sites load, is the plain list of every entity
page from the route's server load, so the prerendered HTML links every page of the hub
([ADR-096](../../adr/ADR-096.md) item 11 still holds). `/missions` and `/fleet` have no INDEX panel
and keep the A–Z at the page foot.

## Consequences

The layer block drops from about 420 px of column to 30–66 px of row; the chip-driven ruler shift and
the Explore ruler offsets (376 / 196 px) are deleted; the object-index panel starts under the measured
HUD bottom; Earth's sub-chips are independent toggles and the Moon orbiters on Earth ride the one
ORBITERS chip; Earth's per-category visibility state and `categoryDefaultVisible` are removed; the
worlds' HUD baselines regenerate once with A4. Explore's chip row is `LayerChipRow`, and its PATHS
chip carries `data-audio-stage` through the config `attrs`. The footer stays compact below 1450 px on
the four scene routes (it was set for the A–Z tab; whether /moon /mars /venus still need it is not
measured). Stars in the /explore neighbourhood index have no entity pages, so they carry no links.

## Verification

`tests/e2e/chip-row.spec.ts` (membership, order, no group or disabled chip, no column, one band),
`tests/e2e/index-links.spec.ts` (prerendered links to every entity page of each hub in en and de,
rows carry links, no floating A–Z) and `tests/e2e/footer-dock.spec.ts` (no two world HUD parts
intersect, INDEX panel closed and open) on three projects; `a5-check.py` prints
`A5-CHECK violations: 0`.
