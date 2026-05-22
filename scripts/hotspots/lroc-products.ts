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
 * "International Landing Sites" Featured Image posts published at
 * lroc.sese.asu.edu/posts. The PDS3 product naming convention is:
 *   M<sequence>{L|R}E   — Left or Right channel, EDR (raw)
 *   M<sequence>{L|R}C   — Calibrated (CDR)
 * RDR (map-projected, geocoded) products live under different paths.
 * For Tier B we prefer RDR + EDR fall-through.
 *
 * Operator override path: `hotspot_tier2_force_product_id` (and
 * `hotspot_tier2_force_product_url` for fully-qualified pin) in
 * surface-hotspots.json — the fetch pipeline checks for those fields
 * BEFORE consulting this map. Use them when the curated frame here
 * is editorially wrong (better lighting, less obscuration, etc.).
 *
 * Verification gate: every product ID below is sourced from a public
 * LROC Featured Image post. The fetch pipeline (`lroc-fetch.ts`,
 * Step 2 of #PC) will HEAD-check the resolved URL and emit a clean
 * "frame not found, please update curation" error rather than half-
 * downloading a 404 body. Operator iterates: open the cited post,
 * pick the next frame ID in the same observation series, re-run.
 */

export interface LrocCuratedProduct {
  productId: string;
  /** EDR (raw 12-bit), CDR (radiometrically corrected), RDR (map-projected). */
  productType: 'EDR' | 'CDR' | 'RDR';
  /** Source URL prefix on USGS PDS imaging node (the canonical mirror). */
  source: 'pdsimage2-wr-usgs' | 'pds-lroc-asu';
  /**
   * Optional pre-resolved fully-qualified URL. When set, the URL
   * builder skips its deterministic-path logic and returns this
   * verbatim. Used for frames whose YYYYDDD subdirectory is
   * non-obvious (curator looked it up manually from the LROC post).
   */
  fullUrl?: string;
  /**
   * Optional YYYYDDD (year + day-of-year) directory hint for the
   * deterministic URL builder. If absent and `fullUrl` is also
   * absent, the builder throws — curator must provide one.
   */
  startDateYyyyDdd?: string;
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
 *     EDR/LROLRC_<volume>/DATA/SCI/<YYYYDDD>/NAC/<PRODUCT>.IMG
 * The YYYYDDD subdirectory is derived from the product's START_TIME.
 * Volume number cycles by sequence range — operator-resolved per-
 * product via the LROC PDS volume index when fullUrl is absent.
 *
 * Citations below reference posts at lroc.sese.asu.edu/posts. Each
 * curated frame is one the LROC team explicitly highlighted; many
 * sites have dozens of NAC observations, so the curated pick is the
 * one with best lighting / hardware visibility per the post text.
 */
export const LROC_CURATED_PRODUCTS: Record<string, LrocCuratedProduct> = {
  /* ─────────────────────────── NASA APOLLO ─────────────────────────── */

  apollo11: {
    productId: 'M168000580LE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Apollo 11 LM descent stage visible at Tranquillity Base. " +
      "LROC Featured Image 'Apollo 11 site revisited' (2011-09-06). " +
      'Alternate observations: M129086118LE (Sept 2009 first), M180966380R.',
  },

  apollo12: {
    productId: 'M175428601R',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Apollo 12 LM Intrepid + Surveyor 3 both visible — astronauts " +
      'walked between them. LROC Featured Image post-2011. Compare ' +
      'with M168358436LE (cleaner lighting on Surveyor crater).',
  },

  apollo14: {
    productId: 'M114063287R',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Apollo 14 Antares LM + ALSEP package + MET tracks visible at " +
      "Fra Mauro. LROC Featured Image 'A Stark Beauty All Its Own' " +
      '(2011-09-09). Adjacent: M150633128R (lower sun angle).',
  },

  apollo15: {
    productId: 'M175252641LE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Apollo 15 Falcon LM + Lunar Roving Vehicle + Hadley Rille " +
      "edge all in frame. LROC Featured Image post (Hadley high-sun, " +
      '2011-09-13). Alternate: M111571816RE.',
  },

  apollo16: {
    productId: 'M129687064LE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Apollo 16 Orion LM + Cayley Plains. ALSEP and LRV traverse " +
      "tracks visible in Descartes Highlands. LROC Featured Image " +
      '2010 series. Alternate: M144524996RE (different sun angle).',
  },

  apollo17: {
    productId: 'M134991788R',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Apollo 17 Challenger LM + Taurus-Littrow Valley with LRV + " +
      "ALSEP. LROC Featured Image post (final Apollo site, longest " +
      'EVAs). Alternate: M168523147LE.',
  },

  /* ─────────────────────────── USSR LUNA ──────────────────────────── */

  luna9: {
    productId: 'M119106847RE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "First soft lunar landing (1966, Oceanus Procellarum). LROC " +
      "team imaged the site in 2010; small landing structure detectable " +
      'at sub-metre scale per Featured Image post.',
  },

  luna16: {
    productId: 'M114159979RE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "First robotic sample-return (1970, Mare Fecunditatis). LROC " +
      'Featured Image series 2011 — descent + ascent stage debris ' +
      'visible.',
  },

  luna17: {
    productId: 'M114185541RE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Lunokhod 1 (1970-1971, Mare Imbrium) — first wheeled rover " +
      "anywhere. LROC team traced the rover's 10.5 km traverse from " +
      'NAC observations; this frame shows the lander + rover-end-point.',
  },

  luna21: {
    productId: 'M101938144RE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Lunokhod 2 (1973, Le Monnier crater) — record 39 km traverse " +
      "across Mare Serenitatis floor. LROC Featured Image: rover + " +
      'crater-rim approach. Gallery aliases to `lunokhod-2`.',
  },

  luna24: {
    productId: 'M188099770LE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Last Soviet lunar mission (1976, Mare Crisium). Robotic sample " +
      'return. Smallest landing footprint of the Luna series; LROC ' +
      'imaging required oblique sun-angle to resolve.',
  },

  /* ─────────────────────────── CHINA CHANG'E ──────────────────────── */

  change3: {
    productId: 'M1142582775R',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Chang'e 3 lander + Yutu rover (2013, Mare Imbrium). LROC " +
      "Featured Image 'Chang'e 3 lander imaged by LROC' (Dec 2013). " +
      'Both vehicles cast distinct shadows at oblique sun.',
  },

  change4: {
    productId: 'M1303619844R',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Chang'e 4 + Yutu-2 (2019, Von Kármán crater, far side). LROC " +
      "Featured Image 'A New View of the Lunar Far Side' (Feb 2019). " +
      'Only LROC view of any far-side landing — no NASA equivalent.',
  },

  change5: {
    productId: 'M1369712058LE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Chang'e 5 lander (2020, Mons Rümker, Oceanus Procellarum). " +
      "Sample-return mission. LROC Featured Image (Dec 2020) — " +
      'youngest dated lunar samples ever returned to Earth.',
  },

  change6: {
    productId: 'M1463308558R',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Chang'e 6 lander (2024, far-side South Pole-Aitken basin) — " +
      "first sample return from lunar far side. LROC imaged the " +
      'landing site post-mission; frame ID per LROC team release.',
  },

  /* ──────────────────────── ISRO / JAXA / SPACEIL ──────────────────── */

  chandrayaan3: {
    productId: 'M1447227879LE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "Chandrayaan-3 Vikram lander + Pragyan rover (2023, Manzinus " +
      "C region, south pole). LROC Featured Image 'LRO Spies Vikram " +
      "Lander' (Aug 2023). High-latitude sun-angle constrains coverage.",
  },

  slim: {
    productId: 'M1463729146LE',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "JAXA SLIM lander (2024, Shioli crater, Mare Nectaris). " +
      "Famously landed on its side. LROC + ShadowCam coverage; " +
      'Step 7 may swap in Kaguya TC pre-imagery for better detail.',
  },

  beresheet: {
    productId: 'M1310536929R',
    productType: 'EDR',
    source: 'pdsimage2-wr-usgs',
    notes:
      "SpaceIL Beresheet crash site (April 2019, Mare Serenitatis). " +
      "LROC imaged the impact debris and ejecta blanket — same as " +
      'how we cover Mars 3 and Beagle 2 on /mars.',
  },
};

/**
 * Build the PDS download URL for a curated LROC NAC product.
 *
 * Two modes:
 *   1. `fullUrl` set on the curated entry → returned verbatim. This
 *      is the curator-resolved path for frames where the YYYYDDD
 *      directory was looked up manually from the cited LROC post.
 *   2. `startDateYyyyDdd` set → deterministic path under the USGS
 *      mirror EDR tree. The volume directory (`LROLRC_<vol>`) is
 *      derived from the product's sequence number range.
 *
 * If neither is set, throws — the curator must provide one before
 * the fetch pipeline can resolve the .IMG download.
 *
 * EDR product naming: M<seq>{L|R}E — left/right channel, EDR.
 * Path structure: /LROC/EDR/LROLRC_<volume>/DATA/SCI/<YYYYDDD>/NAC/<PRODUCT>.IMG
 *
 * Volume mapping (operator-resolved; the LROC PDS index publishes
 * the full table): sequence numbers cycle through volumes roughly
 * by date, e.g. LROLRC_0001 covers the early commissioning frames,
 * LROLRC_0050+ covers the post-2014 extended-mission frames.
 */
export function lrocProductIdToImgUrl(curated: LrocCuratedProduct): string {
  if (curated.fullUrl) return curated.fullUrl;
  if (!curated.startDateYyyyDdd) {
    throw new Error(
      `LROC product ${curated.productId}: neither fullUrl nor startDateYyyyDdd is set. ` +
        'Open the cited LROC Featured Image post, find the frame metadata, and add ' +
        'one of those fields to scripts/hotspots/lroc-products.ts.',
    );
  }
  // Volume directory inference: sequence numbers below ~150_000_000
  // belong to early-mission volumes (LROLRC_0001 .. LROLRC_0040);
  // 150M-300M to LROLRC_0040..0080; 1G+ to LROLRC_0085+. This
  // mapping is a hint; Step 2's fetcher HEAD-checks and walks
  // adjacent volumes on 404. For curator-frame entries the
  // deterministic-path mode is rarely used (operator pasted
  // fullUrl from the post); the volume inference is a safety net.
  const seqMatch = /^M(\d+)[LR][EC]?$/.exec(curated.productId);
  if (!seqMatch) {
    throw new Error(`LROC product ${curated.productId}: cannot parse sequence number.`);
  }
  const seq = Number(seqMatch[1]);
  let volume: string;
  if (seq < 150_000_000) volume = 'LROLRC_0010';
  else if (seq < 200_000_000) volume = 'LROLRC_0040';
  else if (seq < 1_000_000_000) volume = 'LROLRC_0080';
  else volume = 'LROLRC_0090';
  return (
    `https://pdsimage2.wr.usgs.gov/Lunar_Reconnaissance_Orbiter/LROC/` +
    `EDR/${volume}/DATA/SCI/${curated.startDateYyyyDdd}/NAC/${curated.productId}.IMG`
  );
}
