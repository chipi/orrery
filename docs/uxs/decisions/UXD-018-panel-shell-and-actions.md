# UXD-018 — Panel shell: header bar, Share, and one action row

- **Status**: accepted
- **Date**: 2026-11-12 (proposed and decided)
- **Decider**: the operator, 2026-11-12 — Q3 (rename the collector card to "Share"), Q6 (one slim fixed
  header bar), "a holistic solution across Explore, Worlds and landers", and the answers D1 to D4 and
  O1 to O8 of `docs/wip/2026-11-12-slice-B1-brief.md` §0a and §11, all approved as recommended
- **Answers**: P3, P4, P5, EP4, MI4; slice B1
- **Changes**: `src/lib/components/Panel.svelte` (the bar), `PanelActions.svelte` (new),
  `src/lib/styles/panel-tabs.css` (hero), the seven action-carrying panels (`PlanetPanel`,
  `SatellitePanel`, `SmallBodyPanel`, `MissionPanel`, `FleetEntryPanel`, `EarthObjectPanel`, the
  site panel in `SurfaceScene`); Design System §5.3; [UXS-001](../UXS-001.md) detail panel tabs;
  [IA §controls](../IA.md); `docs/adr/TA.md` Collectible cards; [PRD-036](../../prd/PRD-036.md);
  `src/lib/components/README.md`, `src/lib/cards/README.md`; [UXD-014](UXD-014-one-chip-and-filter.md)
  (panel CTAs leave its allow-list); messages (7 keys added, 3 removed)

## Context

The panel's close × floated above the scroll container with no background, so text passed under it
(P4). Actions sat in stacks of full-width bars at the foot of every tab: three on Earth and Mars
(about 207 px), three on a mission, one for the collector card on seven panels (EP4, MI4, P5). The hero
image drew an accent border and a ring on hover (P3). Evidence: the brief's §2.

## Options

- **Close**: let it scroll away with the content, or a slim fixed bar (chosen).
- **Share**: a bare share-link action with no card, or the renamed card overlay (chosen; the bare link
  would have removed `CollectibleCard` from the UI, orphaned the `card-open` analytics and changed
  `collectible-cards.spec.ts`).
- **Actions**: the foot stack, one row under the identity block (chosen), or a row inside Overview only.
- **Look**: the A4 chip only (chosen), or a filled primary variant for the first chip (rejected: a
  second look that A4 removed, and a clash with the soft-fill "on" state).

## Decision

1. **A fixed bar** between the dock and the scroll container on every panel: back (only after a card
   link), the entity name once the hero has scrolled out, **Share** (only when the entity has a
   collectible card), close. All chips (30 px on a fine pointer, 44 px on touch), so the bar is 38 px
   or 44 px. Nothing scrolls under it. Swipe-down closes only from the bar or while the list is at
   the top.
2. **One action row** (`PanelActions`) under the identity block and above the hero, on every tab: at
   most three chips, order in-scene, then view, then simulate, then plan. The A4 chip, kind `action`
   or `link`, no primary variant. Absent when the panel has no entity action.
3. **Inline** in content: references and reading links (Vehicle / Payload / Mission cards, Launches
   from here, "See path on /explore", learn links). **Nothing at the foot.**
4. **Hero**: no hover glow; the pointer is the cue. Keyboard focus draws an inset 2 px
   `--color-focus` ring.
5. **Share opens the card overlay** ("Share card", "Share link" inside). The nav More menu's "Share this
   view" ([UXD-016](UXD-016-compact-nav-and-more-menu.md)) shares the current URL: panel Share is this
   entity (card and OG stub), nav Share is this view.
6. Labels are short: `Plan mission`, `Explore surface`, `Share`, and four surface-link strings for a
   mission's cross link, hand-written in 14 locales.

## Consequences

Every panel gains 38 px (desktop) or 44 px (touch) of bar and loses 69 to 207 px at the foot; a panel
with an action row also gains the row's height above the hero. The chip sweep in `chip.spec.ts` no
longer allow-lists `.panel-close`, `.panel-back` or `.cta-card`. The solid blues of Plan and Fly go. The
Vehicle / Payload / Mission cards keep their private navy blues (palette review). A hero's hover look is
gone on touch too.

## Verification

`tests/e2e/panel-shell.spec.ts`, the `chip.spec.ts` sweep, and the slice's check script
(`docs/wip/2026-11-12-slice-B1-brief.md` §12).
