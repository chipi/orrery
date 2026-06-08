import { promises as fs } from 'node:fs';
import path from 'node:path';
import { cropRemoteRasterToLatLon, CropError } from './gdal-crop.ts';
import { LROC_CURATED_PRODUCTS, lrocProductIdToImgUrl } from './lroc-products.ts';

/**
 * LROC NAC patch fetcher (PRD-014 / RFC-017 §S2, v0.7.x #PC Moon).
 *
 * Mirror of fetch-mars.ts's fetchOne(): given a Moon site id with a
 * curated LROC product entry, resolve the .IMG URL, HEAD-check it,
 * stream-crop to 2048² JPEG via GDAL, return crop metadata.
 *
 * Why HEAD-check first: the curated map carries product IDs picked
 * from public LROC Featured Image posts but the exact PDS volume +
 * YYYYDDD subdirectory has to be either (a) embedded in `fullUrl` by
 * the curator, or (b) inferred by the URL builder. Inference is
 * approximate; a fail-fast HEAD lets the operator see "frame not
 * found for X — open the post, update the curated entry" without
 * burning a full streaming download attempt against a 404.
 *
 * No HiRISE-style catalog fallback: there's no public LROC NAC point-
 * containment catalog query. Curated map IS the only candidate path.
 * If the curated URL fails, the site is skipped + the operator
 * iterates on the curated entry.
 */

export class LrocFetchError extends Error {
  constructor(
    public code:
      | 'NO_CURATED_PRODUCT'
      | 'URL_BUILD_FAILED'
      | 'HEAD_404'
      | 'HEAD_FAILED'
      | 'CROP_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'LrocFetchError';
  }
}

export interface LrocFetchInput {
  siteId: string;
  /** Centre coordinates from moon-sites.json. */
  targetLat: number;
  targetLon: number;
  /** static/images/hotspots/moon/<site>/tier2-lroc.jpg */
  outputPath: string;
  /** Sidecar's hotspot_tier2_force_product_url, if any — wins over the curated map. */
  overrideUrl?: string;
  /** Crop window size in source-resolution pixels. Default 2048 (≈10 km
   *  at LROC NAC ROI _5M.IMG's 5 m/px native). Pass 3072 for the regional
   *  layer (≈15 km, covers a wider chunk of landing context). */
  cropSize?: number;
}

export interface LrocFetchResult {
  siteId: string;
  productId: string;
  sourceUrl: string;
  outputPath: string;
  cropMeta: {
    pixelX: number;
    pixelY: number;
    projection: string;
    resolutionMPerPx: number;
    bytes: number;
  };
}

/**
 * Resolve the URL to fetch for a given site:
 *   1. operator override (sidecar's force_product_url) wins,
 *   2. then the curated map.
 * Returns { productId, sourceUrl } or throws LrocFetchError.
 */
export function resolveLrocUrl(
  siteId: string,
  overrideUrl?: string,
): {
  productId: string;
  sourceUrl: string;
} {
  if (overrideUrl) {
    // Override path — assume the operator pasted a valid PDS URL.
    // Extract a "product id" from the filename for provenance.
    const match = /([A-Z0-9]+)\.(IMG|JP2|TIFF)$/i.exec(overrideUrl);
    const productId = match ? match[1] : 'OPERATOR_OVERRIDE';
    return { productId, sourceUrl: overrideUrl };
  }
  const curated = LROC_CURATED_PRODUCTS[siteId];
  if (!curated) {
    throw new LrocFetchError(
      'NO_CURATED_PRODUCT',
      `No LROC curated product for ${siteId} and no operator override. ` +
        `Add an entry to scripts/hotspots/lroc-products.ts or set ` +
        `hotspot_tier2_force_product_url on the site in surface-hotspots.json.`,
    );
  }
  try {
    const sourceUrl = lrocProductIdToImgUrl(curated);
    return { productId: curated.productId, sourceUrl };
  } catch (err) {
    throw new LrocFetchError('URL_BUILD_FAILED', (err as Error).message);
  }
}

/**
 * HEAD-check a URL with a small timeout — returns true on 2xx,
 * throws LrocFetchError on 4xx / 5xx / network failure. We use this
 * to fail fast before kicking off the GDAL /vsicurl/ stream (which
 * issues many range-reads and is much slower to fail).
 */
async function headCheck(url: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (res.status === 404) {
      throw new LrocFetchError(
        'HEAD_404',
        `LROC source URL returned 404: ${url}\n` +
          `  → Open the LROC Featured Image post cited in lroc-products.ts ` +
          `and verify the product ID + path. The PDS volume / YYYYDDD ` +
          `subdirectory may be wrong; pasting the post's direct URL into ` +
          `fullUrl is the cleanest fix.`,
      );
    }
    if (!res.ok) {
      throw new LrocFetchError('HEAD_FAILED', `LROC source URL returned ${res.status}: ${url}`);
    }
  } catch (err) {
    if (err instanceof LrocFetchError) throw err;
    throw new LrocFetchError(
      'HEAD_FAILED',
      `LROC HEAD request failed for ${url}: ${(err as Error).message}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a single Moon hotspot's LROC NAC patch.
 *
 * Steps:
 *   1. Resolve URL (override → curated map → throw).
 *   2. HEAD-check (fail fast on 404).
 *   3. GDAL crop via /vsicurl/ streaming.
 *   4. Ensure output directory exists.
 *   5. Return crop metadata.
 */
export async function fetchLrocPatch(input: LrocFetchInput): Promise<LrocFetchResult> {
  const { productId, sourceUrl } = resolveLrocUrl(input.siteId, input.overrideUrl);

  await headCheck(sourceUrl);

  // GDAL needs the target directory to exist; mkdir -p semantics.
  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });

  try {
    const crop = await cropRemoteRasterToLatLon({
      sourceUrl,
      targetLat: input.targetLat,
      targetLon: input.targetLon,
      outputPath: input.outputPath,
      cropSize: input.cropSize ?? 2048,
      jpegQuality: 88,
    });
    return {
      siteId: input.siteId,
      productId,
      sourceUrl,
      outputPath: input.outputPath,
      cropMeta: {
        pixelX: crop.sourcePixelX,
        pixelY: crop.sourcePixelY,
        projection: crop.sourceProjection,
        resolutionMPerPx: crop.resolutionMPerPx,
        bytes: crop.outputBytes,
      },
    };
  } catch (err) {
    if (err instanceof CropError) {
      throw new LrocFetchError(
        'CROP_FAILED',
        `GDAL crop failed for ${input.siteId} (${productId}): ${err.code} — ${err.message}`,
      );
    }
    throw err;
  }
}
