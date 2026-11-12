# UXD-016 — Compact nav controls and one More menu

- **Status**: accepted
- **Date**: 2026-11-12 (proposed and decided)
- **Decider**: the operator, 2026-11-12 — "A6 — compact bar + More menu (High contrast, Share, Debug); nav
  height 52 px in one token; 32 px toggles on fine pointers, 44 on touch" ("A3–A6 answers",
  `docs/wip/2026-11-11-ux-feedback-plan.md`); the hamburger break stays at 1219 px in A6 ("A4–A6 open
  items", answer 5a, same file), lowered later after a 14-locale measurement (deferred list L2)
- **Answers**: N1; slice A6; closes UXS-000 SC-1 (nav height) and the nav z-index mismatch
- **Changes**: `src/lib/components/Nav.svelte`, `src/lib/components/LocalePicker.svelte` (trigger sizing and
  look), `src/lib/styles/tokens.css` (`--nav-bar-height`, `--nav-height`, `--nav-btn-fine`,
  `--nav-btn-touch`), the literal tops and `var(--nav-height, NNpx)` fallbacks that disagreed with the
  token; [IA §shell-regions](../IA.md); Design System §4.1 / §5.1 (`docs/concept/05_Design_System.md`);
  AGENTS.md (Nav block); `docs/adr/TA.md` nav paragraph; `src/lib/components/README.md`

## Context

The eight right-hand controls were 44 × 44 on every pointer (a `width: 32px` lost to `min-width: 44px`),
14 px apart: a 392 px cluster beside links about 27 px tall, in a 60 px bar that IA, AGENTS and the Design
System called 52 px (`--nav-bar-height: 60px`, and `--nav-height` re-typed the literal `60px`, so editing
the first did nothing). High contrast, Share and Debug sat in the primary chrome for every visitor.

## Options

A. A compact bar plus one More menu. B. High contrast, Debug and Share inside the Settings sheet. C. Compact
sizing only, all controls kept. For the height: 52 px everywhere, 48 / 56 by pointer, or keep 60 px and fix
the docs.

## Decision

Option A. Bar, left to right: audio tour, locale, science lens, settings, More (the hamburger on its own
breakpoints). The More button is a WAI-ARIA menu button; its panel holds High contrast and Debug overlays
(`menuitemcheckbox`) and Share this view (`menuitem`). The panel renders outside the `<nav>`, so the bar's
roving arrows never reach its rows. The switch rows keep the menu open so the flip is visible; Share
closes it. On phones (≤ 600 px) there is no More button: the same three actions are drawer rows, rendered
from the same list.

Sizes: 32 × 32 on a fine primary pointer (`(hover: hover) and (pointer: fine)`), 44 × 44 otherwise, both
axes (`--nav-btn-fine`, `--nav-btn-touch`); gap 6 px fine, 4 px touch, 2 px on phones; the locale chip is
32 high with a 40 px minimum width. The look is the A4 chip's ([UXD-014](UXD-014-one-chip-and-filter.md)):
outline at rest, soft accent fill + accent edge + white glyph when on, hover lifts a control at rest only,
focus ring `--color-focus`; one `.nav-btn` base replaces the five copied rule blocks. The lens gold and the
debug orange stay as semantic state colours.

Height: one 52 px bar from one token (`--nav-bar-height: 52px`; `--nav-height` is that plus the safe-area
inset). The literal tops and fallbacks that disagreed follow the token. The nav is `z-index: 40`.

The hamburger break stays at 1219 px: the old measurement (ru 1210 px, 2026-11-04) was made with the
392 px cluster; the per-locale measurement in `tests/e2e/nav-controls.spec.ts` reports the new widths and the
break is lowered in a later step the operator approves (L2).

Defaults taken without asking: the TV layout also shows the More button (the menu is arrow and OK operable
and the old classes for the three controls are gone, so a second bar rendering would need them back); no new
Umami events; Share behaviour unchanged (no "link copied" notice); no new locale key (the trigger reuses
`layout_footer_more`, the rows reuse `nav_high_contrast_aria`, `nav_share`, `nav_debug_group_aria`).

## Consequences

The cluster is about 192 px instead of 392 px on a fine pointer; contrast, share and debug are two clicks
and have visible labels and states (a check mark and `aria-checked`, no English On / Off); every
`--nav-height` consumer sits 8 px higher; the sticky launches month header, which already assumed 52 px, is
now flush with the bar. Every nav class kept its name, so no spec selector changed; the Share button, the
Aa button and the debug toggle are gone from the bar.

## Verification

`A6-CHECK violations: 0` (the brief's check, `docs/wip/2026-11-12-slice-A6-brief.md` §11);
`tests/e2e/nav-controls.spec.ts` (fine and coarse sizes and gaps, the one bar height, the menu keyboard
flow, the unchanged roving toolbar, axe on the open menu, the phone drawer, the per-locale width report);
the A4 sweep in `tests/e2e/chip.spec.ts` allow-lists the new classes. Not checked yet: the screenshots
of the brief's section 9 and a run of the specs in a browser.
