# IM-1: Falcon 9's return to Landing Zone 1, sourced figures (2026-11-24)

The figures behind IM-1's full-frame booster return on /fly (`booster-return-scene.ts`, the
landing-zone branch; UXD-052). Re-written on 2026-11-24 from the committed profile and the scene's
header: the agent's original note was not committed with the scene.

## Sourced

| Figure | Value | Where it lives | Source |
|---|---|---|---|
| Entry burn | T+6:11 to T+6:22 (371-382 s) | `falcon-9.json` → `landings["im-1"]` `entryBurnS` / `entryBurnEndS` | [Space Launch Schedule, Falcon 9 Block 5, Nova-C IM-1](https://www.spacelaunchschedule.com/launch/falcon-9-block-5-nova-c-im-1/) (aggregator citing The Space Devs' launch timeline) |
| Landing burn | T+7:17 (437 s) | `landingBurnS` | same |
| Touchdown on LZ-1 | T+7:34 (454 s) | `touchdownS`; `timeClass: "sourced"` | same |
| LZ-1 pad | 86 m (282 ft) concrete circle with a stylised X, on the former LC-13, Cape Canaveral SFS | `showcase/landing-zone-1.ts` | [Wikipedia, Landing Zone 1](https://en.wikipedia.org/wiki/Landing_Zone_1) |

## Estimates (marked ESTIMATE in the scene header)

- One centre Merlin for the landing burn, as on the drone-ship landings.
- The coastline 2.5 km east of the pad, the scrub ground around it.
- The entry-burn altitudes over the short 11 s burn; the camera work.

## Not verified

- The aggregator's times against SpaceX's own webcast timeline for IM-1 (launch 2024-02-15 06:05 UTC):
  not cross-checked frame by frame.
