# NASA reference anchors — surface-hotspots v2 redesign

**Context:** the secondary-deliverable inspiration anchor for Issue [#283](https://github.com/chipi/orrery/issues/283). Originally lived at `/tmp/orrery-mockups-nasa/REFERENCE.md` for the Slice 0 visual-preview review, but `/tmp` doesn't persist across reboots. Re-homed under `docs/reference/` so the file survives.

The 12 photoshopped mockup frames are at [`docs/mockups/surface-redesign/`](../mockups/surface-redesign/README) — those are the primary design contract. This file is the *why behind the design language*, anchored in two NASA reference families.

## Two distinct reference families NASA gets right

### A. Image-extent rectangles — Perseverance location map (Mars)

**Source:** https://science.nasa.gov/mission/mars-2020-perseverance/location-map/

The base map is a low/mid-res orbital mosaic. Higher-resolution HiRISE swaths sit on top as **rectangular tiles bounded exactly by their actual image footprint**. The rectangle shape *is* the data — HiRISE strips are physical instruments and rectangular by nature.

Decisions taken from this:

- **Rectangle = honest image footprint** (replaces the v0.6/v0.7 circular `Tier 2` disc that encoded nothing geometric).
- **Hard edges between layers are acceptable** when the edge is meaningful — outside the rectangle = lower-res, inside = higher-res. No fade, no curvature illusion. Compare with the legacy dark CTX disc which felt like a sticker because the shape didn't mean anything.
- **Pins inside the rectangle** for waypoint events (sample tubes, drill sites) — tear-drop shape, agency-tinted, separate primitive from the imagery.
- **Traverse polyline** as a continuous bold line, distinct from waypoint pins.
- **Scale bar always visible** bottom-left, in km/miles. Lat/lon readout bottom-right.

→ Implementation: Frames 04 / 05 / 10 / 11 of the mockup set (flat-patch with HUD) + `SurfaceFlatPatch.svelte` per ADR-062.

### B. Region-of-interest rectangles — Lunar South Pole moonbase plan

**Source:** various NASA / JPL Artemis briefings (search "NASA Artemis III candidate landing region map" or the Shackleton Connecting Ridge graphic — public domain).

The map shows several named areas — **Peak Near Shackleton Rim A**, **Connecting Ridge**, **Haworth**, **Malapert Massif** — each as a **translucent cyan quad** with a label outside it. The rectangles are *semantic regions of interest*, not image footprints. They can overlap, they're named, they're conceptual.

Decisions taken from this:

- **Rectangle = named region** (replaces the legacy point + circle radius pattern).
- **Translucent fill + crisp border** signals "this area is interesting" without occluding terrain.
- **Label sits outside the rectangle** with a clean connector or just proximity — not inside the shape.
- **Multiple regions visible at once** without occlusion problems, because they don't carry heavy iconography.

→ Implementation: Frames 01 / 07 of the mockup set (planet-wide overview with multiple regions) + the `region_bounds` schema field per ADR-061.

## What we deliberately do that NASA doesn't

| | NASA's approach | Orrery's choice | Rationale |
|---|---|---|---|
| Sphere ↔ flat | Flat 2D throughout | Sphere wide-zoom, flat patch at deep zoom (ADR-062) | Sphere preserves "you're looking at a planet" context at wide zoom; flat patch unlocks true-scale at deep zoom |
| Engineering 3D models | None on the map | Rendered at Tier 1; hidden once Tier-2 region is the active representation | Lets users explore the hardware silhouettes at mid-zoom; hides them at deep zoom where they'd compete with the imagery |
| Marker scale | Same screen size at all zooms | True-world-scale floor (rover ~3 m, lander ~5 m) above a minimum-clickable threshold (4 px) | Develops a felt sense for how small the hardware is on the surface |
| Upsample warning | Accepts zoom-past-resolution as blur | Subtle vignette + microcopy "approaching native pixel limit" | Users don't read the blur as "the planet is fuzzy" |

## Re-pull commands (if literal annotated composites are wanted later)

```sh
# Perseverance — 4 zoom levels (URLs approximate; check current location-map page)
curl -L -o /tmp/orrery-mockups-nasa/nasa-perseverance-z1.png \
  "https://mars.nasa.gov/system/resources/detail_files/...png"

# Lunar South Pole moonbase plan
curl -L -o /tmp/orrery-mockups-nasa/nasa-shackleton-ridge.png \
  "https://www.nasa.gov/wp-content/uploads/2024/.../candidate-landing-regions.png"
```

Then annotate via the same Playwright/SVG pattern as the primary mockups (`scripts/mockups/render-surface-mockups.mjs`) — drop the NASA PNG as the background, overlay the Orrery-side mapping ("our equivalent is Frame 04") in a corner.

For Slice 0 the primary 12 frames + this written reference were sufficient. Re-pull if a future redesign needs literal NASA composites.
