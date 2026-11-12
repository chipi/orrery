# UXD-018 — Panel shell: header, Share, and one action row

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

1. **A fixed bar** (replaced by the B1.1 amendment below: one header, no separate bar row) between the dock and the scroll container on every panel: back (only after a card
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

## Amendment 2026-11-12 — B1.1, one-row header

- **Decider**: the operator, after seeing B1 on screen. Slice B1.1 (after C3, before B2).
- **Why**: the 38 / 44 px bar cost a row on top of the identity block, and the name appeared in the bar only after the hero scrolled out.
- **Decision**: decision 1 above is replaced. There is **no separate bar row**. One fixed header holds the eyebrow line (the kind line) with the actions, back (only after a card link), Share (only with a card) and close, right-aligned on the **same line** (left in RTL); the entity name is on the **next line at full panel width**, so a long name wraps under the actions instead of being squeezed beside them. The header stays fixed while the content scrolls, so the name is always visible and the scroll-reveal of the name in the bar is removed. Chip sizes stay A4 (30 px fine pointer, 44 px touch), so the first line is as tall as the chip. Swipe-down still closes from the header or at the top of the list. Everything else (action row, hero, Share) is unchanged.
- **Mechanism**: `Panel.svelte` takes `eyebrow` and `heading` snippets and lays them out in a two-column grid (eyebrow and actions on row 1, the heading across both columns on row 2); the 24 panels on the shell pass their kind line and name through them and keep key stats in the scrolling content. The actions come first in the DOM, so the keyboard reaches back, Share and close before the eyebrow's own chips; Escape and `covered` behave as before.
- **No eyebrow**: a panel without a kind line (none of the 24 today; a place panel passes its city) leaves row 1 to the actions, the name still on row 2.
- **Consequences**: a long name makes the fixed header taller (not capped); stats stay in the scrolling content. Design System §5.3, UXS-001, IA and the module READMEs describe the one header.
- **Verification**: `tests/e2e/panel-shell.spec.ts` ("one-row header (B1.1)": a planet, a mission and a deep-sky panel; actions on the eyebrow's line, name below, long name wraps under, header does not scroll).

## Amendment 2026-11-12 — header sizes (operator, from lander screenshots)

- **Why**: the × read tiny beside SHARE, the status chip (FLOWN, ACTIVE) was 2 px bigger than the agency badge, and the eyebrow sat 4 px above the actions' centre line.
- **Decision**: the agency badge and the status chip have the same outer size (the badge takes the status chip's 1 px border, in its own colour); the close chip is a square as tall as Share (30 px fine pointer, 44 px touch) with the × drawn at 18 / 22 px; badges, status, Share and × sit on one centre line. The close chip is one style everywhere a small chip closes something: the panel, the INDEX and the surface index (`.ui-chip--close` in `chip.css`). The operator then extended it to every close (2026-11-12): dialogs, overlays, drawers and banners use the same chip (list in UXD-014); each keeps only its own placement.
- **Verification**: `tests/e2e/panel-shell.spec.ts` ("header sizes"): badge and status the same height, × square and as tall as Share, all on one centre line (±1 px), on a mission and a lander panel.

## Verification

`tests/e2e/panel-shell.spec.ts`, the `chip.spec.ts` sweep, and the slice's check script
(`docs/wip/2026-11-12-slice-B1-brief.md` §12).
