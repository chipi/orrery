# Black-hole lensing frame cost on software GL (plan L52)

Status 2026-11-15: measured, then decided and shipped on `tech-debt/0.9.9` (operator: "Fix + 0.75 scale on medium"):
see "After the fix" below. The sections above it are the measurement and options as they stood before the fix.
Plan row: `docs/wip/2026-11-11-ux-feedback-plan.md` L52 (docker-e2e fix `4a4dd507914` left the cost).

## What was measured

The `/explore?bh=sagittarius-a-star` takeover (`enterBlackHole` in `src/lib/three/explore-scene-host.ts`,
`createBlackHoleScene` in `src/lib/universe/black-hole-scene.ts`): one full-screen ray-march quad, drawn
straight through the shared renderer (`renderer.render(bhScene.scene, bhScene.camera)`, no composer).
The cost is steps per pixel times pixels: `stepsForTier` gives minimal and low 155, medium 185, high 220,
cinematic 260; the buffer is `min(devicePixelRatio, tier.pixelRatioCap)` (minimal 0.75, low 1.0, medium
1.25, high 2.0), so at the headless device pixel ratio of 1 the buffer is 0.75 for minimal and 1.0 for the rest.

Method: Chromium headless on software GL, 1280x800, device pixel ratio 1, tier set through
`localStorage` `orrery.qualityTier`, `taskset -c 0,1` (two CPUs, like the docker e2e), frame time is
`requestAnimationFrame` deltas for 30 s after the panel is visible (`bh-measure.mjs`). The "after" is a
prototype with no source change: the served `explore-scene-host.ts` is patched in the browser (route
interception) so the takeover sets `renderer.setPixelRatio(ratio * scale)` before `setSize`; the existing
resize path already feeds `renderer.getPixelRatio()` to the shader's `uRes`. The page keeps the full-size
canvas box, so the browser stretches the smaller buffer.

| Tier | Scale | Buffer | Steps | Median frame | Range | Frames |
| --- | --- | --- | --- | --- | --- | --- |
| minimal | 1.0 | 960x561 | 155 | 2167 ms | 2067 to 2483 | 14 |
| minimal | 0.75 | 720x420 | 155 | 1683 ms | 1183 to 1933 | 19 |
| minimal | 0.5 | 480x280 | 155 | 550 ms | 517 to 650 | 54 |
| low | 1.0 | 1280x748 | 155 | 4050 ms | 3917 to 4417 | 8 |
| medium | 1.0 | 1280x748 | 185 | 6283 ms | 5766 to 6367 | 5 |
| medium | 0.75 | 960x561 | 185 | 2567 ms | 2450 to 2700 | 12 |
| medium | 0.5 | 640x374 | 185 | 1633 ms | 1150 to 1800 | 20 |
| high | 1.0 | 1280x748 | 220 | 5367 ms | 5066 to 5833 | 6 |

Same page unpinned (32 CPUs, minimal, scale 1.0): median 617 ms over 38 frames (367 to 1467).

Read with care:

- The machine was shared: other agents ran browsers and builds during every run. The 0.75 rows climb inside a
  run (minimal 1183 to 1933 ms) and `high` (220 steps) came out faster than `medium` (185 steps), which
  steps alone cannot explain. Treat each number as 20 to 30 % noise; the order of magnitude is the finding.
- The e2e comment in `tests/e2e/universe-panels.spec.ts` records 4.2 to 4.6 s per frame in docker with 2
  CPUs; the pinned medium run here is 6.3 s on a loaded host, the same size, not the same number.
- Half the scale gave 3.9x (minimal) and 3.8x (medium), as pixel count predicts; 0.75 gave 1.3x and 2.4x.
- No real GPU, phone, Firefox or WebKit was timed.

## Stills

In `/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/infra/`
(whole page, 1280x800, same hole, same moment of the animation to within the disk's rotation):

- medium before: `bh-medium-1.png`; after at 0.5: `bh-medium-0.5.png`; at 0.75: `bh-medium-0.75.png`
- minimal before: `bh-minimal-1.png`; after at 0.5: `bh-minimal-0.5.png`; at 0.75: `bh-minimal-0.75.png`
- low before: `bh-low-1.png`; high before: `bh-high-1.png`

Medium at 0.5: the ring and the disk edges are stair-stepped, the thin photon-ring detail inside the
shadow is gone, the starfield smears keep their shape. At 0.75 the edges are softer than the full-size
frame but the structure is the same. The HTML panel and the chip are not affected.

## A second finding the stills show: minimal and low do not draw the hole

`bh-minimal-1.png`, `bh-minimal-0.5.png` and `bh-low-1.png` are the same picture: a blurred disk band and
a few lensed smears, with no shadow and no photon ring. They look the same at 0.75 and at 0.375 of the
pixels, so resolution is not what is missing. `stepsForTier` returns 155 for both tiers, and the loop in the
shader advances `dt = 0.18` per step (155 x 0.18 = 27.9 units) while its own comment puts the camera about 30
units out ("the floor can't drop below ~150 or rays never arrive"); medium (185 x 0.18 = 33.3) draws the
hole. I did not read the camera distance out of the shader or run a 170-step render, so the cause is the
arithmetic plus the stills, not a proven one. The comment on the `default` branch says minimal uses a static
fallback; `enterBlackHole` passes `quality.tier` straight in and does not branch on it.

This matters for the decision below: the saving at minimal comes from a frame that does not show the hole.

## Options

1. Leave it. Medium and high keep the full-size frame (about 5 to 6 s per frame on 2 CPUs software GL; the frame time on a real GPU
   was not measured). The e2e keeps its 20 s poll.
2. Render the takeover at a fraction of the tier's pixel ratio on minimal and medium (scale 0.5, about 4x
   cheaper here). About six lines: a `lensScale` in `QualityConfig`, `renderer.setPixelRatio(ratio * scale)`
   in `enterBlackHole`, restore in `exitBlackHole`. The look changes at the edges as in the stills. Needs the
   restore tested (the prototype never left the takeover) and a unit test on the config.
3. Scale 0.75 on medium only (about 2.4x cheaper here): closest to today's look, still 2.5 s per frame on
   software GL, so the docker e2e still waits on frames.
4. Keep full size on a real GPU and cut only on software GL or on a measured slow frame: the existing
   `attachFrameMonitor` already measures a rolling frame time; lowering the scale on the first slow frames
   keeps the look on capable devices. Costs a visible resolution step the first seconds.
5. Fix the step floor first, whichever of 1 to 4 is chosen: make minimal and low draw the hole (steps at least
   185, or a larger `dt` for them, or the static fallback the comment describes). It changes what those two
   tiers show, so it is the operator's call too.

## After the fix (2026-11-15)

Cause, confirmed from the code, not only the arithmetic: the shader camera is `cam = (0, uCamY, -30)` with
`uCamY = 1 + min(4, inclination x 0.12)`, so 30.0 to 30.4 units from the hole; the horizon is `HORIZON = 1.0`;
the loop steps `dt = 0.18` per iteration and ends after `STEP_COUNT` iterations. 155 x 0.18 = 27.9 units: the
ray aimed at the hole has marched 27.9 of its 30.0 to 30.4 units when the loop ends, so it is still at r of
2.1 to 2.5 (before bending), never reaches `r < HORIZON`, `hor` stays false, and the unfinished ray is sampled as
sky. That is the blurred band with no shadow and no ring. 185 x 0.18 = 33.3 units clears it, which is why medium drew it. The "minimal uses a static fallback"
comment described a design that was never built: `enterBlackHole` passes `quality.tier` straight in, no design
document (RFC-032, TA.md, the PRDs, the UXS and UXD records) mentions a static fallback, and the claim lived only
in two code comments, now removed.

Fix: `stepsForTier` returns 185 for medium, low and minimal (high 220 and cinematic 260 unchanged), so every tier
marches `steps x BH_DT >= BH_CAMERA_DISTANCE + BH_REACH_PAST_HOLE` (33.3 >= 30.41 + 2.5; both constants are exported
from `black-hole-scene.ts`, `BH_DT` is also what the shader uses). A longer march to the disk's outer radius (camera
distance + 14 = 44.4 units, 247 steps) was rejected: a reference render with 260 uniform steps at minimal
(`v-ref.png` in the scratchpad `bh/`) draws the whole far disk as a wide haze over the top of the hole, not the ring
the approved look and the medium / high tiers show. A step size that grows with distance (155 steps, cheaper far
from the hole) was tried at minimal: growing from r = 4 or r = 8 gave the same haze as the reference, growing from
r = 14 kept the ring, but it is a second code path for no saving the scale does not already give, so it was dropped. Medium also renders the takeover at
`QualityConfig.lensScale` 0.75 (minimal, low, high and cinematic keep 1): `enterBlackHole` calls
`createLensRatioGuard(renderer).apply(quality.lensScale)` before the first `setSize`, `exitBlackHole` calls
`restore()`; the canvas box stays full-size, the browser stretches the smaller buffer.

Same method as above (`bh-measure.mjs`, 1280x800, device pixel ratio 1, `taskset -c 0,1`, 30 s of frames, shared
loaded machine, so 20 to 30 % noise):

| Tier | Before: steps, scale, buffer, median | After: steps, scale, buffer, median | Hole drawn |
| --- | --- | --- | --- |
| minimal | 155, 1.0, 960x561, 2167 ms (10 to 14 frames) | 185, 1.0, 960x561, 3233 ms (10 frames, 2600 to 3483) | before no, after yes |
| low | 155, 1.0, 1280x748, 4050 ms | 185, 1.0, 1280x748, 5467 ms (6 frames, 4517 to 5916) | before no, after yes |
| medium | 185, 1.0, 1280x748, 6283 ms | 185, 0.75, 960x561, 3400 ms (9 frames, 2700 to 3733) | yes, yes |
| high | 220, 1.0, 1280x748, 5367 ms | unchanged code path (220, 1.0); not re-measured, two runs ended with a screenshot timeout | yes, yes |

Read with care: minimal and low are slower by 49 % and 35 % because they now do what they were meant to (19 % more
steps, and a frame that has to resolve the hole); the numbers of the two runs came from a machine others were using.
Medium is 1.85x faster than before (the earlier prototype measured 2567 ms at 0.75 on a quieter machine). Minimal at
3.2 s per frame on software GL is the slow tier now; `lensScale` 0.75 for it is a one-value change in
`quality-tier.ts` if the operator wants it, not taken here.

Stills after the fix, in the scratchpad `bh/`: `after-minimal.png`, `after-low.png`, `after-medium.png`. All three
show the shadow, the photon ring and the lensed disk ring, matching `bh-medium-1.png` (the old medium frame).

## Not done / not verified

- The high tier was not re-measured or re-shot after the fix (its steps and scale did not change); two attempts
  ended in a screenshot timeout on the loaded machine.
- The restore on exit is covered by a unit test of the guard (`black-hole-lensing.test.ts`), not by an e2e that
  enters and leaves the takeover and reads the canvas size.
- Real GPU frame times, a phone viewport, Firefox and WebKit were not measured.
