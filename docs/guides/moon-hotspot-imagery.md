# Moon Surface Hotspot Imagery — operator + maintainer guide

The Moon `/moon` route renders each landing site through four progressive tiers, mirroring the `/mars` four-tier shape:

| Tier | Source | Render | Scale |
|---|---|---|---|
| **0** | Vendored 2D silhouette | flat icon on the planet | overview (camR ≥ 60) |
| **1** | Vendored 3D lander/rover model | Three.js geometry | mid-zoom (camR ≈ 40-60) |
| **2** | **LROC NAC** (5 m/px BDR_NAC_ROI mosaic *or* hand-curated Featured Image) | disc, regional context | close-zoom (camR ≈ 33-50) |
| **3** | NASA / CNSA equirectangular panorama (4 of 18 Moon sites today) | inside-out skybox | "Stand at site" button |

Compared to Mars, Moon has **one** Tier 2 layer instead of two — the Chang'e 2 regional mosaic that would form a second outer ring (PRD-014 Phase 2 work) is not yet wired. The pipeline structure supports two layers (`hotspot_tier2_regional_source` is a recognised sidecar field, the route reads it), it's just empty today on every Moon site.

The architectural decisions live in [RFC-017](../rfc/RFC-017.md) and [PRD-014](../prd/PRD-014.md). **This guide is the operator + maintainer playbook**: which sources we fetch from, why, what to do when an LROC NAC frame returns 404, and how the Phase 2.5 hand-curated path works.

---

## Quick reference

| Want to … | Run |
|---|---|
| Fetch missing Tier 2 LROC patches for all Moon sites | `npm run images:hotspots -- --dest moon --layer lroc --missing-only` |
| Fetch one specific Moon site | `npm run images:hotspots -- --dest moon --site apollo11 --layer lroc` |
| Refresh hand-curated LROC Featured Image patches (Phase 2.5) | `npx tsx scripts/hotspots/fetch-moon-featured-images.ts` |
| Refresh Moon Tier 3 panoramas | `npm run images:hotspots -- --dest moon --layer tier3` |
| Dry-run a single Moon site (no network, prints resolved URL) | `npm run images:hotspots -- --dest moon --site apollo11 --dry-run --skip-score` |
| Audit on-disk coverage (no fetch) | `npm run images:hotspots -- --dest moon --list --skip-score` |

---

## Two sourcing paths

LROC NAC coverage of landing sites comes through **two complementary pipelines** because no single source covers every site:

### Path A — BDR NAC ROI mosaics (Apollo sites)

The LROC team publishes **Region of Interest (ROI) mosaics** under `/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/DATA/BDR/NAC_ROI/<NAME>/`. These are pre-projected (equirectangular for equatorial sites, polar stereographic for high-lat) and GDAL-friendly — perfect input for the existing `cropRemoteRasterToLatLon` pipeline that Mars uses for HiRISE.

**6 Apollo sites** are covered cleanly by this path:

| Site | ROI name | Filename suffix |
|---|---|---|
| apollo11 | APOLLO11HIA | `E010N0234_5M.IMG` |
| apollo12 | APOLLO12LOA | `E024S3368_5M.IMG` |
| apollo14 | APOLLO14LOA | `E038S3426_5M.IMG` |
| apollo15 | APOLLO15HIA | `E259N0036_5M.IMG` |
| apollo16 | APOLLO16HIA | `E091S0152_5M.IMG` |
| apollo17 | APOLLO17HIA | `E201N0303_5M.IMG` |

Curated map: `scripts/hotspots/lroc-products.ts` → `LROC_CURATED_PRODUCTS`. Each entry has `fullUrl` (the verified HEAD-200 URL) plus `notes` explaining the choice. Fetcher: `scripts/hotspots/lroc-fetch.ts` → `fetchLrocPatch` (URL HEAD-check → GDAL stream-crop → 2048² JPEG).

**Why not the other 12 sites with this path?** LROC team's BDR ROIs are organised by geographic feature (e.g. `OCNSPRCLLOA` = a specific area in Oceanus Procellarum, centred at ~21°N, -52°E), not by landing-site coordinates. Luna 9 is at 7°N, -64°E — about 1,400 km from any OCNSPRCL ROI. Same problem for Luna 16/17/21/24, Chang'e 3/4/5/6, Chandrayaan-3, SLIM, Beresheet. We learned this the hard way during Step 2 of the Moon epic — see commit history for the diagnostic trail.

### Path B — Hand-curated Featured Image JPEGs (Phase 2.5)

The LROC team's [Featured Image posts](https://lroc.im-ldi.com/) publish per-landing-site high-resolution NAC views, already cropped + framed editorially by the LROC team. We download these directly as JPEG/PNG, `sharp`-resize to 2048², save to disk. No GDAL projection step — these are pre-cropped views, not raw rasters.

**11 of the remaining 12 sites** covered by this path:

| Site | LROC post | URL fragment |
|---|---|---|
| change3 | [#637](https://lroc.im-ldi.com/images/637) | `/news/uploads/chang_e3_FI_opening.png` |
| change4 | [#1092](https://lroc.im-ldi.com/images/1092) | `/ckeditor_assets/pictures/749/content_M1303619844LR_Close_crop_anot50m.png` |
| change5 | [#1172](https://lroc.im-ldi.com/images/1172) | `/ckeditor_assets/pictures/974/content_CE5_1100p_Image_version2.png` |
| change6 | [#1374](https://lroc.im-ldi.com/images/1374) | `/ckeditor_assets/pictures/1457/content_CE6_FI_Header_425mmpp.png` |
| chandrayaan3 | [#1314](https://lroc.im-ldi.com/images/1314) | `/ckeditor_assets/pictures/1348/content_M1447750764_LRmos.warp.1100px1100p.clean.png` |
| slim | [#1358](https://lroc.im-ldi.com/images/1358) | `/ckeditor_assets/pictures/1418/content_ALIGN_aligned_M1460739214L.1100x1100.png` |
| beresheet | [#1101](https://lroc.im-ldi.com/images/1101) | `/ckeditor_assets/pictures/768/content_BeresheetImpact_after_box.png` |
| luna16 | [#10](https://lroc.im-ldi.com/images/10) | `/news/uploads/luna16_figure_900.png` |
| luna17 | [#402](https://lroc.im-ldi.com/images/402) | `/news/uploads/LROCiotw/lunokhod_1_big.png` |
| luna21 | [#699](https://lroc.im-ldi.com/images/699) | `/news/uploads/M175070494LR_thumb.png` |
| luna24 | [#461](https://lroc.im-ldi.com/images/461) | `/news/uploads/LROCiotw/luna24_rev_fig.png` |

Manifest + fetcher: `scripts/hotspots/fetch-moon-featured-images.ts`.

### The lone exception — luna9

The LROC team has **not yet located Luna 9** (the 1966 USSR first soft lunar landing). Soviet-era coordinates are too imprecise to image a sub-metre lander against a 1 km × 1 km uncertainty ellipse. `hotspot_tier_max` for luna9 stays at 1; the site renders Tier 0 + Tier 1 model only. If LROC publishes a Luna 9 location post in future, drop the URL into the Phase 2.5 manifest and re-run the fetcher.

---

## Coverage today

| Tier | Coverage |
|---|---|
| Tier 0 (silhouette) | 18/18 |
| Tier 1 (3D model) | 18/18 |
| Tier 2 (LROC patch) | 17/18 (luna9 deferred until LROC locates it) |
| Tier 3 (panorama) | 4/18 — apollo11, apollo14, apollo17, change4 (CC-BY-4.0 — first farside surface view ever) |

Tier 3 is the largest gap. Per PRD-014 the target list is ~12 sites across all agencies; remaining (Apollo 12/15/16; Chang'e 3/5/6; Chandrayaan-3; SLIM; Lunokhod 1/2; Luna 9 historic) is **Phase 2 follow-up work** — wide-aspect cylindrical sources are not readily available on Wikimedia today and need per-site curation against the Apollo Lunar Surface Journal + agency press archives.

---

## The Float32 reflectance trap (learned during Step 2)

BDR NAC ROI products store pixel data as **Float32 reflectance in [0..1]** — typical lunar mare regolith samples at ~0.045. The pre-existing `stretchToUint8` helper in `scripts/hotspots/gdal-crop.ts` was built for UInt16 HiRISE data and used `data[i] | 0` (bitwise-OR with zero) which floor-truncates Float32 reflectance values to 0. The pre-crop "no-data check" then sampled the truncated bytes, saw all zeros, and rejected every Moon site with `NO_DATA_AT_TARGET — Pre-crop 32×32 sample is 100% no-data`.

Fix: separate Float32/Float64 branch in `stretchToUint8` that computes percentile bounds in the float domain and maps linearly to [0, 255]. This unblocked all 6 Apollo BDR ROIs in a single commit.

**Lesson for future curators**: if you ever add a new GDAL source whose pixel data isn't UInt16, verify the stretch path handles its dtype.

---

## Moon palette for Tier 3 panoramas

Moon has **no atmosphere** so the sky is solid black at every elevation. The shared `panorama-padder.ts` knows two presets:

```ts
export const DEFAULT_MARS_PALETTE: MarsColourPalette = {
  skyHorizon: [200, 165, 130],  // warm tan
  skyZenith:  [120,  80,  55],  // deep salmon
  regolith:   [120,  70,  50],
  azimuthGap: [100,  75,  60],
};

export const DEFAULT_MOON_PALETTE: MarsColourPalette = {
  skyHorizon: [0, 0, 0],        // black — no atmosphere
  skyZenith:  [0, 0, 0],
  regolith:   [120, 120, 120],  // mid-grey lunar
  azimuthGap: [ 70,  70,  70],
};
```

`scripts/hotspots/fetch-moon-panoramas.ts` passes `DEFAULT_MOON_PALETTE` to the padder for every site. Per-site overrides are available for Soviet-era monochrome panoramas (warmer tone) or polar-region long-shadow imagery, same per-site overrides path as the Mars `palette?:` field.

---

## Provenance entries

Every patch upserts an entry into `static/data/image-provenance.json` via `buildLrocProvenanceEntry`. Schema:

```jsonc
{
  "id": "sha256(path)[:16]",
  "path": "/images/hotspots/moon/apollo11/tier2-lroc.jpg",
  "source_type": "direct-agency",
  "title": "LROC NAC <productId> — patch centred at <lat>°N <lon>°E",
  "author": "NASA / GSFC / Arizona State University",
  "agency": "NASA",
  "source_url": "https://pds.lroc.im-ldi.com/...",
  "license_short": "PD-NASA",
  "license_url": "https://www.nasa.gov/nasa-brand-center/images-and-media/",
  "license_rationale": "LROC NAC imagery is produced by NASA/GSFC/ASU; not subject to U.S. copyright per 17 U.S.C. §105...",
  "modifications": ["cropped-2048x2048-around-site-coords", "reencoded-jpeg-q88"],
  ...
}
```

The fail-closed `validate-data` gate scans `image-provenance.json` and refuses any file on disk that's not listed; the per-site `productId` for Phase 2.5 hand-curated entries uses the synthetic name `LROC_FEATURED_<SITEID>` (e.g. `LROC_FEATURED_BERESHEET`) so the gate accepts them.

---

## Validation runbook

After a fetch run:

1. **Spot-check 6 sites visually** — one per agency: apollo11 (NASA), luna9 (skip — N/A), change3 (CNSA), chandrayaan3 (ISRO), slim (JAXA), beresheet (SpaceIL).
2. Confirm the LROC patch loads + the `TierContext` info card pops bottom-left when zoomed in.
3. Confirm selection halo hides when promoted to Tier 2.
4. Confirm STORY tab auto-promotes on first Tier 2 reveal.
5. For Tier 3 sites (apollo11, apollo14, apollo17, change4): click **Stand at site** → confirm skybox loads + tilt clamps to ±20°.
6. `npm run preflight` green.

---

## What's next (deferred per PRD-014)

- **Phase 2 — Chang'e 2 mosaic regional layer.** Two-layer Tier 2 like Mars's CTX + HiRISE compose. **Research complete** (RFC-017 OQ-4 answered 2026-05-23):
  - CNSA publishes the full Chang'e 2 7 m/px global mosaic free since April 2018 at [moon.bao.ac.cn](https://moon.bao.ac.cn/ce5web/searchOrder-ce2En.do) (Chang'E-2 CCD Stereo Camera Level 2C scientific dataset, National Astronomical Observatories of China).
  - **No REST/tile API.** The portal requires JS-heavy interactive ordering — no URL-addressable tile pattern, no programmatic batch download. Auto-fetch is not feasible.
  - **Operator path**: manual download of mosaic sheets covering each landing site (746 sheets at 7 m/px globally; per-site fetch is manageable), upload as `static/images/hotspots/moon/<site>/tier2-regional.jpg`, set `hotspot_tier2_regional_source` in sidecar.
  - Frontend already handles two-layer composition (the moon route's `tier2Builder` reads `regionalTextureUrl` and `buildHotspotSurfacePatch` renders both discs). Once the per-site JPEG is on disk + the sidecar field is set, the layer just appears.
- **Phase 2.5 — site-specific premium detail.** Where Kaguya TC or Chandrayaan-2 OHRC offers sharper imagery than LROC NAC (SLIM Shioli pre-imagery, Chandrayaan-3 OHRC south-pole sub-30 cm/px), pin via sidecar's `hotspot_tier2_force_product_url`.
- **Tier 3 expansion.** Remaining 10/18: Chang'e 3/5/6, Chandrayaan-3 Pragyan, SLIM Sora-Q, Lunokhod 1/2 rover-cam, Luna 16/17/21/24. Not redistributed on Wikimedia in suitable wide-aspect cylindrical form; needs direct CNSA/ISRO/JAXA/Soviet-archive scrapes per agency.
