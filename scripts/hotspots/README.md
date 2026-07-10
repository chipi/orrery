# Surface hotspot + panorama imagery pipeline

Self-contained sub-pipeline for `/earth` `/moon` `/mars` Tier-2 (zoom) + Tier-3 (panorama) + along-route detail imagery. Separate from the main mission-gallery pipeline — images live under `static/images/hotspots/<body>/<site>/` and are **excluded from WebP ladder** (stay full-res JPG — zoom-critical).

## Node 20 requirement (CRITICAL)

These scripts use `gdal-async` which ships a `node-v115` ABI binding. The shell's Node 25 (ABI 141) fails with `Cannot find module …/node-v141…/gdal.node`.

**Always run with Node 20:**
```bash
~/.nvm/versions/node/v20.20.2/bin/node --import tsx scripts/hotspots/<script>.ts
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
| `fetch-moon-featured-images.ts` | Moon Tier-2 DETAIL (robotic landers) | LROC Featured Images (pre-cropped PNGs) + orbital-surface guard (reject >40% near-black) + Kaguya failover. Clean (unannotated) frames from lroc.im-ldi.com. **MANDATORY:** regenerate variants after any base change. |
| `fetch-moon-kaguya-regional.ts` | Moon Tier-2 REGIONAL context | STAC search USGS Astrogeology ARD; GDAL `/vsicurl/` window-crop 2560² (~16 km) Kaguya TC COG at 6–12 m/px. No full-file downloads. **Monoscopic-first:** `rankScore ×1e6` ensures nominal MTF mapping wins over stereoscopic/spsupport soft frames. |
| `fetch-moon-traverse.ts` | Moon along-route detail patches | Apollo 16/17 only (map-projected LROC NAC). Samples polyline, crops 1024² tiles at native res. Other rovers = Kaguya regional-only (same res as context). |
| `fetch-mars-traverse.ts` | Mars along-route detail patches | Samples 5 rover traverses (Curiosity, Perseverance, Opportunity, Spirit, Zhurong) every ~2 km + curated stops. HiRISE crops 512 m @ 0.25 m/px. Cache-local: consecutive points reuse same HiRISE swath. |
| `regenerate-tier3-variants.mjs` | Variant rebuilder (NO vision API) | **REQUIRED:** after ANY hotspot base change. Regenerates `.1x1.jpg` variant at clamped resolution (MAX_VARIANT_LONG_SIDE=1920). Deterministic centred focal (0.5, 0.5) for equirectangular. |

## Self-crediting

Each fetcher upserts its own provenance entries — **no separate `build-image-provenance.ts` pass needed:**
- `buildPanoramaProvenanceEntry` → Tier-3 panoramas
- `buildLrocProvenanceEntry` → LROC Featured Images
- `buildKaguyaTcProvenanceEntry` → Kaguya regional
- `buildHiriseProvenanceEntry` → Mars HiRISE (traverse + landing)

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
