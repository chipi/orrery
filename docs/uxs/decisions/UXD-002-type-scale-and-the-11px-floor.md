# UXD-002 — Type scale: an 11 px floor, labels at 60 %, upright leads, italic only for quotes and captions

- **Status**: accepted
- **Date**: 2026-11-11 (proposed and decided)
- **Decider**: the operator — Q2 answered 2026-11-11 (`docs/wip/2026-11-11-ux-feedback-plan.md`
  line 430, "Answers (2026-11-11)"); slice A1 brief `docs/wip/2026-11-11-slice-A1-brief.md` lines 6–9
- **Answers**: X1, P1, P2, CR1, LI1, G2, G5, Q2; slice A1 (type scale)
- **Changes**: `src/lib/styles/tokens.css` (type scale block); IA §shared-tokens (typography
  tokens); `docs/concept/05_Design_System.md` typography and panel rules; AGENTS.md "Design system"
  type block; UXS-002 to UXS-006, UXS-013, UXS-015 size and italic lines. *Rules to be updated to
  link here (UXS-000 §Next); A1 commits already rewrote most of the text.*

## Context

Operator list: "some text is too tiny; many panels start with a smaller italic font for no reason"
(X1); overview texts "too tiny and italic; they should not be italic or smaller than other texts"
(P1); labels "too small and barely readable" (P2). At the A1 baseline (`9dda8b6813f`) the A1 brief
counted 734 literal font sizes below 11 px (414 to change in 121 files), 99 `font-style: italic`
(82 to change) and 12 panel `.editorial` rules in Crimson italic 13–14 px at 60 % (brief lines 16–20).
`--size-label` was 10 px and unused.

## Options

Q2 asked: text floor 10 or 11 px? Lead text in Space Mono upright, as the Gallery does? Keep Crimson
italic only for quotes and captions? (plan line 405.)

## Decision

The operator's answer (plan line 430): **floor 11 px everywhere; labels 11 px at about 60 %; body
14 px; lead/overview 15–16 px upright in the body font; italic only for quotes and photo captions,
at 14 px or more.**

The numbers the code holds (`src/lib/styles/tokens.css`, read at `9fdf4cc4a6b`), which are the
binding values:

| Token                | Value                        | Role                                                         |
| -------------------- | ---------------------------- | ------------------------------------------------------------ |
| `--size-label`       | 11 px                        | the floor; labels, eyebrows                                  |
| `--color-text-label` | `rgba(255,255,255,0.6)`      | label colour (60 % white)                                    |
| `--size-meta`        | 12 px                        | meta text                                                    |
| `--size-body`        | 14 px                        | body text                                                    |
| `--size-lead`        | 16 px, **15 px at 600 px width and under** | panel overview and page lead, upright Space Mono |
| `--size-caption`     | 14 px                        | the only italic (Crimson Pro): real quotes and photo captions |

**Where the plan text differs from the tokens.** The plan says lead "15–16 px". The tokens say 16 px
with a phone override of 15 px (`@media (max-width: 600px)`), so the range is device-dependent, not
a free choice. The A1 brief wrote the same (`--size-lead: 16px` (15px on phones), brief line 13).
The slice's e2e asserts overview text at 15 px or more (brief line 37).

Also in the slice, from the A1 brief: dev-only tools are exempt; figure and illustration captions
keep italic at 14 px or more; inline `<em>` emphasis in essays is kept; the 2D UI canvases (`/plan`,
`SurfaceFlatPatch`, `surface-2d-map.ts`) are UI text and are in scope; 3D sprite labels are slice C2;
science charts and Lab canvases keep their own sizes (brief lines 22–28).

## Consequences

- Done in slice A1 (commits `7661b4242a7`, `5fa57c98522`, `16050434512`, `68e239c3831`,
  `3222209b859`): tokens, 414-line CSS pass, upright leads, the e2e below, 43 regenerated visual
  baselines. The slice is in review, not yet signed off by the operator.
- Panel overview text and page leads are upright Space Mono; Crimson Pro italic never carries data
  or an overview.
- The A1 brief records every allow-list entry, and AGENTS.md carries the canvas allow-list.

## Verification

`tests/e2e/type-floor.spec.ts` crawls every route in `scripts/site-routes.mjs` plus one open panel
per panel type: every visible text node at or above 11 px; label alpha at or above 0.58; overview
paragraph upright, Space Mono, at or above 15 px. Canvas and WebGL label textures hold no DOM text
and are not covered. Not verified by this document: that the spec passes today.
