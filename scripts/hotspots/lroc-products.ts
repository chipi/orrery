/**
 * Curated LROC NAC product map for the lunar Surface Hotspots
 * (PRD-014 / RFC-017 §S2, Tier B fetch automation).
 *
 * Why a curated map instead of a catalog query (as we do for HiRISE):
 * NASA PDS does not expose a stable "find frame at lat/lon" REST API
 * for LROC NAC. Curated per-site map + deterministic PDS download URL
 * is the supported path.
 *
 * **Why NOT raw LROC NAC EDR:** discovered during Step 2 (2026-05-22)
 * that EDR products (LRO-L-LROC-2-EDR-V1.0) are raw uncalibrated AND
 * unprojected — they carry no spatial reference, so GDAL cannot map
 * (lat, lon) → pixel without external ISIS3 projection. EDR is the
 * wrong tier for an automated GDAL pipeline.
 *
 * **What we use instead:** LROC RDR Browse Data Records (BDR) NAC ROI
 * mosaics at `/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/DATA/BDR/NAC_ROI/
 * <ROI_NAME>/`. The LROC team publishes these per landing-site /
 * region-of-interest, fully projected to equirectangular (or polar
 * stereographic for high-latitude sites). The `_5M.IMG` variant is
 * a 5 m/px downsample of the full ROI; that's the granularity we
 * pull and then GDAL-crop a 2048² JPEG centred on the site lat/lon.
 *
 * **Coverage today (12/18 sites):** all 6 Apollo + Luna 9 + Luna 24 +
 * Chang'e 4 + Chang'e 6 + Chandrayaan-3 + Beresheet have a direct
 * NAC ROI match. 6 sites (luna16, luna17, luna21, change3, change5,
 * slim) don't have a published ROI in BDR; they fall through to
 * operator-override (hand-curated published Featured Image URL via
 * `hotspot_tier2_force_product_url` on the sidecar), or wait for the
 * LROC team to publish an ROI in their next release.
 *
 * Operator override path: `hotspot_tier2_force_product_url` in
 * surface-hotspots.json — the fetch pipeline checks for that field
 * BEFORE consulting this map. Use it to pin a specific URL (LROC
 * Featured Image, ASU Quickmap export, etc.) when no BDR ROI exists.
 */

export interface LrocCuratedProduct {
  /** Display label — typically the BDR NAC ROI name. */
  productId: string;
  /** Source type: BDR projected (most), EDR (legacy/raw — unused),
   *  or FEATURED_IMAGE_JPEG (operator-supplied published view). */
  productType: 'BDR_NAC_ROI' | 'EDR' | 'FEATURED_IMAGE_JPEG';
  /** Pre-resolved fully-qualified URL. Required for BDR + FEATURED_IMAGE.
   *  Filename carries an ROI-specific lat/lon hash so deterministic
   *  path generation is not feasible — every entry pastes the verified
   *  HEAD-200 URL. */
  fullUrl: string;
  /** Citation / curator notes. */
  notes: string;
}

/**
 * Curated BDR NAC_ROI per landing site (12/18 covered today). Sites
 * NOT in this map (luna16/luna17/luna21/change3/change5/slim) fall
 * through to (a) operator override via sidecar's
 * hotspot_tier2_force_product_url, or (b) clean "no product
 * configured" log + skip.
 *
 * The `_5M.IMG` files vary in size from 21 MB (APOLLO17HIA, smallest
 * ROI) to 909 MB (MANZINUSLOA, large polar coverage of Chandrayaan-3
 * region). Avg ~250 MB per site. GDAL `/vsicurl/` range-reads only
 * the relevant tile so we don't actually transfer the whole .IMG.
 */
export const LROC_CURATED_PRODUCTS: Record<string, LrocCuratedProduct> = {
  /* ─────────────────────────── NASA APOLLO ─────────────────────────── */

  apollo11: {
    productId: 'APOLLO11HIA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/APOLLO11HIA/NAC_ROI_APOLLO11HIA_E010N0234_5M.IMG',
    notes:
      'Apollo 11 / Tranquillity Base NAC ROI, 5 m/px downsample of ' +
      'the full BDR mosaic. LM Eagle descent stage visible at the ROI ' +
      'centre. Published by LROC team under PDS RDR V1.0; backed by ' +
      'M168000580 + many other NAC observations.',
  },

  apollo12: {
    productId: 'APOLLO12LOA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/APOLLO12LOA/NAC_ROI_APOLLO12LOA_E024S3368_5M.IMG',
    notes:
      'Apollo 12 / Surveyor 3 site NAC ROI. LM Intrepid + Surveyor 3 ' +
      'both visible — astronauts walked between them. 5 m/px.',
  },

  apollo14: {
    productId: 'APOLLO14LOA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/APOLLO14LOA/NAC_ROI_APOLLO14LOA_E038S3426_5M.IMG',
    notes:
      'Apollo 14 / Fra Mauro NAC ROI. Antares LM + ALSEP package + ' +
      'MET tracks visible. 5 m/px.',
  },

  apollo15: {
    productId: 'APOLLO15HIA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/APOLLO15HIA/NAC_ROI_APOLLO15HIA_E259N0036_5M.IMG',
    notes:
      'Apollo 15 / Hadley Rille NAC ROI. Falcon LM + Lunar Roving ' +
      'Vehicle + rille edge in frame. 5 m/px.',
  },

  apollo16: {
    productId: 'APOLLO16HIA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/APOLLO16HIA/NAC_ROI_APOLLO16HIA_E091S0152_5M.IMG',
    notes:
      'Apollo 16 / Descartes Highlands NAC ROI. Orion LM + Cayley ' +
      'Plains. ALSEP + LRV traverse tracks. 5 m/px.',
  },

  apollo17: {
    productId: 'APOLLO17HIA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/APOLLO17HIA/NAC_ROI_APOLLO17HIA_E201N0303_5M.IMG',
    notes:
      'Apollo 17 / Taurus-Littrow NAC ROI. Challenger LM + LRV + ' +
      'ALSEP. Final Apollo site, longest EVAs. 5 m/px.',
  },

  /* ─────────────────────────── USSR LUNA ──────────────────────────── */

  luna9: {
    productId: 'OCNSPRCLLOA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/OCNSPRCLLOA/NAC_ROI_OCNSPRCLLOA_E212N3082_5M.IMG',
    notes:
      'Oceanus Procellarum (Luna 9 region) NAC ROI. First soft lunar ' +
      'landing site (1966). 5 m/px regional view; landing structure ' +
      'is detectable only at full-res.',
  },

  // TODO luna16 — Mare Fecunditatis (no BDR NAC_ROI published). Wait
  // for LROC team to publish, or hand-curate a Featured Image URL
  // via sidecar's hotspot_tier2_force_product_url.

  // TODO luna17 — Mare Imbrium / Lunokhod 1 traverse (no BDR NAC_ROI).
  // The LROC team's "Lunokhod 1 traverse" Featured Image series could
  // be operator-pinned per-site.

  // TODO luna21 — Le Monnier / Lunokhod 2 (no BDR NAC_ROI). Same
  // operator-override path as luna17.

  luna24: {
    productId: 'MARECRISLOA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/MARECRISLOA/NAC_ROI_MARECRISLOA_E108N0588_5M.IMG',
    notes:
      'Mare Crisium (Luna 24 region) NAC ROI. Last Soviet lunar ' +
      'mission (1976, robotic sample return). 5 m/px.',
  },

  /* ─────────────────────────── CHINA CHANG'E ──────────────────────── */

  // TODO change3 — Mare Imbrium (no dedicated BDR NAC_ROI). LROC has
  // imaged the lander + Yutu rover; Featured Image URL can be pinned
  // via sidecar operator override.

  change4: {
    productId: 'AITKNCTRHIA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/AITKNCTRHIA/NAC_ROI_AITKNCTRHIA_E168S1734_5M.IMG',
    notes:
      "Aitken Center / Von Kármán crater (Chang'e 4 region) NAC ROI. " +
      'First far-side landing (2019). Only LROC view of any far-side ' +
      'landing — no NASA-Apollo equivalent. 5 m/px.',
  },

  // TODO change5 — Mons Rümker (no BDR NAC_ROI for the specific ridge;
  // generic MONS-prefix ROIs are different volcanic features).

  change6: {
    productId: 'APOLBASNHIA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/APOLBASNHIA/NAC_ROI_APOLBASNHIA_E370S2061_5M.IMG',
    notes:
      "Apollo Basin (Chang'e 6 region) NAC ROI. First sample return " +
      'from lunar far side (2024). 5 m/px.',
  },

  /* ──────────────────────── ISRO / JAXA / SPACEIL ──────────────────── */

  chandrayaan3: {
    productId: 'MANZINUSLOA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/MANZINUSLOA/NAC_ROI_MANZINUSLOA_P688S0212_5M.IMG',
    notes:
      'Manzinus crater (Chandrayaan-3 / Vikram lander region) NAC ROI. ' +
      'South pole; polar stereographic projection (P-prefix suffix). ' +
      '5 m/px, 909 MB — largest ROI in the curated set.',
  },

  // TODO slim — Shioli crater (no SHIO-prefix BDR NAC_ROI). Operator
  // override path with Kaguya TC pre-imagery may be the better Phase 2.5
  // pick anyway.

  beresheet: {
    productId: 'SERENITALOA',
    productType: 'BDR_NAC_ROI',
    fullUrl:
      'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/' +
      'DATA/BDR/NAC_ROI/SERENITALOA/NAC_ROI_SERENITALOA_E251N0253_5M.IMG',
    notes:
      'Mare Serenitatis (Beresheet crash region) NAC ROI. SpaceIL ' +
      'Beresheet impact site + ejecta blanket — same coverage approach ' +
      'as Mars 3 and Beagle 2 on /mars. 5 m/px.',
  },
};

/**
 * Return the source URL for a curated LROC product. With the BDR
 * NAC ROI pivot every curated entry carries a fully-qualified URL
 * verified via HEAD 200 at curation time, so this is a trivial
 * accessor. EDR / FEATURED_IMAGE entries (if added later) work the
 * same way — fullUrl is the contract.
 */
export function lrocProductIdToImgUrl(curated: LrocCuratedProduct): string {
  if (!curated.fullUrl) {
    throw new Error(
      `LROC product ${curated.productId}: missing fullUrl. Curated ` +
        'entries must paste the verified HEAD-200 URL — see ' +
        'scripts/hotspots/lroc-products.ts for the curation contract.',
    );
  }
  return curated.fullUrl;
}
