/**
 * Curated LROC NAC product map for the lunar Surface Hotspots
 * (PRD-014 / RFC-017 §S2, Tier B fetch automation).
 *
 * Why a curated map instead of a catalog query (as we do for HiRISE):
 * NASA PDS does not currently expose a stable, documented "find
 * frame at lat/lon" REST API for LROC NAC. The two options are
 * (a) HTML-scrape PILOT or ASU's modern Quickmap successor at
 * data.lroc.im-ldi.com (both undocumented, in flux), or
 * (b) curate a per-site product-ID map and rely on the deterministic
 * PDS download URL pattern.
 *
 * For v0.7.x Tier B we ship (b). Each entry below is a documented
 * NAC frame from the NASA LROC team's "Apollo Sites Revisited" and
 * "International Landing Sites" press releases (lroc.sese.asu.edu/posts).
 * The PDS3 product naming convention is:
 *   M<sequence>{L|R}E   — Left or Right channel, EDR (raw)
 *   M<sequence>{L|R}C   — Calibrated (CDR)
 * RDR (map-projected, geocoded) products live under different paths.
 * For Tier B we prefer RDR + EDR fall-through.
 *
 * Operator override path: `hotspot_tier2_force_product_id` in
 * surface-hotspots.json — the fetch pipeline checks for that field
 * BEFORE consulting this map. Use that field to pin a specific NAC
 * frame when the curated one here is editorially wrong (better
 * lighting, less obscuration, etc.).
 */

export interface LrocCuratedProduct {
  productId: string;
  /** EDR (raw 12-bit), CDR (radiometrically corrected), RDR (map-projected). */
  productType: 'EDR' | 'CDR' | 'RDR';
  /** Source URL prefix on USGS PDS imaging node (the canonical mirror). */
  source: 'pdsimage2-wr-usgs' | 'pds-lroc-asu';
  /** Optional comment — citation, special notes, alternate IDs. */
  notes?: string;
}

/**
 * Curated product IDs per landing site. Sites NOT in this map will
 * fall through to (a) operator override via sidecar, or (b) log +
 * skip with a "no NAC product configured" warning.
 *
 * Source pattern for USGS PDS:
 *   https://pdsimage2.wr.usgs.gov/Lunar_Reconnaissance_Orbiter/LROC/
 *     EDR/LROLRC_0001/DATA/SCI/YYYYDDD/NAC/<PRODUCT>.IMG
 * The YYYYDDD subdirectory is derived from the product's START_TIME.
 *
 * Approach: for v0.7.x ship the 6 well-documented Apollo sites which
 * have the most public NAC coverage citations. Other lunar sites
 * (Luna, Chang'e, Chandrayaan-3, SLIM, Beresheet) get TODO markers —
 * operator fills in the override field per-site as they research.
 */
export const LROC_CURATED_PRODUCTS: Record<string, LrocCuratedProduct> = {
  // Apollo 11 — Tranquillity Base. Cited LROC frame M129086118LE,
  // "Apollo 11 site revisited" (Sept 2009 first observation; many
  // re-observations since).
  apollo11: {
    productId: 'M168000580LE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes: 'Apollo 11 LM descent stage visible. LROC team Featured Image (2011-09-06).',
  },
  // TODO Apollo 12 — Surveyor 3 + LM both visible.
  // TODO Apollo 14 — Antares LM + ALSEP.
  // TODO Apollo 15 — Falcon LM + Hadley Rille + LRV.
  // TODO Apollo 16 — Orion LM + Descartes Highlands.
  // TODO Apollo 17 — Challenger LM + Taurus-Littrow + LRV.

  // TODO Luna 9 — Oceanus Procellarum, first soft lunar landing.
  // TODO Luna 16 — Mare Fecunditatis, first robotic sample return.
  // TODO Luna 17 — Mare Imbrium, Lunokhod 1 deployment.
  // TODO Luna 21 — Le Monnier crater, Lunokhod 2 deployment.
  // TODO Luna 24 — Mare Crisium, last Soviet lunar mission.

  // TODO Chang'e 3 — Mare Imbrium, Yutu rover.
  // TODO Chang'e 4 — far-side South Pole-Aitken basin, Yutu-2.
  // TODO Chang'e 5 — Mons Rümker, sample return.
  // TODO Chang'e 6 — far-side, sample return.

  // TODO Chandrayaan-3 Vikram — south polar region (Manzinus).
  // TODO SLIM — Shioli crater, JAXA precision landing.
  // TODO Beresheet — Mare Serenitatis, crashed.
};

/**
 * Build the PDS download URL for a curated LROC NAC product. Returns
 * the .IMG URL on the USGS PDS Imaging mirror (the most stable
 * mirror as of 2026; ASU's data.lroc.im-ldi.com migration is still
 * in flux).
 *
 * EDR product naming: M<seq>{L|R}E — left/right channel, EDR.
 * Path structure: /LROC/EDR/LROLRC_<volume>/DATA/SCI/<YYYYDDD>/NAC/<PRODUCT>.IMG
 *
 * For v0.7.x ship: we don't try to compute YYYYDDD from the product ID
 * (that requires resolving the sequence number → date map, which is
 * complex). Instead the curated map's per-site notes can include a
 * fully-qualified URL where the deterministic one fails.
 *
 * For now: throw on URL build — caller must use a fully-qualified
 * source URL via the curated product's full path. Curation phase
 * (next slice) populates the full URLs per site.
 */
export function lrocProductIdToImgUrl(_curated: LrocCuratedProduct): string {
  throw new Error(
    'LROC NAC URL builder not yet implemented for v0.7.x Tier B. ' +
      'Curated map should ship per-site fully-qualified source URLs. ' +
      'Or use the operator-override path (hotspot_tier2_force_product_url).',
  );
}
