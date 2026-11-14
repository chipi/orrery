# UXD-007 — A site panorama opens facing the real photo, not the generated fill

- **Status**: accepted
- **Date**: 2026-11-11 (the operator's point and clarification, then the go)
- **Decider**: the operator raised the point (W6, `docs/wip/2026-11-11-ux-feedback-plan.md` line 271:
  "Stand here" must always show an image) and clarified it from the screen (line 452: the view opens
  facing the generated fill and "the operator has to rotate to find the real photo"). The fix described below is the lead's resolution (plan lines 452–455). The operator, 2026-11-11 (session go after the UXD check), recorded in `docs/wip/2026-11-11-ux-feedback-plan.md`, line starting "- Operator go, 2026-11-11 (session" (line 460): the fixes for W6, SN2, G5/G6 and O6 "are accepted as decided".
- **Answers**: W6; slice D2 (panel order for sites and orbiters)
- **Changes**: UXS-006 and the surface spec set (no panorama section exists yet; see UXS-000 §Next);
  ADR-074 (panorama schema and renderer) is the architecture record, not changed.

## Context

A panorama can be partial: a real photo over part of the sphere, and a generated fill that pads the
rest. Inside "Stand here" the view opens facing the generated fill, so the visitor sees graphics and
has to rotate to find the real photo (plan lines 271 and 452).

## Options

The sources record one fix and no alternatives.

## Decision

The panorama **opens facing the centre of the real photo region**: a per-site initial heading
derived from the panorama's photo span, on **every site that has a panorama**.

## Consequences

- Slice D2 adds the per-site initial heading and an e2e asserting the initial view centre is inside
  the photo span (plan line 455). The same slice puts a photo first on every site panel and gives
  orbiters a "Details" tab (plan line 362).
- Applies to every body with panoramas, not only the sites the operator looked at
  ([UXD-011](UXD-011-decisions-apply-project-wide.md)).

- Slice D2 found the heading already built (v0.9.5, `entry_yaw_deg`) and did not add one; "a photo
  first on every site" was already true for the Moon and Mars (the hero is the first gallery image;
  [UXD-034](UXD-034-worlds-orbiter-detail-tab-and-panorama-opening.md)).

## Verification

Written in slice D2 ([UXD-034](UXD-034-worlds-orbiter-detail-tab-and-panorama-opening.md)):
`src/lib/panorama-entry.data.test.ts` checks every partial panorama's opening yaw against its
`panorama_metadata.photo_span_deg`, and `tests/e2e/panorama-entry.spec.ts` reads the camera yaw the
user gets (the compass rose's `data-yaw`) on the 18 partial panoramas, on desktop-chromium,
mobile-chromium and mobile-landscape-chromium. The audit of the 30 is in UXD-034: one site (Insight)
opened badly and was fixed, and a fly-in still running when "Stand here" was pressed overwrote the
opening view on three sites until `enterPanorama` ended it.
