# Surface hotspot + panorama imagery pipeline

Self-contained sub-pipeline for `/earth` `/moon` `/mars` Tier-2 (zoom) + Tier-3 (panorama) + along-route detail imagery. Separate from the main mission-gallery pipeline — images live under `static/images/hotspots/<body>/<site>/` and are **excluded from WebP ladder** (stay full-res JPG — zoom-critical).

## Node version requirement (CRITICAL)

These scripts use `gdal-async`, whose `npm ci` downloads a binding for the ABI of the Node that ran the install — the repo's pinned Node 22 gives `node-v127`. Any other Node (e.g. a shell's Node 25, ABI 141) fails with `Cannot find module …/node-v141…/gdal.node`.

**Always run with the repo's Node 22 (mise):**
```bash
mise exec -- node --import tsx scripts/hotspots/<script>.ts
```

Or via npm alias:
```bash
npm run images:hotspots -- <args>
```

## Tier taxonomy

| Tier | Purpose | Storage | Details |
|------|---------|---------|---------|
| **Tier 2** | Landing-site detail / regional context | `tier2-lroc.jpg`, `tier2-regional.jpg` | Optical cropped at native res (0.5–10 m/px). Moon = LROC NAC (Apollo detail) or Kaguya TC (robotic detail + regional). Mars = HiRISE detail + CTX regional. **Variants:** auto-regenerated `.1x1.jpg` consumed by surface-scene deepest-zoom display. |
| **Tier 3** | Full-sphere equirectangular panorama | `tier3-pan.jpg` | 4096×2048 JPEG (8192×4096 on showcase sites). Cylindrical / partial-360 source padded via `panorama-padder.ts`; sky gradient above horizon, regolith fading-to-shadow below. Sources cached in `.image-cache/hotspots/panoramas/` — re-pad is **offline**. |
| **Along-route** | Detail crops along rover traverse | `.route-patches.json` | 1024² tiles sampled every ~2 km + curated stops; HiRISE for Mars, LROC NAC for Apollo. Manifest: `static/data/{moon,mars}-traverses/<rover>.json`. |

## Scripts

| Script | Purpose | Notes |
|--------|---------|-------|
| `panorama-padder.ts` | Cylindrical→equirectangular padding library | Called by fetch-*-panoramas; sky/regolith colour per-site override; `groundColourAtRow` = regolith fading-to-shadow nadir (honest fill, not flat slab). |
| `fetch-moon-panoramas.ts` | Moon Tier-3 panorama orchestrator | Per-site: download source, pad, write `tier3-pan.jpg`, upsert provenance. Starter batch = Apollo 11/12/14/17. |
| `fetch-mars-panoramas.ts` | Mars Tier-3 panorama orchestrator | Per-site: 10 Mars sites (mars3/beagle2/schiaparelli omitted — no surface imagery). Optional 8K upgrade via `outWidth/outHeight`. |
| `fetch-earth-pads.ts [ids] [--detail-only] [--regional s2]` | Earth Tier-2 for the launch pads (#546) | Regional = EOX Sentinel-2 cloudless 2025, 16 km @ 10 m (CC BY-NC-SA 4.0; `--regional s2` re-picks a single Sentinel-2 scene). Detail per pad: NAIP exportImage (US, ~0.5 m/px), GSI tiles (Japan), LINZ aerial COGs (NZ, 0.1 m survey → 0.25 m/px; WebP-compressed TIFFs, so tags via `tiffinfo` and pixels via sharp — the bundled GDAL has no WEBP codec), else a 2.56 km EOX cloudless crop. After a run: `regenerate-tier3-variants.mjs`, then move the pads' old credit thumbs to `_staging` and run `build-credit-thumbs.mjs`. |
| `fetch-earth-panoramas.ts` | Earth Tier-3 pads with an open-licensed ground photo (6 sites) | Commons/agency sources; per-image edge-derived palette; strip rolled to texture azimuth 270° (the skybox's yaw-0 facing — see in-file comment). `srcAzimuthDeg` = angular COVERAGE, not direction. |
| `fetch-moon-featured-images.ts` | Moon Tier-2 DETAIL (robotic landers) | LROC Featured Images (pre-cropped PNGs) + orbital-surface guard (reject >40% near-black) + Kaguya failover. Clean (unannotated) frames from lroc.im-ldi.com. **MANDATORY:** regenerate variants after any base change. |
| `fetch-moon-kaguya-regional.ts` | Moon Tier-2 REGIONAL context | STAC search USGS Astrogeology ARD; GDAL `/vsicurl/` window-crop 2560² (~16 km) Kaguya TC COG at 6–12 m/px. No full-file downloads. **Monoscopic-first:** `rankScore ×1e6` ensures nominal MTF mapping wins over stereoscopic/spsupport soft frames. |
| `fetch-moon-traverse.ts` | Moon along-route detail patches | Apollo 16/17 only (map-projected LROC NAC). Samples polyline, crops 1024² tiles at native res. Other rovers = Kaguya regional-only (same res as context). |
| `fetch-mars.ts` (via `npm run images:hotspots -- --site S --layer hirise --skip-score`) | Mars Tier-2 DETAIL (HiRISE RDR, 0.25 m/px, 2048² = 512 m) | Ranks catalogue frames around the site (search radius grows with `location_uncertainty_m`), downloads up to 15 and keeps the first whose crop is whole: a crop more than 5 % no-data is rejected (InSight's first pick was 25 % past the frame edge, #641). `hotspot_tier2_force_product_id` pins a frame. Afterwards copy the crop to `masters/`, run `regenerate-tier3-variants.mjs` on it and rebuild its credit thumb (delete the old one, then `build-credit-thumbs.mjs`). |
| `fetch-mars-ctx.ts` (via `npm run images:hotspots -- --site S --skip-score`) | Mars Tier-2 REGIONAL (Murray Lab Global CTX Mosaic V01, 5 m/px, CC BY Murray Lab) | Rovers: the crop is centred on the traverse's arc-length midpoint and sized to the whole drive from there (×1.15, rounded up to 1 024 m, at least 3 072 px); the full crop goes to `masters/`, the served JPEG is downsampled to at most 4 096 px, and `hotspot_tier2_regional_ground_m` / the provenance centre come from the result. murray-lab.caltech.edu serves the wrong intermediate certificate: `ctx-mosaic.ts` adds the AIA-fetched one to a CA bundle and retries with verification on. **Always pass `--skip-score`** — the score step calls the paid vision API. |
| `fetch-mars-traverse.ts` | Mars along-route detail patches | Samples 5 rover traverses (Curiosity, Perseverance, Opportunity, Spirit, Zhurong) every ~2 km (`--interval-km 0.5` for Curiosity/Perseverance) + curated stops; `--max-black` rejects tiles cut by a frame edge; `--skip P1,P2` keeps bad frames out (dust-storm haze ranks first at Marathon Valley), `--prefer P` tries a frame first (tile a traced path from the frame it was traced on); the 2048 px crop is kept in `masters/`. HiRISE crops 512 m @ 0.25 m/px. Cache-local: consecutive points reuse same HiRISE swath. |
| `fetch-mer-traverse.ts --rover spirit\|opportunity` | Spirit / Opportunity traverse geometry + stops | The science team's localized path (PDS Geosciences Node tables behind the MER Analyst's Notebook), converted on the IAU sphere, tied to HiRISE where the rover's place is visible (lander, Duck Bay, Spirit Point; offset interpolated by distance driven), Douglas–Peucker 4 m. Stops sit on the path at their sol; labels kept by id. Run `fetch-mars-traverse.ts` after it. |
| `traverse-overlay.ts --rover R --product P --at lat,lon [--size-m] [--shift N,E]` | Traverse-on-HiRISE check (read-only) | Draws a rover's polyline and stops over a centred HiRISE crop; `--shift` previews an offset in metres before it becomes a tie. How every tie in `fetch-mer-traverse.ts` was measured and checked. |
| `build-zhurong-traverse.ts` | Zhurong traverse (geometry, stops, approximate sols) | No published waypoint table: traced from the wheel tracks on HiRISE ESP_073225_2055 (pixel points per crop, in the file) to the parked rover on ESP_077511_2055; stops by reported odometry × the published slip ratio; `point_sols` interpolated between dated milestones (`point_sols_approx`). Credited as Orrery's reconstruction. |
| `add-mmgis-point-sols.ts --rover curiosity\|perseverance` | Sol per point for the MMGIS traverses | Matches each polyline point to NASA's MMGIS drive waypoints (forward-only, 60-waypoint window) for `point_sols`; writes `length_km` (total `dist_total_m`), `last_sol`, `landing_sol: 0`. Geometry untouched. |
| `add-route-elevation.ts [--rover R]` | Elevation per point (`point_elev_m`) for the Journey profile | Curiosity / Perseverance: MMGIS waypoint `elev_geoid`. Spirit / Opportunity / Zhurong: sampled from the USGS HRSC + MOLA blended DEM (200 m) by range reads of its COG — no 11 GB download. Records `elev_source`. |
| `fetch-route-photos.ts [--rover R] [--skip-download]` | Rover photos along the route | Curated list `route-photos.json` (each sol quoted from the photo's caption). Masters → `build-display-ladder` → `add-card-rungs --stems` (320/640) → `<rover>.route-photos.json` placed by `point_sols`, `has_route_photos`. Then provenance (`apply-provenance-nasa.mjs` / `backfill-provenance-commons.ts`), alt text (`maps/2026-11-05-rover-route-alt/write-photo-alt.mjs`), approvals. |
| `fetch-context-layer.ts --body moon\|mars\|earth [--only ids] [--km 400] [--force]` | Context layer (between the 4K globe and the regional patch) | True-scale 400 km lat/lon box per site, read by range requests from a COG: LRO WAC (Moon), THEMIS day-IR quads joined in a VRT (Mars; polar quads > ±65° not joined). Averaged to 4096 px wide; colour = globe texture × mosaic detail, so the cap meets the globe without a seam. Writes `masters/hotspots/<body>/<site>/context.jpg`, `hotspot_context_source/_bounds`, a provenance row; then `build-display-ladder.mjs --only hotspots/<body>/<site>/context.jpg` for the 1024/2048/4096 rungs. Handles boxes across the raster's and the globe texture's longitude seams. |
| `regenerate-tier3-variants.mjs` | Variant rebuilder (NO vision API) | **REQUIRED:** after ANY hotspot base change. Regenerates `.1x1.jpg` variant at clamped resolution (MAX_VARIANT_LONG_SIDE=1920). Deterministic centred focal (0.5, 0.5) for equirectangular. |
| `panorama-entry-yaw.mjs [--write]` | Entry yaw for partial Tier-3 panoramas | Yaw 0 faces texture u = 0.75; a photograph padded into one slice of the canvas opened on padding. Finds the content (lit sky or textured ground; padding is black over flat grey), writes `panorama_metadata.entry_yaw_deg` = 360·(0.75 − u). **Re-run after any re-pad.** |
| `coreg-contact-sheet.mjs [site …]` | Mars co-registration review sheet (read-only) | One row per site: HiRISE detail, CTX central 512 m, CTX 15.4 km with a red box. Writes `/tmp/coreg-contact-sheet.jpg`. |
| `coreg-seam-test.mjs <site> [site …]` | Mars co-registration seam test (read-only) | HiRISE detail downsampled into the CTX context at its footprint; a visible seam means a misregistration. Writes `/tmp/coreg-seam-<site>.jpg`. |
| `zoom-sweep.mjs --body B --out DIR [--base URL] <site …>` | Landing-site zoom review (read-only, needs the dev server) | Wheels each site from the widest view to the closest zoom / flat view: frames at camR 100 … 30.2, a 3×3 contact sheet, every HUD change on the way (legend, altitude, scale bar, imagery card, flat view) and page errors per site. Run it over all of a body's sites after any change to the zoom bands, patches, labels or markers (#641 review: 80 sites on four bodies). |

## Self-crediting

Each fetcher upserts its own provenance entries — **no separate `build-image-provenance.ts` pass needed:**
- `buildPanoramaProvenanceEntry` → Tier-3 panoramas
- `buildLrocProvenanceEntry` → LROC Featured Images
- `buildKaguyaTcProvenanceEntry` → Kaguya regional
- `buildHiriseProvenanceEntry` → Mars HiRISE (traverse + landing)
- `buildNaipProvenanceEntry` / `buildSentinel2ProvenanceEntry` / `buildIgnProvenanceEntry` / `buildGsiProvenanceEntry` → Earth pad Tier-2 (#546)
- Earth Tier-3 panoramas build their `ProvenanceEntry` inline in `fetch-earth-panoramas.ts` (`buildPanoramaProvenanceEntry`'s license union has no CC0 / CC-BY-SA-4.0 / GODL-India)

The gate validates coverage: `npm run validate-data` checks every `surface-hotspots.json` Tier-2 source for on-disk files + manifest entries — no half-baked images reach origin.

## THE HALF-BAKED-TILE TRAP (critical gotcha)

**After ANY hotspot Tier-2 base image change, you MUST run `regenerate-tier3-variants.mjs` to rebuild `.1x1.jpg` — else it 404s to an empty tile at deepest zoom.**

Runtime (SurfaceScene.svelte, hotspot-surface-patch.ts) resolves deepest-zoom textures via `image-vision.json`'s `variants['1x1']` (pickVariant='thumbnail'). Fetch scripts write **only the 2048² base `.jpg`** — they do NOT regenerate variants. So if you re-point or re-fetch a base and stop there, the manifest keeps pointing at now-stale/missing `*.1x1.jpg`: loader 404s → **empty placeholder tile** (bit us on 6 Moon sites after clean-frame swap, 2026-06-25).

**Fix:**
```bash
node scripts/hotspots/regenerate-tier3-variants.mjs \
  static/images/hotspots/moon/<site>/tier2-lroc.jpg \
  static/images/hotspots/moon/<site>/tier2-regional.jpg
```

Post-clamp to MAX_VARIANT_LONG_SIDE (1920) — no vision-API cost, no manifest rewrite. **This is now gated:** `validate-data` mirrors the runtime resolve for every `surface-hotspots.json` Tier-2 source and fails preflight if a consumed variant is missing on disk. Don't `--no-verify` past it; run the regenerate command it prints.

## References

- **IMAGE-PIPELINE.md §"Surface hotspot + panorama imagery"** — full flow, sourcing choices, worked examples
- **AGENTS.md §"Image pipeline — gotchas"** — Kaguya monoscopic ranking, Tier-3 padding, panorama centering, **the half-baked-tile trap**
- **static/data/surface-hotspots.json** — hotspot-to-site wiring, Tier-2 extents, panorama metadata
- **docs/guides/mars-hotspot-imagery.md** — Mars-specific sourcing + colour balance
