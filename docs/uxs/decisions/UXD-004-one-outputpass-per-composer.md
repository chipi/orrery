# UXD-004 — One OutputPass per composer; colour textures sRGB, data maps linear

- **Status**: accepted. The Fly Mars descent look is accepted "for now" after the second pass (plan line 460).
- **Date**: 2026-11-11 (proposed and decided)
- **Decider**: the operator — "Surface colour pipeline (OutputPass) → now, 0.9.9 (operator
  2026-11-11). Extended to every composer + sRGB tagging of all colour textures"
  (`docs/wip/2026-11-11-0.9.9-plan.md` line 46); "operator decision: one OutputPass per composer"
  (`docs/wip/2026-11-11-ux-feedback-plan.md` lines 456–458); brief
  `docs/wip/2026-11-11-slice-output-step-brief.md` line 3 ("Operator: /iss and /tiangong get the
  OutputPass; the rule is project-wide")
- **Answers**: E2 and FY1 (scenes too dark) in part; slice "output-step"
- **Changes**: `docs/adr/TA.md` §composer pipeline and colour (line 371);
  `src/lib/three/README.md` (colour pipeline); `docs/guides/fly-cinematic-shot-language.md`,
  `fly-cinematic-gap-analysis.md`; AGENTS.md "Performance — 3D scene discipline".

## Context

Composer render targets are linear. The renderer's `toneMapping` and `outputColorSpace` apply only
when drawing to the canvas, so a scene rendered through an `EffectComposer` without a final
OutputPass showed linear values (darker, more contrasty) and ignored its ACES setting, while
direct-render tiers showed ACES plus sRGB (output brief lines 5–10). The surface composer was fixed
first (commit `8e9a7c8d1d9`: `#889fe7` read as rgb 63,88,204 and now reads 136,156,228,
`docs/wip/2026-11-09-0.9.9-redesign.md`). The output brief found six more composer chains without
the pass: `/iss` and `/tiangong`, `/explore` solar, Milky Way and Local Group, `/fly` helio, and
`/fly` launch, coast and descent (brief lines 12–22).

## Options

The sources record the extension to every composer as the operator's decision and do not list
alternatives. Not recorded: any option to keep a composer without the pass.

## Decision

Every `EffectComposer` chain **ends in one OutputPass** (after vignette, film and bokeh), which
applies the renderer's tone mapping, exposure and sRGB once. Colour textures (albedo, emissive,
sprite and label art) are tagged **`SRGBColorSpace`**; data maps (masks, height, normal and other
non-colour data) stay linear and say so with an explicit **`NoColorSpace`**. Hex `Color` constants
are already sRGB-aware.

**Status of the look.** The rule is accepted. After the before/after sheets the operator said "I
agree we should fix washed out look on launches and descents" (operator 2026-11-11,
`docs/wip/2026-11-11-ux-feedback-plan.md` line 459). That line records a second pass in the same
slice (atmosphere shell, sky gradient, ambient light, launch exposure) and says "descent contrast
still under review". The operator then accepted the descent after the second pass "for now" (contrast can be
revisited later; operator go, 2026-11-11, plan line 460). Operator context from the brief: Explore (E2) and Fly 2D (FY1) were already
"too dark", so a lighter result is welcome, tuned so glow and bloom do not blow out (brief lines
43–44).

## Consequences

- Constants tuned against linear output (exposure, lights, emissives, bloom, vignette, film) are
  re-checked per scene; the brief lists them (lines 35–42).
- Before/after screenshots per scene are the look check; the operator approves.
- Rules out adding a composer without the pass, and a colour texture without a colour space.

## Verification

`src/lib/three/output-step-rule.test.ts`: every `new EffectComposer(` file also contains
`new OutputPass(`, both `createOutlinePassSetup({` users pass `outputPass: true`, and texture
creations carry a `colorSpace` within a window (the brief's checks A to C, lines 58–63). No visual
baseline covers a 3D canvas. Not verified by this document: that the test passes today.
