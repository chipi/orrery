# Mobile audit (2026-11-23, iPhone 13 emulation, dev server)

Screens: 8 explore scales (scene, INDEX, panel) + 21 pages. Tools (temporary, not committed):
`scripts/mobile-audit.tmp.mjs`, `scripts/pinch-probe.tmp.mjs`.

## Zoom on landing sites (operator report: "too fast, hard to zoom on landing details")

1. **Pinch scales distance from the planet's centre, not altitude** (`SurfaceScene.svelte:3552`,
   `camRTarget * (pinchPrev / d)`, planet radius 30). Measured on `/mars?site=perseverance`: one
   100 → 120 px finger spread took camR 37.0 → 30.83 (altitude 7.0 → 0.83, 8.4× closer); the second
   spread hit 30.085 and opened the flat patch. The regional/detail image layers fade in over camR
   bands a single gesture jumps across. Fix: scale altitude, `R + (camRTarget - R) * pinchPrev / d`
   (the same spread would go 7.0 → 5.8).
2. **The flat patch has no touch input** (`SurfaceFlatPatch.svelte:944-951`: mouse + wheel only,
   CSS `touch-action: none`). On a phone the landing detail view can't be panned or pinched, and
   pinch-out does not return to the globe; only the "back to planet" button does. Fix: pointer
   pinch/pan as in `PanelLightbox.svelte:163-196`, with pinch-out past the entry exiting like wheel-out.
3. The wheel path has the same centre-relative shape (`0.05 * (camR/100)^1.8` per deltaY): about
   60 % of the altitude per notch at camR 31. Not reported; desktop only.

## Layout

- Site panel on `/mars?site=…` covers the full screen; "Share" wraps onto its own row.
- Surface toolbars (`/earth`, `/mars`, `/moon`): "Sky" wraps alone onto a second row.
- Explore: the "Zoom in or out through the 8 scales" hint sits over the scene's top labels on every
  scale; on the solar-system scale the (i) popover is open on load and covers the hint.
- Explore INDEX: names truncate hard at 390 px ("Sagittarius Dwa…", "Satel…") because the subtitle
  column takes the space.
- Explore panel: from INDEX the panel covers only the lower two thirds with the dimmed index above
  (milky-way … cosmic-web); Canopus (neighborhood) opens full screen. Inconsistent.
- Laniakea and cosmic-web scenes: the cluster glows are overexposed white blobs that hide the
  selection ring.
- `/missions`: "Next launches" fills the first screen; search starts below it.
- `/explore/stars/sirius`: spectral-class eyebrow truncated to "A0m…".

## Clean

No horizontal overflow and no console errors on any explore scale or page. Fleet, mission, moon and
mars detail pages lay out correctly.

## Not covered

- The solar-system INDEX and panel: the first INDEX tap closed the (i) popover; the script fix
  (Escape first) has not been re-run.
- Panel end-of-scroll shots; landscape; real devices (emulation only, CDP touch events).
- `/explore/galaxies/andromeda` 404 is my guessed URL, not a site link.
- `/` and `/fly` errored during the first load (`ERR_NETWORK_CHANGED`, dev reload); `/fly` returns
  200 on re-check, but neither was re-screenshotted.
- Moon sites: same code path as Mars, not probed separately.

## TODO (later): close-up imagery gaps along the traverses

Operator 2026-11-23: "the route goes outside the area where we got the better images". Share of
each drive inside a route detail tile, walked along the line in 20 m steps
(`scripts/route-coverage.tmp.mjs`, to keep as a proper check when this starts):

| Rover | Tiles | Route | Inside a tile | Gaps |
| --- | --- | --- | --- | --- |
| Opportunity | 25 (512 / 1024 m, 0.25 / 0.5 m/px) | 43.7 km | 51 % | whole stretches, e.g. sols 371–536, 765–848, 1695–1795, 2133–2215, 3356–3502, 3684–3832, 4630–5076 |
| Perseverance | 62 (512 m, 0.25 m/px) | 45.3 km | 93 % | corners between km tiles; sol 1940 (~30 vertices) |
| Curiosity | 54 (512 m, 0.25 m/px) | 36.4 km | 92 % | not itemised yet |
| Spirit, Zhurong, Apollo 16, Apollo 17 | — | — | 100 % | — |

Next step when picked up: plan more HiRISE cut-outs for the uncovered stretches through the
hotspot fetch pipeline (`scripts/hotspots/fetch-mars.ts`); asset-pipeline change, so a plan and
the operator's go first. Opportunity first, then Perseverance's corners and Curiosity.
