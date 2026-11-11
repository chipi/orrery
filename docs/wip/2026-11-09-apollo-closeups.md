# Apollo close-ups for the six tier-2 detail patches (#291) - research

Date: 2026-11-09. Read-only research; nothing in the repo was changed except this file. Probe scripts and crops live in the session scratchpad, not the repo.

## Headline

- LROC publishes **map-projected, georeferenced, north-up GeoTIFFs** of one low-altitude NAC frame per Apollo site under `https://lroc.im-ldi.com/data/support/featured_sites/Apollo/<NN>/<frame>.tif` (the "Featured Sites" tree the other sites' clean frames already come from). The 1000x562 `.jpg` next to them (the ones `fetch-moon-featured-images.ts` style URLs would hit) are page thumbnails and too small. The `.tif` is the usable product.
- Each `.tif` is 8-bit, one band, about 6400-8900 x 57900-73500 px, equirectangular Moon, 0.40-0.50 m/px grid, ~470-550 MB, one-row strips, `Accept-Ranges: bytes`. Opened through `/vsicurl/` with `gdal-async` (already a repo dependency), a 2400x2400 window read took about 15 s per site.
- **Licence is not what `provenance.ts` says.** See "Licence" below.
- **The site lat/lon in `moon-sites.json` (2 decimals) is 75-160 m from the real LM.** Harmless at 5 m/px, wrong at 0.4 m/px. See "Centring".

## Per-site table

Frame choice rule: lowest m/px from the 2011 low-altitude passes, then moderate incidence, then a visual check that the LM is in frame and the 3072 px window has no no-data strip. Pixel scale, incidence, slew are from each frame's Site Images page `https://lroc.im-ldi.com/featured_sites/apollo-<NN>/site_images/<frame lowercase>`. Grid m/px is from the GeoTIFF geotransform.

| Site | Best frame | Native / grid m/px | Incidence, slew | Window for 2048 px output | Fetchable by existing tools |
|---|---|---|---|---|---|
| apollo11 | M175124932R (2011-11-05) | 0.399 / 0.40 | 41 deg, 0 | 3072 px crop = 1229 m (0.60 m/px out); 2048 px crop = 819 m (0.40 m/px) | `.tif` yes via `/vsicurl/` + `cropRemoteRasterToLatLon` (needs `cropSize` > 2048 and the `.tif` allowed-extension env, see below). Featured-image script: no (it takes a flat jpg/png, no lat/lon crop) |
| apollo12 | M175428601R (2011-11-08) | 0.395 / 0.40 | 45 deg, 0 | 3072 px = 1229 m; 2048 px = 819 m | same as above. 3072 window had 3.4% zero (no-data) pixels along the swath edge (LM ~1450 px from the left edge); the 1229 m window clips a black strip on the left, so use <= ~2800 px or shift the crop |
| apollo14 | M168319885LR (2011-08-18) | 0.428 / 0.45 | 37 deg, 23.6 W | 3072 px = 1382 m (0.67 m/px out); 2048 px = 922 m | same. Chosen over M175388134R (0.417 / 0.40, 45 deg) because the 3072 window of the latter runs off the frame (6.4% zero, 371,712 px out of bounds). Slewed 23.6 deg, oblique |
| apollo15 | M175252641LR (2011-11-06) | 0.406 / 0.40 | 49 deg, 0 | 3072 px = 1229 m; 2048 px = 819 m | same. Visual check: LM, LRV tracks and ALSEP-side tracks visible, window clean |
| apollo16 | M175179080LR (2011-11-06) | 0.405 / 0.40 | 42 deg, 13.3 E | 3072 px = 1229 m; 2048 px = 819 m | same. Window clean (0% zero). Not visually inspected |
| apollo17 | M172717297R (2011-10-08) | 0.476 / 0.50 | 25 deg, 2.5 | 3072 px = 1536 m (0.75 m/px out); 2048 px = 1024 m | same. Window clean. Image is very dark (low-incidence / low reflectance DN); LM is a few px and needs a contrast stretch. The sharper M168000580R (0.416 / 0.45, slew -25.5) has 27% no-data in the window: rejected |

Other options considered: all frames from the 2009-2011 passes are on the same pages (about 22-24 per site). Frames at 0.47-0.54 m/px with incidence 55-85 deg are the long-shadow ones; 1.1-1.5 m/px frames are the 2009 high-altitude passes.

Credit line every LROC page uses: `NASA/GSFC/Arizona State University` (short form `NASA/GSFC/ASU`).

Fetch mechanics, verified:
- `scripts/hotspots/fetch-moon-traverse.ts:99-100` already sets `CPL_VSIL_CURL_ALLOWED_EXTENSIONS ??= '.IMG,.tif'` and `GDAL_DISABLE_READDIR_ON_OPEN`; `lroc-fetch.ts:149-165` calls `cropRemoteRasterToLatLon` with `cropSize` defaulting to 2048 and takes `overrideUrl` (the `hotspot_tier2_force_product_url` sidecar field) that wins over the curated map. A `.tif` URL passes `resolveLrocUrl` (`lroc-fetch.ts:80-86`; the product-id regex `([A-Z0-9]+)\.(IMG|JP2|TIFF)$` does not match `.tif`, so productId falls to `OPERATOR_OVERRIDE`, provenance would carry that string).
- `headCheck` (`lroc-fetch.ts:110`) uses a plain `fetch` HEAD; works on these URLs (HTTP 200, `Accept-Ranges: bytes`).
- Output is the existing 2048x2048 JPEG; at `cropSize` 3072 it would need a resize to 2048 (see `fetch-moon-traverse.ts` "native resolution" crop + `sharp`). I did not run the repo fetch tools; I read the frames with `gdal-async` directly.
- No new dependency is needed (`gdal-async`, `sharp` are present).

## Centring (important)

`moon-sites.json` has 2-decimal coordinates; the LROC Site Images pages give the LM pixel (`feature: {line, sample}`), which I converted through each GeoTIFF's equirectangular parameters. Metres of LM from the repo site point:

| Site | Site lat/lon in repo | LM from LROC feature pixel | LM offset from site point (N, E) |
|---|---|---|---|
| apollo11 | 0.67, 23.47 | 0.67415, 23.47315 | +126 m, +96 m (158 m) |
| apollo12 | -3.01, -23.42 | -3.01279, -23.42190 | -85 m, -58 m (103 m) |
| apollo14 | -3.65, -17.47 | -3.64589, -17.47194 | +125 m, -59 m (138 m) |
| apollo15 | 26.13, 3.63 | 26.13238, 3.63332 | +72 m, +91 m (116 m) |
| apollo16 | -8.97, 15.5 | -8.97340, 15.50099 | -103 m, +30 m (107 m) |
| apollo17 | 20.19, 30.77 | 20.19111, 30.77230 | +34 m, +65 m (73 m) |

Consequence: a crop centred on the repo lat/lon puts the LM 6-13% of a 1.2 km window off-centre, and the patch is drawn centred on the site point (`hotspot-surface-patch.ts`, annotations at offsets from that point). Either centre the crop on the real LM and update the site point/offsets, or accept an off-centre LM. This is a decision, not done.

## Licence

- `https://lroc.im-ldi.com/about/terms` (fetched 2026-11-09): products from the LROC PDS Data Node / NASA PDS interfaces are public domain. "Images available on the LROC website, including but not limited to Featured Images, Featured Sites, curated products, downloads and non-PDS interfaces ... are copyrighted." Educational use (news, schools, museums, other organisations) is permitted without prior permission with credit "NASA/GSFC/Arizona State University"; "All commercial use of LROC images not downloaded from the LROC PDS archive require prior permission."
- So the `featured_sites/*.tif` files are NOT PD-NASA by the site's own terms. I did not find the word "public domain" attached to Featured Sites; the opposite is stated.
- `scripts/hotspots/provenance.ts:482-485` writes `license_short: 'PD-NASA'` with rationale "not subject to U.S. copyright per 17 U.S.C. 105" for every LROC entry, including the 12 Featured-Image sites (`buildLrocProvenanceEntry`, called at `fetch-moon-featured-images.ts:266`). That label diverges from the terms page for anything fetched from lroc.im-ldi.com featured/curated trees. The BDR `_5M.IMG` Apollo products currently used (PDS archive) are PD. Orrery is non-commercial (memory note), so educational-use-with-credit fits, but the provenance label needs a different `license_short` than PD-NASA for these frames, or the repo's licence allowlist/gate has to accept it. Not checked: which gates (validate-data / license allowlist) would reject a new licence value.
- PD alternatives checked:
  - Apollo 17: USGS Astropedia `https://asc-astropedia.s3.us-west-2.amazonaws.com/Moon/Apollo/Traverse/Apollo17/ancillary/APOLLO17_ORTHOMOSAIC_50CM.TIFF` returns 200, 661,533,852 bytes. Already used by `fetch-moon-traverse.ts:32-34` for the 74 route patches (0.5 m/px, 512 m each). Same URL pattern for Apollo 11, 12, 14, 15, 16 returned 404.
  - Apollo 16: ODE SDPPHO at ~2 m/px (`fetch-moon-traverse.ts` ODE path); too coarse for the goal.
  - PDS `NAC_ROI` BDR: `pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/...` now 302-redirects to `pds.mcp.nasa.gov/data/store/img/...`; the `_5M.IMG` HEAD resolves (200, 241 MB for Apollo 11) with redirects followed. I probed `_2M`, `_1M`, `_0.5M`, `_50CM`, `_100CM` for APOLLO11HIA: all 404. The directory could not be listed (listing URLs 403/404), so no finer PDS ROI product was ruled in or out beyond those names.
  - PDS NAC EDR / CDR frames for the same observations: not map-projected without ISIS (`lroc-products.ts:10-14`); not pursued.

## 2. Traverses (cite file:line)

- Moon rover/EVA polylines: `static/data/moon-traverses/` has apollo15.json, apollo16.json, apollo17.json (plus apollo16/apollo17 `.route-patches.json`) and the five robotic rovers. `scripts/hotspots/build-moon-traverses.mjs:22-145` builds ONLY the five robotic rovers (luna17, luna21, change3, change4, chandrayaan3). The Apollo traverse files are produced by something else; not located in the scripts I read. Apollo 11, 12, 14 have no traverse file.
- The polyline is drawn independently of the tier-2 detail patch. `surface-traverses.ts:564-574` magnifies it around the site by `REGIONAL_PATCH_DIAMETER_WORLD_UNITS / regionalGroundM / (planetRadius/bodyRadiusM)`, keyed ONLY on `hotspot_tier2_regional_ground_m` (15360 for the Apollo sites, `author-moon-ground.mjs:45`). `hotspot_tier2_ground_m` plays no part (lines 568-574). `tpos` (576-590) places each vertex; the Line2 is added at `planetRadius + 0.05` (554).
- Therefore changing the detail patch's ground width from 10240 to ~1229 does not move or clip the traverse. A traverse longer than the detail patch simply extends past it over the regional layer; nothing clips it to the detail disc. Measured extents from the site point (my calc over the JSON points): apollo15 max 4925 m, apollo16 max 4389 m, apollo17 max 7413 m, vs a regional half-width of 7680 m. With a ~1.2 km detail patch, almost all of each traverse lies outside the detail disc, on the 5 m/px regional.
- Apollo 16 and 17 additionally carry along-route tiles: `has_route_patches` loaded at `src/lib/data/surface.ts:284-288,321-325`; tiles built at `surface-traverses.ts:958-1090`, each `ground_m: 512`, apollo17 74 tiles at 0.5 m/px (`APOLLO17_NAC_ORTHOMOSAIC_50CM`), apollo16 56 tiles at 2 m/px (SDPPHO). For these two sites `surface-markers.ts:436` skips drawing the landing regional (it is drawn at the traverse midpoint instead, `surface-traverses.ts:971-989`). The "start" tile (`apollo16` and `apollo17` route-patches entries, `id: "start"`, "Landing / drive start", 512 m) already covers the LM at 2 m/px (A16) and 0.5 m/px (A17); a new ~1.2 km LM close-up would overlay it. Z-order between the landing detail patch and route tiles (`rDet = planetRadius + 0.08`, line 1054) was not checked.
- Stale comment: `surface-markers.ts:428-435` says Moon traverses "no longer tile patches"; apollo16/17 do.
- Detail patch size on screen is set by the ratio: `hotspot-surface-patch.ts:229-230` (`REGIONAL_PATCH_DIAMETER_WORLD_UNITS` = 3.0, line 58, x ground/regional) and `surface-markers.ts:361-364` for the halo. A 1229 m / 15360 m ratio gives a detail disc of 0.24 world units; the 12 non-Apollo sites use 1000-1738 m detail over Kaguya regionals 12-35 km (`author-moon-ground.mjs:5-34`), so the ratio is within existing practice.

## 3. Annotation offsets

- `src/types/surface-site.ts:313-321`: `lat_offset_m` / `lon_offset_m` "are metres from the site's published lat/lon".
- `hotspot-surface-patch.ts:330-358` (`addAnnotationDots`): `M_TO_U = detailDiameter / (groundMeters ?? 1000)`; `x = lon_offset_m * M_TO_U`, `z = -lat_offset_m * M_TO_U` (north up); dots with `hypot(x,z) > radius*1.05` are skipped (line 355-356). So the offsets are metres from the patch centre and scale correctly to any `groundMeters`, as long as `hotspot_tier2_ground_m` is updated (it is passed at `surface-markers.ts:461`).
- Only apollo11 has annotations in `static/data/surface-hotspots.json`: `lm-descent-stage` (0,0), `us-flag` (2,-8), `lrrr` (-10,14), `easep` (-15,18), `plaque` (0,0). apollo12/14/15/16/17: none.
- Problems on a close-up patch, not yet fixed:
  1. The patch centre is the site point, which is 158 m from the real Apollo 11 LM (table above), so `lm-descent-stage` (0,0) would sit ~158 m (~260 px at 0.6 m/px) away from the descent stage in the image. The offsets (2..18 m) were authored against the LM, not the site point.
  2. Dot size is fixed in world units (`CircleGeometry(0.012)`, ring 0.018, lines 363-379). Detail diameter at 1229 m would be ~0.24u, so a 0.012u dot is ~10% of the patch radius and all five annotations (within ~20 m = ~0.004u) would overlap into one blob; at 10240 m they were already sub-pixel. `lm-descent-stage` and `plaque` share (0,0).

## NOT verified

- That each `feature: {line, sample}` is exactly the LM (I compared it to the repo lat/lon and to LROC's own known LM positions only by eye on Apollo 11, 15 and 12 crops; Apollo 14 and 16 crops not viewed; Apollo 17 crop is very dark and the LM is only a few px).
- Whether the crops look acceptable after contrast stretching (Apollo 17 and 12 are dim/uneven; no stretch tried).
- That ALSEP and individual tracks are visible in every window (I saw the LM plus tracks at Apollo 11, 15; Apollo 12 faint tracks; Apollo 17 faint tracks in the 2400 px crop of the other frame).
- That the repo's `cropRemoteRasterToLatLon` accepts these `.tif` URLs end to end (including no-data handling, `cropSize` > 2048, the `.tif` extension env var set only in `fetch-moon-traverse.ts`, and the `requireCentered`/slide-back behaviour at swath edges). I read windows directly with `gdal-async`, not through `gdal-crop.ts`.
- Longevity of the URLs; 470-550 MB files over HTTP ranges took ~15 s per window (one-row strips). No rate limiting seen (ODE gave HTTP 429 in the past per `fetch-moon-traverse.ts` comments).
- Licence handling in the repo: which checks consume `license_short`; whether LROC's terms permit the app's offline bundling and redistribution in the app's licence model.
- How Apollo 15/16/17 traverse JSON files are generated (not `build-moon-traverses.mjs`).
- Z-order of the new detail patch vs the Line2 (+0.05) and the route tiles (+0.08) at the landing site.
- The LROC "Apollo landing sites revisited" featured-image blog posts; I used the Featured Sites tree and Site Images pages instead and did not use WebSearch for them (1 of 10 searches used, for the licence).
- Whether `NAC_ROI` has finer-than-5M variants (only five name guesses for Apollo 11 probed).
- Apollo 11's `M168000580` mention in `lroc-products.ts:77-78`: LROC's pages list M168000580R under Apollo 17, not Apollo 11, so that note looks wrong; not confirmed against the ROI's actual source frames.

## Candidates (2026-11-09, staging only - nothing live changed)

Files (gitignored, `static/images/_staging/` is in `.gitignore:94`): `static/images/_staging/apollo-closeups/apollo{11,12,14,15,16,17}.jpg` (2048x2048, 8-bit grey, JPEG q88) and `sheet.jpg` (2584x1956, one row per site: current | candidate, labelled).

Method: `gdal-async` over `/vsicurl/` on the LROC Featured Sites `.tif`, window 2048x2048 native pixels centred on the LROC feature pixel of the LM, written with `sharp`. Repo tools not used: `cropRemoteRasterToLatLon` (`gdal-crop.ts:497`, `ensureLocalRaster`) downloads the whole 470-550 MB file via `fetch` into `.image-cache` first, and passes Uint8 bands through unstretched; `fetch-moon-featured-images.ts` only resizes a flat pre-cropped PNG/JPG (`sharp ... resize(2048, 2048)`, no stretch), so it cannot take these GeoTIFFs. Script: scratchpad `cand.mjs` (not in repo). Existing Featured-Image patches use 2048x2048 and `hotspot_tier2_ground_m` 1000-1738; the six Apollo patches are currently 10240 m (5 m/px).

LM coordinates: the LROC Site Images page of each frame carries the LM pixel (`feature: {line, sample}`), e.g. `https://lroc.im-ldi.com/featured_sites/apollo-11/site_images/m175124932r` (same pattern `apollo-NN/site_images/<frame lowercase>`). Converted through the GeoTIFF's own geotransform + EQUIRECTANGULAR MOON SRS (standard parallel = site latitude, so E-W metres/px is true at the site). Cross-check: NSSDCA places the Apollo 11 EASEP 17 m south of the LM at 0.6735 N, 23.4730 E (`https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C`), consistent with the LM at 0.67414 N. No independent source was checked for the other five; their positions rest on LROC's own feature pixel.

| Site | Frame | m/px | Ground (2048 px) | LM lat, lon (deg) | Window origin (x,y px) | No-data | Processing |
|---|---|---|---|---|---|---|---|
| apollo11 | M175124932R | 0.40 | 819.2 m | 0.67414, 23.47316 | 863, 32458 | 0 % | none |
| apollo12 | M175428601R | 0.40 | 819.2 m | -3.01280, -23.42189 | 715, 37654 | 0 % | none |
| apollo14 | M168319885LR (23.6 deg slew, oblique) | 0.45 | 921.6 m | -3.64590, -17.47193 | 2299, 29054 | 0 % | none |
| apollo15 | M175252641LR | 0.40 | 819.2 m | 26.13237, 3.63333 | 2619, 46821 | 0 % | none |
| apollo16 | M175179080LR | 0.40 | 819.2 m | -8.97341, 15.50100 | 2715, 26454 | 0 % | none |
| apollo17 | M172717297R | 0.50 | 1024 m | 20.19110, 30.77231 | 778, 25460 | 0 % | P2/P98 linear stretch 13-39 -> 0-255 (raw mean 23 of 255) |

Apollo 12: at 2048 px the window has no no-data (the left strip only appears at the 3072 px window in the research above), so no shift or shrink was needed. Apollo 17 stretch uses the same P2/P98 rule as `gdal-crop.ts` `stretchToUint8`, applied on non-zero pixels; it reads contrasty/bright on the highlands side, a gentler stretch (e.g. P1/P99.7) is an option if you want it. Apollo 15/16 are low-contrast raw (P2-P98 = 49-137 / 49-132) and left as the Featured-Image tier did (unstretched).

Values for `surface-hotspots.json` (not applied):
- `hotspot_tier2_ground_m`: apollo11 819.2, apollo12 819.2, apollo14 921.6, apollo15 819.2, apollo16 819.2, apollo17 1024.
- Centre: the patch is centred on the LM, so the site point should become the LM lat/lon above (the `moon-sites.json` points are 73-158 m off, table in "Centring"); otherwise the LM sits off-centre by that amount. The 2-decimal point and the 6-decimal LM differ, so a centre offset entry, if the schema has one, would be the N/E metres in the Centring table with the sign flipped; I did not check for such a field.

LM visibility, by my look at the central 400 px of each candidate: LM visible as the dark halo with bright spot at the crop centre in all six (apollo11, 12, 14, 15, 16, 17). Apollo 11 centre crop also shows tracks; a few tracks visible at 12, 14, 15, 16, 17.

### Annotations (apollo11 only)
With the crop centred on the LM the offsets (`lm-descent-stage` 0,0; `us-flag` 2,-8; `lrrr` -10,14; `easep` -15,18; `plaque` 0,0) are metres from the LM, which is what they were authored against, so they stay right in principle; they only worked when the site point was the LM. If the site point stays at the 2-decimal value they are 158 m off. I did not overlay them on the imagery, so whether each offset lands on the actual object (flag, LRRR, EASEP) is not verified; at 0.4 m/px the biggest is ~30 px from centre.
Dot size: fixed world units, `src/lib/hotspot-surface-patch.ts:358` `CircleGeometry(0.012, 16)` and `:372` `RingGeometry(0.013, 0.018, 16)` (the earlier report's line numbers 363-379 have shifted). On a 819 m patch the offsets span <= ~23 m = ~3 % of the diameter, so dots of 0.012 u on a ~0.2 u disc merge. Not changed.

### NOT verified
- Feature pixel = descent-stage centre for A12, 14, 15, 16, 17 (only the A11 NSSDCA cross-check was done); the LM looks centred by eye on the 400 px crops, not measured.
- Candidates not viewed in the app; no run of `validate-data`, variants (`regenerate-tier3-variants.mjs`) or provenance for the new `.tif` source (licence value `LROC-EDU`, `OPERATOR_OVERRIDE` product id issue above still open).
- Operator approval by eye is still pending; sheet label text on the current panels is small.
