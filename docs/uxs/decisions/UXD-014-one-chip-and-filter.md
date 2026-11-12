# UXD-014 — One chip and one filter for every toggle, filter, choice and HUD action

- **Status**: accepted
- **Date**: 2026-11-12 (proposed and decided)
- **Decider**: the operator, 2026-11-12 — chip option A on the prototype sheets, decisions D1 to D8, and
  the answers O1 to O3 (`docs/wip/2026-11-11-ux-feedback-plan.md`, lines "A4 chips", "A4/A5
  follow-up", "A3–A6 answers", "A5 last two", "A4–A6 open items"). Inputs: C1, C3, G3, PG1, MI1, FL1,
  E8, ISS1
- **Answers**: C1, C3, G3, PG1, MI1, FL1, E8, ISS1; slice A4
- **Changes**: `src/lib/styles/chip.css` (new, loaded by `app.css`), `src/lib/components/Chip.svelte`,
  `ChipGroup.svelte`, `ResetViewButton.svelte`; [IA §controls](../IA.md); Design System §5.7 and §5.7a
  (`docs/concept/05_Design_System.md`); AGENTS.md "Design system" block; `docs/adr/TA.md`;
  `src/lib/components/README.md`; `src/lib/surface-scene/README.md`

## Context

At `6c6925ccd5d` 17 recipes (and 18 HUD action looks that the 2026-11-12 runtime crawl added) drew
chips, pills, toggles and filter buttons: 8 heights (21–44 px), 7 radii, 8 active looks, 3 ARIA
patterns for one job, a 44 px chip on desktop pointers, oval chips that were the only oval things in
the UI, a FILTERS bar with the count at the far end, 4 looks of Reset view and a plain-text
Watch-live link. Full inventory: `docs/wip/2026-11-12-slice-A4-brief.md` §1.

## Options

1. One CSS file (`.ui-chip`) plus a thin `Chip` component (markup and ARIA contract), values from the
   tokens. 2. CSS only, as the page shell. 3. A component only, each page keeps its own CSS.

## Decision

Option 1. 30 px on fine pointers, 44 px on coarse pointers, 11 px uppercase text, 4 px radius,
outline at rest, one active look (soft accent fill, `--color-accent` edge, white text; the world
tint replaces the accent on /moon, /mars and /venus only, Earth keeps the accent), hover
`--color-state`, focus `--color-focus`. Four kinds: toggle (`aria-pressed`), choice (`role="radio"`
in a radiogroup with arrow keys), action, link. A count badge and a data-tone dot. The compact
FILTERS strip has the count right after the label (one key, `filters_eyebrow`, uppercase by CSS,
`launches_filters_label` removed). Every HUD action button, Reset view, Watch live, the programs
group-by, the `/fly` toggles, play and speed chips, the `/plan` mission-type pills and the INDEX /
MODULES / TIMELINE pull tabs use the same chip. Worlds HUD actions are the outline at rest and take
the world tint when on or hovered. Small controls that are not chips (Why?, provenance, timeline
names, credits summary, fleet cross-references) get a 24 px minimum hit area (`.ui-hit`) with no
visual change. Allow-list: tabs, status and label pills, cards, CTAs, Lab, nav, home, the `/fly`
scene CTAs and `fly-mtab`.

The per-world tint rule (requested 2026-06-17, re-confirmed 2026-11-12): the Worlds set
`--chip-tint` from the route's `bodyTintCss`; `.ui-chip` reads `var(--chip-tint, var(--color-accent))`
for the edge and soft fill. `--chip-tone` is the other hook: a data colour per chip (fleet status,
epoch band, nation, live), never set by a page.

## Consequences

About 80 private rules and 120 markup lines go; 16 or more visual baselines change; one message key
is removed in 14 locales; MI3 (mission colour) builds on `--chip-tone`, A5 (flat row, no groups) on
`.ui-chip`. Pages must not define their own chip, pill or toggle rules (kept exceptions carry
`a4-keep: <why>`); scoped rules would beat the global one, so the old rules were deleted, not
overridden.

## Verification

`tests/e2e/chip.spec.ts` on three projects; `src/lib/components/Chip.test.ts`; the A4 check prints
`A4-CHECK violations: 0`.
