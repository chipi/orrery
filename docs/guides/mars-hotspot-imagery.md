# Mars Surface Hotspot Imagery — operator + maintainer guide

The Mars `/mars` route renders each landing site through four progressive tiers as the camera zooms in:

| Tier | Source | Render | Scale |
|---|---|---|---|
| **0** | Vendored 2D silhouette | flat icon on the planet | overview (camR ≥ 60) |
| **1** | Vendored 3D lander/rover model | Three.js geometry | mid-zoom (camR ≈ 40-60) |
| **2a** | **Murray Lab CTX mosaic** (5 m/px) | wide disc, regional context | close-zoom (camR ≈ 35-50) |
| **2b** | **UAhirise HiRISE RDR** (25 cm/px) | smaller disc, detail centre | closest-zoom (camR ≤ 38) |
| **3** | NASA / CNSA equirectangular panorama (8 of 13 Mars sites) | inside-out skybox | "Stand at site" button |

This guide focuses on the **Tier 2 imagery pipeline** — the bit that downloads CTX + HiRISE rasters, crops them to a 2048×2048 patch around each lander's coordinates, and writes the per-site JPEGs that `/mars` actually displays.

The pipeline-overview (assets fetcher, variant generator, vision scoring) lives in [image-pipeline-v2.md](./image-pipeline-v2.md). The architectural decisions (why two layers, why polygonOffset hierarchy) live in [RFC-017](../rfc/RFC-017.md). **This guide is the operator + maintainer playbook**: what knobs exist, what each script does, how to audit the output, what to do when a fetch produces noise.

---

## Quick reference

| Want to … | Run |
|---|---|
| Fetch missing CTX + HiRISE for all Mars sites | `npm run images:hotspots -- --missing-only --dest mars` |
| Force-rebuild one site (e.g. broken crop) | delete `static/images/hotspots/mars/<site>/tier2-*.jpg` then `npm run images:hotspots -- --site <site>` |
| Fetch only one layer | add `--layer hirise` or `--layer ctx` |
| Audit all 13 sites visually | see [Validation runbook](#validation-runbook) |
| Diagnose a single crop | `node_modules/.bin/tsx scripts/_hirise-diag.ts <productId> <lat> <lon>` |

---

## Two-layer composition

A Mars Tier 2 patch is two co-located discs, rendered in the same `tier2Group`:

```
                 ┌──────────────────────────┐
                 │   CTX regional           │   1.5u, ~12 km of ground at 5 m/px
                 │   (Murray Lab mosaic)    │
                 │                          │
                 │   ┌──────────────────┐   │
                 │   │  HiRISE detail   │   │   1.0u, ~512 m of ground at 25 cm/px
                 │   │  (UAhirise RDR)  │   │
                 │   │                  │   │
                 │   │     ●  ←  green  │   │   patch centre pin (landing site)
                 │   └──────────────────┘   │
                 │                          │
                 └──────────────────────────┘
```

The HiRISE disc has stronger `polygonOffsetFactor` than the CTX disc, so it always wins the depth test → renders on top. Size hierarchy is purely editorial: at literal scale (1 world unit ≈ 113 km on Mars), a 512 m HiRISE patch would be invisible. We scale both up so the user can actually see them, and pick disc diameters such that the CTX provides a visible ring of context around the HiRISE detail.

Geometry constants live in `src/lib/hotspot-surface-patch.ts`:

```ts
const PATCH_DIAMETER_WORLD_UNITS = 1.0;          // HiRISE detail
const REGIONAL_PATCH_DIAMETER_WORLD_UNITS = 1.5; // CTX regional
```

---

## Per-site sidecar fields

The source of truth for each site's imagery is `static/data/surface-hotspots.json`, `entries[<site-id>]`:

```jsonc
{
  "hotspot_tier_max": 2,                                    // highest tier this site supports
  "hotspot_model": "curiosity-class",                       // Tier 1 3D builder key
  "hotspot_tier2_source": "/images/hotspots/mars/curiosity/tier2-hirise.jpg",
  "hotspot_tier2_regional_source": "/images/hotspots/mars/curiosity/tier2-ctx.jpg",
  "hotspot_tier2_force_product_id": "ESP_030313_1755",      // optional pin (see below)
  "location_uncertainty_m": 50,                              // for the ±N m chip
  "hotspot_annotations": []
}
```

The site's `lat` / `lon` come from `static/data/mars-sites.json` — keyed by the same `id`. The hotspot-imagery scripts read coords from there, not from the hotspots sidecar.

### Operator override pin

`hotspot_tier2_force_product_id` is the operator-override knob for HiRISE. When set, the fetch pipeline tries **only** that product and fails fast if it doesn't yield a clean crop. When unset, the pipeline falls through to the auto-picker — query `RDRCUMINDEX.TAB`, filter by corner-polygon point-in-polygon test, rank by composite score (closest centroid, lowest emission angle, etc.), and try up to `MAX_CANDIDATES_PER_SITE = 15` in rank order.

**When to pin:**
- You've manually researched UAhirise.org and found the canonical "image of the landing site" (often used for press releases — these are usually the prettiest).
- The auto-picker keeps picking products with funny lighting / shadows / mostly-empty swaths and you want to lock in a known-good one.

**When NOT to pin:**
- You don't have a strong opinion. Auto-pick + the strengthened fail-fast usually converges on a usable crop in ≤ 3 attempts.
- The pin you found "covers the site" only on UAhirise's text description — verify the product's WKT geo-transform actually places the site inside the swath. UAhirise text occasionally overstates coverage; the binary geo-transform never lies. (Use `scripts/_hirise-diag.ts` for this — see [Diagnostics](#diagnostics).)

For CTX there is no operator override — Murray Lab's V01 global mosaic is deterministic from (lat, lon) → tile, so a pin would just be redundant.

---

## HiRISE product naming convention

A HiRISE product ID has the shape `<phase>_<orbit>_<lat-code>`:

```
ESP_030313_1755
└─┘ └─────┘ └──┘
 │     │     └── lat-code: 1800 ± 10·lat_degrees
 │     └──────── orbit number (zero-padded to 6)
 └────────────── phase: PSP (Primary Science Phase, 2006-2010), ESP (Extended Science Phase, 2010+)
```

**Lat-code → latitude:**

| Hemisphere | Formula | Examples |
|---|---|---|
| Northern (positive lat) | `lat = (code - 1800) / 10` | 2485 → +68.5° (Phoenix area), 2280 → +48.0° (Viking 2 area) |
| Southern (negative lat) | `lat = (code - 1800) / 10` | 1755 → -4.5° (Curiosity area), 1345 → -45.5° (Mars 3 area) |

So you can sanity-check a pin by inspection: a Curiosity (-4.59° N) pin must end in `_1755` or close (`_1750`, `_1760`). A pin ending in `_2280` is for ~48°N — wrong site. **This catches the most common pin-error class without running any code.**

The full URL pattern (constructed by `hiriseProductIdToJP2Url` in `scripts/hotspots/hirise-catalog.ts`):

```
https://hirise-pds.lpl.arizona.edu/PDS/RDR/<phase>/ORB_<bucket>_<bucket+99>/<productId>/<productId>_RED.JP2
```

Where `bucket = floor(orbit / 100) * 100`. So `ESP_030313_1755` lives at `…/ORB_030300_030399/ESP_030313_1755/ESP_030313_1755_RED.JP2`.

---

## The crop pipeline — `scripts/hotspots/gdal-crop.ts`

`cropRemoteRasterToLatLon(input)` is the per-site crop primitive. Both `fetch-mars.ts` (HiRISE) and `fetch-mars-ctx.ts` (CTX) call it.

Pipeline stages:

1. **Cache the source.** Download the JP2 / GeoTIFF to `.image-cache/hotspots/raw/<sha256hash>.JP2`. Subsequent runs skip the download.
2. **Open with GDAL.** Read `srs` (spatial reference), `geoTransform` (affine 6-tuple).
3. **Project the target.** `(targetLat, targetLon)` → projected metres via `gdal.CoordinateTransformation`.
4. **Apply the HiRISE Equirectangular correction.** Only for `PROJECTION["Equirectangular"]` with non-zero `latitude_of_origin`. Skipped for other projections (see [Projection guard](#the-polar-stereographic-guard)).
5. **Map projected → pixel.** Standard affine inverse.
6. **Pre-crop fail-fast.** Read a 32×32 sample around the target pixel; if more than `PRE_CROP_NO_DATA_FRAC` of the (stretched-to-Uint8) sample is no-data, throw `NO_DATA_AT_TARGET`. Caller iterates to the next candidate.
7. **Main crop.** Read the full `cropSize × cropSize` window (default 2048), stretch UInt16 → UInt8 per [stretchToUint8](#the-uint16-to-uint8-stretch), write to a MEM dataset, JPEG-encode.
8. **Post-crop sanity.** If more than `POST_CROP_BLACK_FRAC` of the JPEG is black, throw `CROP_MOSTLY_BLACK`.

### The UInt16-to-UInt8 stretch

**Critical**: HiRISE bands are **UInt16** at the codec level. The crop output is **UInt8** JPEG. A naïve `new Uint8Array(uint16Buffer)` reinterprets the bytes — it does NOT scale them. The result interleaves the low byte (small, often < 5 — looks like no-data) with the high byte (the real signal) of each 16-bit pixel.

For Mars surface (bright, 16-bit values ~60k), the alternating-byte pattern visually rendered as **uniform mottled mid-gray noise** after the JPEG resampler smoothed it. For dim polar terrain (Phoenix), the low byte happened to contain the meaningful signal — it accidentally looked OK.

This bug shipped silently for months until the 2026-05-21 audit (see [Audit story](#audit-story)).

The fix is `stretchToUint8()` in `gdal-crop.ts`:

```ts
// 1. Build a 65536-bucket histogram of non-zero values
//    (zeros are no-data; including them would skew the stretch).
// 2. Find the 2nd and 98th percentile cut-points.
// 3. Linear map [p2, p98] → [0, 255], clamp outliers.
// 4. UInt8 inputs (LROC byte products) bypass the stretch.
```

The P2/P98 percentile range is more robust than min/max: a single saturated pixel near the rover doesn't compress the entire range. Mars surface 10-12-bit dynamic range maps cleanly into 8-bit JPEG space.

**Signs of regression** (the bug coming back): patches that look like uniform mottled mid-gray with no recognisable features. Always image-read the output, NOT just pixel statistics — stddev / mean can pass while the image is visually broken.

### The Polar-Stereographic guard

`correctHiriseProjection()` compensates for a HiRISE-specific GDAL behaviour: GDAL's WKT-to-PROJ translation applies the `latitude_of_origin` shift to Y but skips the corresponding `cos(lat_origin)` scaling on X. We manually apply both.

The correction is **specific to Equirectangular**. Other projections (Polar_Stereographic on Phoenix at 68°N, Stereographic_South for any south-pole sites) need NO correction — GDAL handles them correctly through `transformPoint` directly.

Pre-2026-05-21, the function applied unconditionally. For Polar Stereographic with `latitude_of_origin = 90°`:

```
xCorr = projX * cos(90°) = 0                    # 💥 zero
yCorr = projY + R * π/2 = projY + 5_303_800     # 💥 +5300 km off
```

→ pixel coordinates land wildly out of bounds → silent clamp to row 0 → reads pole nodata cap → 100% rejection on all 15 candidates → site permanently broken.

The fix is a projection-name guard:

```ts
const projMatch = wkt.match(/PROJECTION\["([^"]+)"\]/);
if (projMatch?.[1] !== 'Equirectangular') return { xCorr: projX, yCorr: projY };
```

This future-proofs polar Moon sites (Chandrayaan-3 at 69°S, future Artemis south-pole work) which also use Stereographic projections.

### Fail-fast thresholds

| Constant | Pre-2026-05-21 | Now | Rationale |
|---|---|---|---|
| `PRE_CROP_NO_DATA_FRAC` | 0.95 | **0.25** | Old value passed through 50% no-data swath-edge clips — they shipped as visible noise. 25% allows benign corner clipping (small footprint overlap with target) but forces auto-picker to fall through when the swath meaningfully misses the target. |
| `POST_CROP_BLACK_FRAC` | 0.8 | **0.4** | Old value passed through half-black crops which render as visible noise after gamma + JPEG. Belt-and-suspenders for the pre-crop check. |
| `MAX_CANDIDATES_PER_SITE` | 15 | 15 | Unchanged. 15 attempts per site is a reasonable upper bound on iteration cost before declaring a site uncovered. |

---

## CTX pipeline — `scripts/hotspots/fetch-mars-ctx.ts`

The CTX layer is conceptually simpler than HiRISE because Caltech's Murray Lab publishes a **global 5 m/px mosaic** — one tile per 4°×4° lat/lon grid cell — instead of per-orbit swaths. So there's no catalog query, no candidate ranking, no operator override. The script:

1. Compute the tile name from (lat, lon): `E<lon>_N<lat>` with 3-digit lon padding, 2-digit lat padding (`E132_N04`, `E-128_N68`, `E-008_N-04`).
2. Download `https://murray-lab.caltech.edu/CTX/V01/tiles/MurrayLab_GlobalCTXMosaic_V01_<tileName>.zip` if not in `.image-cache/ctx-mosaic/<tileName>/`.
3. Unzip → keep the `.tif` GeoTIFF, drop everything else.
4. Hand the local GeoTIFF path to `cropRemoteRasterToLatLon` for the actual crop.

CTX tiles are 8-bit (`Byte` GDAL datatype), so the `stretchToUint8` is a no-op. The byte-interleave bug never affected CTX outputs.

Tile sizes are 1-2 GB each. The cache is ~8 GB for the 13 tiles needed for the current Mars sites; if you add more sites, allow ~500 MB-2 GB per new tile (each tile may serve multiple nearby sites).

**Caltech TLS chain note**: Caltech serves the tile ZIPs from a cert chain that Node's bundled `fetch` doesn't fully validate. `ensureCtxMosaicTile()` shells out to `curl` for the download (curl uses the system trust store).

---

## Tier 3 pipeline — `scripts/hotspots/fetch-mars-panoramas.ts`

The Tier 3 layer is the "Stand at site" panorama — an equirectangular skybox the user enters from each landing site's detail panel. The skybox renderer (`src/lib/hotspot-tier3-skybox.ts`) is already in production on `/moon` for Apollo 11 + 17; the Mars side is **purely data + provenance**. The "Stand at site" button (`src/routes/mars/+page.svelte`) is conditional on `selected.hotspot_tier3_panorama` being set, so adding a panorama is just sidecar + JPEG, and omitting a site is just leaving the field unset.

### Coverage status (2026-05-21)

| Status | Sites | Notes |
|---|---|---|
| ✅ Shipped | curiosity, perseverance, spirit, opportunity, phoenix, insight, mars-pathfinder, viking2-lander | 8 NASA-PD panoramas via science.nasa.gov |
| ⏳ Follow-up | viking1-lander, zhurong | viking1 needs Wikimedia Commons fallback (no stable science.nasa.gov URL). zhurong needs a clean mirror for the CNSA navcam pano (CNSA-EDU allowlist tag already in place). |
| ❌ Omitted | mars3, beagle2, schiaparelli | No usable surface imagery exists — button absent (conditional render). |

### Per-site source URLs (the 8 shipped)

All from `assets.science.nasa.gov` — the canonical NASA imagery CDN that survived the 2023+ photojournal.jpl.nasa.gov → science.nasa.gov migration. PIA numbers are preserved in filenames.

| Site | PIA | Source size | Output size | Caption |
|---|---|---|---|---|
| curiosity | PIA24626 | 29163 × 7891 PNG, 291 MB | 472 KB | Mt Mercou, sol 3070 — Mastcam 360° |
| perseverance | PIA2464 | 36952 × 11570 JPEG | 490 KB | Jezero, sol 3 — Mastcam-Z first 360° |
| spirit | PIA16440 | 1240 × 351 JPEG | 396 KB | Winter Haven — McMurdo Pancam |
| opportunity | PIA22908 | 23123 × 5163 JPEG | 522 KB | Legacy Pan, final mission panorama |
| phoenix | PIA13804 | 2000 × 576 JPEG | 418 KB | First-weeks full-circle, polar plain |
| insight | PIA23136 | 6446 × 962 PNG | 277 KB | Homestead Hollow 290° arm-cam |
| mars-pathfinder | PIA01005 | 6283 × 1090 JPEG | 560 KB | Twin Peaks, IMP 360° colour (sols 8-10) |
| viking2-lander | PIA00568 | 626 × 512 JPEG | 332 KB | Utopia Planitia, first colour (1976) |

The PIA URL pattern that worked: `https://assets.science.nasa.gov/content/dam/science/psd/mars/downloadable_items/<N>/<NN>/<file>.jpg` for content-managed assets, or `…/deepzooms/<N>/<NN>/…` for very large panoramas (Perseverance is in deepzooms). The `assets.science.nasa.gov/dynamicimage/…` pattern works for Phoenix-class smaller resources.

**Source resolutions vary wildly** (626×512 for Viking 2 to 36952×11570 for Perseverance). Sharp's default 268 MP input limit is exceeded by Perseverance; the padder sets `limitInputPixels: false`. For low-res sources (Viking, Spirit, Phoenix), the output is upscaled — acceptable for skybox immersion but visually softer than the high-res sites.

### Cylindrical → equirectangular padding

NASA panoramas are typically **cylindrical** projections (360° horizontal, partial vertical — 50°-90° tall, the camera tilt range). The skybox expects **equirectangular 2:1-aspect** (360° × 180°, full sphere). The `panorama-padder.ts` helper bridges the formats:

```
output canvas (4096 × 2048):
  rows 0..topRow       → sky gradient (zenith → horizon)
  rows topRow..botRow  → source image, resized to (srcOutWidth × srcOutHeight)
  rows botRow..end     → regolith fill
```

`srcOutWidth = outWidth * (srcAzimuthDeg / 360)`. For 360° sources this is the full width; for partial-360 like Viking (342°) the remaining 18° band is filled with `palette.azimuthGap` colour.

`topRow / botRow` are derived from `srcElevationTopDeg` / `srcElevationBottomDeg`. Horizon line is row `outHeight / 2`.

### Sky / regolith colour palette

Mars sky is **NOT blue**. Default palette (`DEFAULT_MARS_PALETTE`):

```ts
skyHorizon:  rgb(200, 165, 130)  // warm tan at the horizon line
skyZenith:   rgb(120, 80, 55)    // deep salmon at zenith
regolith:    rgb(120, 70, 50)    // ground colour for the bottom pad
azimuthGap:  rgb(100, 75, 60)    // partial-360 azimuth gap fill
```

Per-site overrides supported via `palette` in the `MarsPanoramaConfig` entry. Viking 1 has a famously pinker sky tone than later missions; if/when its panorama ships, override `skyHorizon` accordingly.

### CNSA-EDU license tag

`scripts/license-allowlist.ts` has a `CNSA-EDU` entry covering CNSA imagery (Zhurong Mars, future Chang'e Moon under `#PC`). CNSA does not publish a formal CC license on `cnsa.gov.cn`; the entry documents standard educational fair-use with full attribution. Reused across Mars + Moon multi-agency expansions.

### Validation (Tier 3 specific)

After a fetch run, image-read each `tier3-pan.jpg`:

| ✅ Looks right | ❌ Symptoms of regression |
|---|---|
| Sky-coloured pad at top, regolith at bottom, source panorama in the middle band | Sky pad at top and bottom (elevation values swapped) |
| Horizon line ≈ middle row | Horizon at top or bottom edge (elevation values way off) |
| Source content cleanly transitions to pad colours | Hard black bars where source didn't reach output dimensions (source had its own frame margins — visible but acceptable) |
| Aspect ratio 2:1 (4096 × 2048) | Wrong aspect (likely `outWidth`/`outHeight` mismatch — fix the `padToEquirectangular` call) |

End-to-end: `/mars?site=<id>` → "Stand at site" button → panorama loads in skybox → drag rotates camera horizontally + tilts vertically → escape returns to orbital view.

### Pre-cropped variants ship as static assets

Tier 2 (HiRISE + CTX) and Tier 3 (panorama) base sources alone aren't enough — the Image Pipeline v2 manifest (`static/data/image-vision.json`) advertises pre-cropped `.1x1.jpg / .4x3.jpg / .16x9.jpg` variants alongside the base path, and the frontend's `pickVariant(...)` resolves to those URLs when present. **The variant files must be committed to git** alongside the base sources — they are not generated at build time and there's no fallback path that regenerates them on demand. A missing variant 404s in the dev server and renders as a blank disc on /mars (regression discovered post-#PD-mars, see commit `a918942a2`).

After running `npm run images:hotspots`, the orchestrator's auto-`images:score` step writes the variants next to each base source. Stage them with the rest of the hotspot delta:

```bash
git add 'static/images/hotspots/mars/*/tier2-hirise.{1x1,4x3,16x9}.jpg' \
        'static/images/hotspots/mars/*/tier2-ctx.{1x1,4x3,16x9}.jpg' \
        'static/images/hotspots/mars/*/tier3-pan.{1x1,4x3,16x9}.jpg'
```

`scripts/score-images.ts` lazy-loads the Anthropic provider so a re-crop-only pass (`--skip-scoring`, all entries cache-hit) does NOT require `ANTHROPIC_API_KEY`. The key is only needed when at least one entry needs a fresh score (new source, or source bytes changed → cache invalidated).

### Failure-mode matrix (Tier 3)

| Symptom | Cause | Fix |
|---|---|---|
| "Input image exceeds pixel limit" sharp error | Source > 268 MP; sharp's default | Confirm `limitInputPixels: false` is set on both `sharp(input.source, …)` calls in `panorama-padder.ts` |
| Downloaded "image" is actually HTML | URL doesn't return a raw image — either changed slug or a 404 → redirect to catalog | Find the correct `assets.science.nasa.gov/content/dam/...` URL via WebFetch on the science.nasa.gov resource page |
| Visible black bars in source band | NASA's source has its own frame margins (camera deck shadows, masking) | Accept — usually small. If unacceptable, crop the source before passing to padder. |
| Stretched horizon | `srcElevationTopDeg + srcElevationBottomDeg ≠` actual source elevation coverage | Verify against the source page's caption (usually states the vertical FOV) |

---

## Detail-panel galleries — paths A and B (v0.7.x #PE)

The `/mars` site detail-panel surfaces curated imagery through **two distinct tabs** with different shapes:

### Path A — the GALLERY tab (existing thumbnail strip)
A 5-image grid + lightbox. Pulled at runtime via `getMarsSiteGallery(siteId, missionId)` in `src/lib/data.ts`. The loader walks a 5-step fallback chain across three manifests so coverage holds even when the per-site override is absent:
1. `static/data/mars-site-galleries.json` (per-site override — currently empty)
2. `static/data/mission-galleries.json` by `mission_id`
3. `static/data/mission-galleries.json` by site id
4. `static/data/fleet-galleries.json` by `mission_id` — variant-aware (e.g. `tianwen1` → fleet `tianwen1`)
5. `static/data/fleet-galleries.json` by site id — variant-aware (`viking1-lander` → `viking1` → `viking-1`)

Variants handled by `gallerySiteIdVariants()`: strip `-lander|-orbiter|-rover` suffixes, insert a dash before trailing digits (`luna16` → `luna-16`), apply hand-curated alias map (`luna21` → `lunokhod-2`). Coverage today: **13/13 Mars hotspots have a working GALLERY tab.**

### Path B — the STORY tab (rich multi-agency narrative)
Distinct UI from GALLERY. Chapter-grouped (Hardware / Launch / Surface / Science / People — sites use whichever apply), per-image captions, agency-coloured badges (NASA blue, CNSA red, ESA navy, Roscosmos blue, ISRO saffron, JAXA navy, SpaceIL blue), full source/license resolved at render time from `image-provenance.json`.

Data: `static/data/site-stories/<siteId>.json`. Schema (see `SiteStory` in `src/lib/data.ts`):
```json
{
  "site": "curiosity",
  "intro": "…",
  "chapters": [
    {
      "id": "hardware",
      "title": "Hardware",
      "subtitle": "…",
      "images": [ { "src": "/images/missions/curiosity/01.jpg", "caption": "…" } ]
    }
  ]
}
```

Component: `src/lib/components/SiteStoryPanel.svelte`. Loader: `getSiteStory(id)` in `src/lib/data.ts`. Sites without a `.json` file simply don't render a STORY tab — graceful absence, no error.

**Auto-switch behaviour (/mars):** when the user zooms into Tier 2 and the info card appears, the panel auto-flips from OVERVIEW to STORY (only on the first Tier-2 promotion per site; doesn't override manual tab choices on re-zoom). Same surface, same component on `/moon`, but without the auto-switch since /moon doesn't run the Tier-2 info card flow.

Coverage today: **31/31 hotspot sites** have a STORY file authored (13 Mars + 18 Moon).

---

## Validation runbook

After any non-trivial change to `gdal-crop.ts`, `fetch-mars.ts`, `fetch-mars-ctx.ts`, or `ctx-mosaic.ts` — or after re-fetching all sites — run this validation pass.

### 1. File presence + size sanity

```bash
for d in static/images/hotspots/mars/*/; do
  site=$(basename "$d")
  ctx=$([ -f "$d/tier2-ctx.jpg" ] && echo "✅" || echo "❌")
  hir=$([ -f "$d/tier2-hirise.jpg" ] && echo "✅" || echo "❌")
  printf "%-22s ctx=%s hirise=%s\n" "$site" "$ctx" "$hir"
done
```

Expect 13×CTX + 13×HiRISE for the current Mars site roster. CTX files are typically 600 KB – 1.5 MB, HiRISE files 1.3 – 2.5 MB. **A file smaller than 200 KB is suspicious** — usually indicates an all-black or near-empty crop that slipped past the post-crop check.

### 2. Visual audit (the only reliable test)

Use Claude Code's `Read` tool on each `tier2-hirise.jpg` and each `tier2-ctx.jpg`. For each file, classify as one of:

| Verdict | Looks like |
|---|---|
| ✅ Real terrain | Visible craters, dunes, fractures, ridges, ejecta, or other coherent geological features |
| ❌ Noise (16-bit bug) | Uniform mottled mid-gray, no recognisable features, may have horizontal banding |
| ❌ Mostly black | Half the image is solid black or near-black; the other half may show terrain |
| ❌ Empty | Solid gray or solid black across the whole image |

Pixel statistics CAN NOT distinguish "real terrain that's mostly uniform" from "noise that has variance." Trust your eye.

### 3. End-to-end via the dev server

`npm run dev`, navigate to `/mars?site=curiosity&debug=1`, zoom in until the debug overlay shows `targetTier: 2, curTier: 2, tier2: 2built/2visible`. The patch should show clean HiRISE terrain in the centre surrounded by clean CTX context.

Repeat for each of the 13 sites — easy via `?site=<id>` URL parameter.

---

## Failure-mode → diagnosis matrix

When a fetch fails or produces visibly broken output, work this matrix top-to-bottom.

### Symptom: many sites produce uniform mottled gray output

→ **The UInt16→UInt8 stretch is broken or bypassed.** Check `gdal-crop.ts` `stretchToUint8()`:
- Has it been refactored to drop the typed-array dispatch?
- Is the main crop loop still calling it on each band before `band.pixels.write`?
- Is the pre-crop `assertTargetHasData` still calling it before `blackRatio`?

If `stretchToUint8` is intact, run `scripts/_hirise-pattern.ts` on one broken site:

```bash
node_modules/.bin/tsx scripts/_hirise-pattern.ts ESP_030313_1755 -4.59 137.44
```

The output dumps a 16×16 pixel sample. If you see alternating columns of `<small> <big> <small> <big>` (e.g. `1 242 1 240 1 220 ...`), the bug is back.

### Symptom: one polar-latitude site (lat > 60° or < -60°) produces 100% no-data on every candidate

→ **`correctHiriseProjection` is being applied to non-Equirectangular projections.** Check the projection-name guard:

```ts
if (projMatch?.[1] !== 'Equirectangular') return { xCorr: projX, yCorr: projY };
```

If guard is intact, run `scripts/_hirise-diag.ts` on one candidate:

```bash
node_modules/.bin/tsx scripts/_hirise-diag.ts ESP_017716_2485 68.22 -125.7
```

Check the WKT — if it shows `Polar_Stereographic` and the CORRECTED pixel is wildly out of bounds, the guard isn't being applied.

### Symptom: one site rejected on every candidate with consistent "X % no-data" where X > 25%

→ **The HiRISE coverage near the site has a swath gap.** This is rare but legitimate — the auto-picker tried 15 candidates and none had clean coverage at the target. Options:
1. **Check `lat_code` of rejected candidates**: do they all match the site's expected lat code (1800 ± 10·lat)? If they're all at a slightly-off lat code, you can manually search UAhirise for a closer-centred product and pin it.
2. **Loosen the pre-crop threshold** for this site only — there's no per-site override today (would need to add one). Pragmatic alternative: punt the site to CTX-only by removing `hotspot_tier2_source` from the sidecar.
3. **Accept it.** Some sites genuinely have no good HiRISE coverage (e.g. Mars 3 with its 100 km location uncertainty — no HiRISE swath is precise enough to be authoritative).

### Symptom: pinned product fails with `NO_DATA_AT_TARGET` despite the UAhirise page saying it covers the site

→ **The UAhirise text description is wrong, OR the pinned product's swath barely overlaps the bounding box.** Run `scripts/_hirise-diag.ts` to see the actual WKT corner coords vs your site. If the site lat is more than ~0.05° outside the swath centre's lat-band-code, the swath doesn't cover it regardless of what the marketing text says.

Action: drop the pin and let the auto-picker iterate. If the auto-picker also fails, see [previous symptom](#symptom-one-site-rejected-on-every-candidate-with-consistent-x-no-data-where-x--25).

### Symptom: pinned product fails with `latitude code in product ID doesn't match site lat`

→ **The pin is for the wrong site.** Decode the lat-code per [the naming convention](#hirise-product-naming-convention). If pin ends in `_2280` but your site is at +4°N, you've copied the wrong product ID — swap it.

---

## Diagnostics

Two ad-hoc diagnostic scripts live in `scripts/` (prefix `_` marks them as not-shipped, not in `package.json` scripts):

### `scripts/_hirise-diag.ts`

Loads a HiRISE JP2 from cache, prints projection metadata, maps a target (lat, lon) to pixel coordinates BOTH with and without the `correctHiriseProjection` compensation, reads a 32×32 sample around the target, reports mean / stddev / min / max / zero fraction. Use when you need to know **whether the projection is being handled correctly**.

```bash
node_modules/.bin/tsx scripts/_hirise-diag.ts <productId> <lat> <lon>

# Example:
node_modules/.bin/tsx scripts/_hirise-diag.ts ESP_030313_1755 -4.59 137.44
```

### `scripts/_hirise-pattern.ts`

Same as `_hirise-diag.ts` but instead of summary stats, dumps an actual 16×16 grid of pixel VALUES at the target. Use when you need to know **the actual byte pattern at the target pixel** — e.g. confirming the byte-interleave bug is back, or verifying the source raster genuinely contains real data at the target.

```bash
node_modules/.bin/tsx scripts/_hirise-pattern.ts <productId> <lat> <lon>
```

Both scripts only work if the JP2 has been previously downloaded by a full fetch run. They open from `.image-cache/hotspots/raw/<hash>.JP2`.

---

## Audit story — how the bugs were caught

(For posterity. If you re-derive any of this, skip ahead.)

**2026-05-21:** User reported HiRISE detail layer "looks 10× worse than CTX, brings no value" at close zoom on Curiosity. Side-by-side: CTX showed Gale Crater channels + dunes + the Bagnold Dunes ripple field; HiRISE showed uniform mottled gray.

**Audit method:** image-read each of the 13 Mars `tier2-hirise.jpg` files using Claude Code's `Read` tool, visually classify terrain vs noise. Found 4/13 broken (curiosity, mars-pathfinder, viking1-lander, viking2-lander) — all the early/pre-MRO landing sites with rich operator-research pins.

**Wrong hypothesis #1:** "The pinned products don't cover their sites." → Disproved via UAhirise product-page WebFetch on all 3 pins; all reported coverage matching the site coords within 0.04°.

**Wrong hypothesis #2:** "The fail-fast threshold of 95% no-data lets bad crops through." → Partly true (was raised from 0.95 to 0.25), but tightening alone didn't fix the underlying bug.

**The actual diagnosis:** `scripts/_hirise-pattern.ts` (written on the spot) dumped a 16×16 pixel sample at Curiosity's target. Output showed `242 1 240 1 240 1 ...` — perfectly alternating high+low bytes. Searched for "uint16 buffer uint8" in the crop code → found the byte-reinterpretation bug in 5 minutes.

**Fix:** `stretchToUint8()` helper with P2/P98 percentile stretch, applied to both the pre-crop sampler and the main crop loop.

**Second bug uncovered during verification:** After the type-fix re-run, Phoenix still failed with 100% no-data on every one of 15 candidates. `scripts/_hirise-diag.ts` on a Phoenix candidate showed `PROJECTION["Polar_Stereographic"]` with `latitude_of_origin = 90°` — the existing `correctHiriseProjection` was applying its Equirectangular-specific math (`cos(90°) = 0`, `R · π/2 = +5.3M m`) to polar coords, pushing the pixel address way out of bounds.

**Fix:** projection-name guard — apply the correction only for `Equirectangular`. All other projections (Polar_Stereographic, future Stereographic_South for south-pole sites, the LROC equirectangular for Moon) pass through GDAL's `transformPoint` unmodified.

**Outcome:** 13/13 Mars HiRISE crops now visually verified as real terrain, including the previously-accidentally-OK Phoenix which now shows its canonical ice-wedge polygon network at full P2/P98-stretched dynamic range. Plus future south-pole work (Artemis, Chang'e-6/7) gets the polar projection guard for free.

**See also:** GitHub issue [#248](https://github.com/chipi/orrery/issues/248) for the full retrospective and the failure-mode → fix matrix in one place.

---

## See also

- [image-pipeline-v2.md](./image-pipeline-v2.md) — the assets fetcher + variant generator that this pipeline plugs into
- [RFC-017](../rfc/RFC-017.md) — Tier 0–3 architecture, two-layer composition, source-attribution info card UX
- [PRD-014](../prd/PRD-014.md) — Surface Hotspots product requirements
- [ADR-046](../adr/ADR-046.md) — image-provenance fail-closed gate
- [ADR-059](../adr/ADR-059.md) — Tier 2 LOD dispatcher
- [`scripts/hotspots/gdal-crop.ts`](../../scripts/hotspots/gdal-crop.ts) — the crop primitive
- [`scripts/hotspots/fetch-mars.ts`](../../scripts/hotspots/fetch-mars.ts) — HiRISE orchestrator
- [`scripts/hotspots/fetch-mars-ctx.ts`](../../scripts/hotspots/fetch-mars-ctx.ts) — CTX orchestrator
- [`scripts/hotspots/ctx-mosaic.ts`](../../scripts/hotspots/ctx-mosaic.ts) — Murray Lab tile downloader

*— Orrery · `docs/guides/mars-hotspot-imagery.md` · May 2026*
