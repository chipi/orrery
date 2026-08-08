# #258 — /explore scale picker (Solar System ↔ Local Group quick-jump)

*2026-08-08 · design note for the first of the four post-RFC-036 /explore v2 features.*

## What it is

A persistent quick-jump between the four nested scale shells the scene already
crosses via wheel/pinch — **Solar System → Stellar Neighbourhood → Milky Way →
Local Group**. Before this, the only way up the ladder was scrolling out step by
step, or a `?context=` URL; the breadcrumb only ever stepped **out one level**.
Now any shell is one click/tap from any other.

This is deliberately the **warm-up** of the four roadmap items (#258/#410/#259/#411):
RFC-036 already extracted the ladder into a pure controller + a scene host, so the
jump machinery existed — this feature is almost entirely UI over an existing seam.

## How it hangs on the RFC-036 seams

- **`scale-shell-controller.ts`** — `CTX_ORDER` gives the rung order and the type
  (`ShellId`); `planShellJump` is the OUT/IN walk the host already runs.
- **`explore-scene-host.ts` · `contextDeepLinkFn(shell)`** — the picker's only
  dependency. It climbs OUT (`crossOutTo*`) or IN (`crossInTo*`) N steps to reach
  the target shell. The `?context=` deep-link already drove it; the picker is a
  second caller.
- **`contextId` `$state`** (in `+page.svelte`) — the live shell, written by the
  crossing fns. The active rung mirrors it, so the highlight only moves once a
  crossing *completes* — the picker never lies about where you are.

## Design decisions

- **Form factor: vertical ladder rail** (Option A, chosen from a 3-way mock-gate).
  Local Group at top → Solar System at bottom, so "zoom out" reads as "up". It's
  also the natural precursor to #259's continuous slider (same rail → slider).
- **Responsive** (single component, CSS-driven, breakpoint 640 px):
  - **Desktop** — always-on rail, lower-right above the scale bar.
  - **Mobile** — collapses to one "Scale ▾" chip in empty scene space above the
    scale bar; tapping opens the ladder as a popover that **auto-closes on pick**,
    so it never fights the packed bottom control stack (scale bar / ruler-missions-
    controls / time bar). 44 px tap targets.
- **Sub-view guard** — shown only in a genuine shell context:
  `view === '3d' && !activeBlackHole && !activeDeepSky && contextId !== 'body-scene'`.
  `contextDeepLinkFn` knows only the four shells, not the full-screen takeovers
  (body-scene / black-hole / deep-sky), and 2D has no shells — so the ladder is
  hidden there. Mirrors how the breadcrumb already gates itself.
- **a11y** — arrow-key roving between rungs, Escape closes the mobile popover,
  `aria-current` on the active rung, `aria-expanded`/`aria-haspopup` on the mobile
  toggle, `prefers-reduced-motion` drops transitions.
- **One reactivity fix** — `contextDeepLinkFn` was a plain `let` (null until
  onMount wires it); promoted to `$state` so the picker's `disabled` gate flips
  when the scene is ready instead of latching disabled forever.

## i18n

Rung labels reuse the existing `explore_ctx_*` keys — **no new label strings**.
Two new keys for the control chrome (`explore_scale_jump_aria`,
`explore_scale_change`), translated across all 13 non-en-US locales via
`scripts/translate-v07-ui.mjs --keys=…`.

## Files

- `src/lib/components/ExploreScalePicker.svelte` — the component (rail + popover).
- `src/routes/explore/+page.svelte` — import, guarded mount, `ShellId` type import,
  `contextDeepLinkFn` → `$state`.
- `messages/*.json` — 2 new keys × 14 locales.
- `tests/e2e/explore-scale-picker.spec.ts` — jump out/in + hidden-in-2D/black-hole,
  both `desktop-chromium` + `mobile-chromium`.

## Explicitly out of scope

- No new transition/fade work — jumps reuse the existing crossing animation.
- No scale-tier *content* changes (that's #410 message-objects).
- No continuous log-scale slider (that's the #259 `/cosmos` route).

## Verified

- **e2e green on both projects** — `tests/e2e/explore-scale-picker.spec.ts`,
  `4 passed` on `desktop-chromium` + `mobile-chromium` (jump out to Local Group +
  back in to Solar System; hidden in 2D + black-hole `?bh=`). This is the real
  gate — the host bridge is `any`-typed, so typecheck can't catch a mis-wire.
- **svelte-check** 0 errors on the changed files.
- Live-verified against the dev server: desktop rail, multi-step jump, mobile
  popover open/pick/auto-close, and the sub-view hide.

## NOT verified

- Only 2 of the 3 sub-view guard conditions were exercised live/e2e (2D toggle +
  black-hole `?bh=`); deep-sky and body-scene share the same boolean conjuncts in
  the same expression but were not individually triggered.
- Full `preflight` (typecheck → lint → test → validate-data → build) + the
  coverage gate: [run at end of Slice 4].
