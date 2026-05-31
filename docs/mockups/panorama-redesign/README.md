# Panorama redesign — visual anchor mockups

8 PNG frames at 1920×1080 showing the proposed Tier-3 panorama redesign for issue [#286](https://github.com/chipi/orrery/issues/286) / PRD-022 / ADR-074.

Each frame is a Playwright-rendered HTML page that composites the existing 4096×2048 equirectangular panorama JPEG (cropped to a typical ~60° FOV slice) as background, then overlays schematic SVG of the proposed UI: caption box, compass rose, annotation pins, "this region not photographed" microcopy, cycler arrows for multi-pano sites, cross-link footer.

Backgrounds use `static/images/hotspots/<body>/<site>/tier3-pan.jpg` directly — the panorama itself is the visual anchor; the SVG drawn on top shows what the **new** UI brings to that same view.

## Frame inventory

| # | File | Site | Agency | Demonstrates |
|---|---|---|---|---|
| 01 | `01-apollo11.png` | Apollo 11 | NASA | Caption + compass + annotation pins (LM Eagle, U.S. flag, Buzz shadow) + cross-link |
| 02 | `02-apollo17.png` | Apollo 17 | NASA | South Massif + Camelot Crater annotations + LRV pin |
| 03 | `03-curiosity-with-cycler.png` | Curiosity | NASA | Multi-pano cycler ("Sol 3573 · 4 panoramas at this site") + Vera Rubin / Mt. Sharp / drill-site annotations |
| 04 | `04-perseverance.png` | Perseverance | NASA | Ingenuity / sample tubes / Jezero rim annotations + audio cross-link |
| 05 | `05-change4.png` | Chang'e 4 | CNSA | First-lunar-farside framing + Yutu-2 / Von Kármán crater annotations |
| 06 | `06-chandrayaan3.png` | Chandrayaan-3 | ISRO | First-south-pole framing + Pragyan rover annotation |
| 07 | `07-mars3-honest-artifact.png` | Mars 3 | USSR | **Honest synthetic-artifact treatment** — most of the "panorama" is synthetic fill honouring the 14.5 s historical fragment |
| 08 | `08-perseverance-look-up-synthetic.png` | Perseverance | NASA | **Free-pitch honesty** — camera pitched up past +15° fires synthetic-region microcopy |

## Regenerate

```sh
node scripts/mockups/render-panorama-redesign.mjs
```

Outputs the 8 frames into this directory. Idempotent — temp `_bg_*.jpg` and `_*.html` files are cleaned up automatically.

## Design decisions visible in the mockups

- **Caption box bottom-left** — sol/date/instrument header, body caption, credit footer; agency-coloured left border.
- **Compass rose top-right** — circular, N/E/S/W marks, agency-gold N-arrow rotating with yaw (frame 7 shows the arrow at 0° as a baseline).
- **Annotation pins** — blue agency-tinted circle + downward triangle + label box. Click target (in implementation) is the pin glyph; label box is hover/tap state.
- **Cycler arrows + counter** — only visible when `panorama_set.length > 1` (frame 3). Counter format: `<current label> · N panoramas at this site`.
- **Cross-link footer** — slim bottom-right strip of agency-styled link chips. Hints: `↗` for navigation, `♪` for audio episode.
- **Synthetic-region microcopy** — dashed-border centred banner. Fires when camera pitches into a declared synthetic region (frame 7 = entire view synthetic; frame 8 = looking up past Mastcam-Z's +15° coverage).
- **Exit button top-left** — `RETURN TO ORBIT · ESC` strip, slightly more affordance than the current Tier-3 implementation (today it's button-only with no kbd shortcut hint).

## What the mockups are NOT

- **Not pixel-perfect** — agency colours, exact spacing, font weights will be polished in Phase 2.
- **Not a contract for source-image quality** — Phase 1 may re-source higher-res panoramas where available (Curiosity, Perseverance especially). Current backgrounds are the 4 K assets in repo today.
- **Not annotation curation** — the annotation labels in these frames are illustrative ("Vera Rubin Ridge", "Ingenuity helicopter"). Phase 4 curates the real per-site annotation lists.
- **Not the full feature list** — fullscreen + deep-link share + auto-tour (Phase 3) aren't visualised here.

## Source

Script: `scripts/mockups/render-panorama-redesign.mjs`
PRD: [PRD-022](../../prd/PRD-022.md)
ADR: [ADR-074](../../adr/ADR-074.md)
Issue: [#286](https://github.com/chipi/orrery/issues/286)
