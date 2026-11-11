# UXD-012 — One page shell: container, title, lead and section label for every text page

- **Status**: accepted
- **Date**: 2026-11-11 (proposed and decided)
- **Decider**: the operator — "I agree with all recommendations to 1-6" on the six slice A2
  questions (`docs/wip/2026-11-11-ux-feedback-plan.md`, line starting "- A2 page shell
  (operator 2026-11-11"); inputs RP1 ("All pages share one style, vibe and standard approach. For
  fonts, Gallery is the best so far"), CR1, LI1, G1, G2, G5
- **Answers**: RP1, CR1, LI1, G1, G2, G5; slice A2
- **Changes**: `src/lib/styles/page-shell.css` (new, loaded by `app.css`); `tokens.css`
  `--size-title`; [IA §page-shell](../IA.md); Design System §3.2, §3.3, §4.6, §5.8
  (`docs/concept/05_Design_System.md`); AGENTS.md "Design system" block; `docs/adr/TA.md` type-scale
  paragraph; `src/lib/components/README.md`

## Context

Before A2, 27 files drew 32 text pages with ten h1 sizes (28 px to 72 px), seven lead sizes
(14–20 px), ten container widths (720–1400 px), centred headers on two pages and three pages
(`/gallery`, `/patches`, `/sourcing`) that added the nav height on top of the sticky nav, so their
title started about 64 px lower than everywhere else. Full inventory: `docs/wip/2026-11-11-slice-A2-brief.md` §1.

## Options

1. One CSS file of shared classes, values from Gallery (the operator's reference) and the design
   system. 2. A `PageShell.svelte` component (rewrites the markup of 27 files and their test
   hooks). 3. Keep per-page CSS and add a test only.

## Decision

Option 1. `.page-shell` 1080 px, centred, 24 px top, 20 px sides, 80 px bottom; `--reading`
760 px; `--wide` 1400 px; `--inset` inside the science host layout. `.page-title` Bebas Neue
`clamp(40px, 8vw, 64px)`, 1 px spacing. `.page-lead` `--size-lead` upright Space Mono, 78 % white,
64ch. `.page-section-label` Space Mono 11 px 700 uppercase 3 px spacing 60 % white (Q1: replaces the
12 px `#7fb0e0` labels). `.page-section-title` Bebas 28 px. No page adds `--nav-height`. The six
answers: (1) design-system section label; (2) the gallery strip text starts on the title's left
edge, the strip a band with square left corners; (3) program pages move from Crimson to Space Mono,
long-form essay and science prose keeps upright Crimson; (4) missions, launches and fleet stay tools
with no visible title; (5) the standard text white replaces the bluish `#dde4ff` / `#dfe6f2`; (6)
the four hubs widen to 1080 px.

Not on the shell: the home page (home slice, H8), scene routes, the Lab, the browse tools, card
stubs, dev pages. Kept exceptions in the code carry `a2-keep: <why>` (strip card titles, the
lightbox title, essay prose headings, privacy card titles, the programs toolbar hint, the TV hub
layout, link colours that slice A3 owns).

## Consequences

The pages lose their private h1, lead and container rules. Visible changes: entity pages
(missions, fleet, sites, bodies, Lab formulas) get the Bebas title instead of a Space Mono one;
deep-sky and posters headers are left-aligned instead of centred; the science glossary, reading and
watch lists lose the gold title and teal section headings for white ones; colophon, credits,
library and the hubs change title size. No text or locale change.

## Verification

`tests/e2e/page-shell.spec.ts` (every shell page: root under the nav with 24 px, h1 family, size and
spacing, lead family, size and upright, title on the content edge, the G1 strip edge, home not on
the shell), run on desktop-chromium, mobile-chromium and mobile-landscape-chromium. The slice check
script (`A2-CHECK`, brief §10) prints `A2-CHECK violations: 0`.
