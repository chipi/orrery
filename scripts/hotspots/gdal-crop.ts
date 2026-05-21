import gdal from 'gdal-async';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * GDAL projection-aware crop for Surface Hotspots Tier 2 patches
 * (PRD-014 / RFC-017 §S2, Tier B fetch automation).
 *
 * Given a source product URL (LROC NAC JP2/IMG on lunar PDS, or
 * HiRISE RDR JP2 on UAHiRISE PDS) and a target lat/lon, opens the
 * raster via GDAL's `/vsicurl/` virtual filesystem (streaming
 * range-reads — no full download), reads the affine geo-transform +
 * spatial reference, projects (lat, lon) → pixel coordinates,
 * extracts a 2048×2048 window centred on that pixel, and saves as
 * JPEG q=88.
 *
 * Handles both equirectangular (most LROC NAC + most HiRISE RDR) and
 * stereographic (polar landing sites — Chandrayaan-3 at ~70°S, any
 * future Artemis south-pole missions). GDAL's `CoordinateTransform`
 * picks the right math based on the source's spatial reference.
 *
 * On failure: throws a typed error. Caller decides whether to skip
 * the site and move on, or fail the build. The Surface Hotspots
 * pipeline (fetch-hotspot-imagery.ts) uses skip semantics.
 */

export interface CropInput {
  /** Source raster URL — typically https://hirise-pds... or https://pdsimage2...
   *  Either this OR localRasterPath must be set. */
  sourceUrl?: string;
  /** Pre-fetched local raster path. Use this when the raster is
   *  already on disk (e.g. extracted from a ZIP archive by a
   *  custom fetcher like ctx-mosaic.ts). Either this OR sourceUrl
   *  must be set; localRasterPath wins when both are present. */
  localRasterPath?: string;
  /** Target latitude (planetocentric, degrees, +N). */
  targetLat: number;
  /** Target longitude (degrees, -180..+180 or 0..360 — GDAL handles both). */
  targetLon: number;
  /** Output JPEG path on disk. */
  outputPath: string;
  /** Output crop size in pixels. Default 2048. */
  cropSize?: number;
  /** JPEG quality. Default 88 per RFC-017 §ADR-060. */
  jpegQuality?: number;
}

export interface CropResult {
  outputPath: string;
  cropSize: number;
  sourcePixelX: number;
  sourcePixelY: number;
  sourceProjection: string;
  /** Best-effort metres-per-pixel at the crop centre. */
  resolutionMPerPx: number;
  /** Bytes written to disk. */
  outputBytes: number;
}

/**
 * Typed errors so the orchestrator can distinguish "this candidate
 * has no image data at the target — try the next one" from "the
 * download/IO genuinely failed".
 */
export type CropErrorCode =
  | 'NO_DATA_AT_TARGET' // pre-crop pixel sample is mostly zero
  | 'CROP_MOSTLY_BLACK' // post-crop JPEG is mostly black
  | 'DOWNLOAD_FAILED'; // fetch errored after all retries

export class CropError extends Error {
  constructor(
    public readonly code: CropErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CropError';
  }
}

const RASTER_CACHE_DIR = '.image-cache/hotspots/raw';

/** Threshold for the pre-crop sample: reject the candidate when
 *  more than 25 % of the 32×32 region around the target is no-data.
 *  HiRISE products have a wider bounding box than their actual swath,
 *  so a target can sit inside the bbox but near (or beyond) the swath
 *  edge and read mostly zeros. The previous 95 % threshold passed
 *  through 50 %-nodata samples which rendered as visible noise (not a
 *  clean black corner), and the diagnostic audit on 2026-05-21 found
 *  this had shipped broken Curiosity, Pathfinder, and Viking
 *  HiRISE patches. 25 % allows benign edge clipping (small footprint
 *  corners) but forces the auto-picker to fall through to the next
 *  candidate when the swath meaningfully misses the target. */
const PRE_CROP_NO_DATA_FRAC = 0.25;
/** Threshold for the post-crop output: reject if more than this
 *  fraction of the 2048² JPEG is at or near zero. Tightened from
 *  0.8 to 0.4 in the same audit — a half-black crop still renders
 *  as visible noise after gamma + JPEG, so 80 % was too lenient. */
const POST_CROP_BLACK_FRAC = 0.4;
/** Per-URL download attempts. JP2 codestream can't be resumed mid-
 *  file so each attempt starts from byte 0. */
const DOWNLOAD_MAX_ATTEMPTS = 3;

/**
 * Crop a 2048×2048 JPEG patch from a remote raster around a
 * lat/lon target. Downloads the source to a local cache on first
 * fetch, then opens from disk — much faster than /vsicurl/ because
 * JP2 codestream access patterns aren't friendly to HTTP range
 * requests (each pixel read can re-fetch tile headers; a single
 * 2048×2048 crop measured at ~16 min via /vsicurl/ vs ~1-2 min with
 * local cache). Subsequent runs hit the cache and skip download.
 */
export async function cropRemoteRasterToLatLon(input: CropInput): Promise<CropResult> {
  const cropSize = input.cropSize ?? 2048;
  const jpegQuality = input.jpegQuality ?? 88;

  if (!input.sourceUrl && !input.localRasterPath) {
    throw new Error('cropRemoteRasterToLatLon needs sourceUrl or localRasterPath');
  }
  const localPath = input.localRasterPath
    ? input.localRasterPath
    : await ensureLocalRaster(input.sourceUrl as string);
  const ds = await gdal.openAsync(localPath);

  try {
    const width = ds.rasterSize.x;
    const height = ds.rasterSize.y;
    if (width <= 0 || height <= 0) {
      throw new Error(`Source raster ${input.sourceUrl} has zero dimensions`);
    }
    const srcSrs = ds.srs;
    if (!srcSrs) {
      throw new Error(`Source raster ${input.sourceUrl} has no spatial reference`);
    }
    const gt = ds.geoTransform;
    if (!gt) {
      throw new Error(`Source raster ${input.sourceUrl} has no geo-transform`);
    }

    // Transform (lat, lon) → projected coords → pixel coords.
    // Source raster's SRS may be equirectangular Moon, equirectangular Mars,
    // stereographic polar (for high-latitude sites), etc. GDAL's
    // CoordinateTransformation handles most of them — but for HiRISE
    // Mars RDRs with `latitude_of_origin ≠ 0`, GDAL inverts the
    // Equirectangular projection convention used to author the raster
    // (applies lat_origin shift to Y but skips cos(lat_origin)
    // scaling on X). Compensate by parsing latitude_of_origin from
    // the WKT and applying both corrections.
    const llSrs = sourceGeographicSrs(srcSrs);
    const transform = new gdal.CoordinateTransformation(llSrs, srcSrs);
    const projected = transform.transformPoint(input.targetLon, input.targetLat);
    const wkt = srcSrs.toWKT();
    const { xCorr, yCorr } = correctHiriseProjection(wkt, projected.x, projected.y);
    const [px, py] = projectedToPixel(gt, xCorr, yCorr);

    // Fail-fast pre-crop check: read a 32×32 region centred on the
    // target pixel. If most of it is zero (HiRISE no-data is encoded
    // as zero), the picked frame's actual image data does not reach
    // this site even though its corner polygon contains it. Caller
    // retries with the next candidate without us doing the full
    // 2048² crop + JPEG encode + filesystem write.
    await assertTargetHasData(ds, px, py, width, height);

    // Extract window centred on (px, py). Clamp to raster bounds —
    // if the target is near an edge, the resulting window may be
    // smaller than 2048 (we accept it and pad rather than fail).
    const half = Math.floor(cropSize / 2);
    let left = Math.round(px - half);
    let top = Math.round(py - half);
    left = Math.max(0, Math.min(width - cropSize, left));
    top = Math.max(0, Math.min(height - cropSize, top));
    const actualW = Math.min(cropSize, width - left);
    const actualH = Math.min(cropSize, height - top);

    // Read the window for each band. LROC NAC + HiRISE single-band
    // greyscale → 1 band. HiRISE RGB → 3 bands. Future colour
    // products → variable. Iterate band count.
    const bands = ds.bands.count();
    const bandData: Buffer[] = [];
    for (let i = 1; i <= bands; i++) {
      const band = ds.bands.get(i);
      const data = await band.pixels.readAsync(left, top, actualW, actualH);
      bandData.push(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    }

    // Create the output JPEG in memory via GDAL's MEM driver, then
    // export through the JPEG driver. JPEG driver doesn't support
    // CreateCopy on /vsicurl/ for input.
    const memDriver = gdal.drivers.get('MEM');
    if (!memDriver) throw new Error('MEM driver not available');
    const memDs = memDriver.create('', actualW, actualH, bands, gdal.GDT_Byte);
    for (let i = 1; i <= bands; i++) {
      const band = memDs.bands.get(i);
      band.pixels.write(0, 0, actualW, actualH, new Uint8Array(bandData[i - 1]));
    }

    // Post-crop sanity: the pre-crop sample is small and can miss a
    // case where the target sits at a no-data pixel boundary with
    // only a sliver of real data nearby. A black-ratio check across
    // the assembled output catches the sliver case before we commit
    // the JPEG to its final path.
    const blackFrac = blackRatio(bandData[0]);
    if (blackFrac > POST_CROP_BLACK_FRAC) {
      throw new CropError(
        'CROP_MOSTLY_BLACK',
        `Crop is ${(blackFrac * 100).toFixed(0)}% no-data — frame footprint barely overlaps target`,
      );
    }

    await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
    const jpegDriver = gdal.drivers.get('JPEG');
    if (!jpegDriver) throw new Error('JPEG driver not available');
    jpegDriver.createCopy(input.outputPath, memDs, {
      QUALITY: String(jpegQuality),
    });
    memDs.close();

    const stat = await fs.stat(input.outputPath);
    const resolutionMPerPx = Math.hypot(gt[1], gt[2]);
    return {
      outputPath: input.outputPath,
      cropSize,
      sourcePixelX: Math.round(px),
      sourcePixelY: Math.round(py),
      sourceProjection: srcSrs.getAttrValue('PROJECTION') ?? 'unknown',
      resolutionMPerPx,
      outputBytes: stat.size,
    };
  } finally {
    ds.close();
  }
}

/**
 * Sample a 32×32 region centred on (px, py); throw NO_DATA_AT_TARGET
 * if too many pixels are zero. Clamps the window if the target is
 * close to a raster edge. Reads from band 1 only — for greyscale
 * (RED-channel HiRISE) that's enough; for RGB the red band alone
 * still tells us if it's a no-data region.
 */
async function assertTargetHasData(
  ds: gdal.Dataset,
  px: number,
  py: number,
  width: number,
  height: number,
): Promise<void> {
  const sampleSize = 32;
  const half = Math.floor(sampleSize / 2);
  let left = Math.round(px - half);
  let top = Math.round(py - half);
  left = Math.max(0, Math.min(width - sampleSize, left));
  top = Math.max(0, Math.min(height - sampleSize, top));
  const w = Math.min(sampleSize, width - left);
  const h = Math.min(sampleSize, height - top);
  if (w <= 0 || h <= 0) {
    throw new CropError('NO_DATA_AT_TARGET', 'Target pixel falls outside raster bounds');
  }
  const band = ds.bands.get(1);
  const data = await band.pixels.readAsync(left, top, w, h);
  const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const frac = blackRatio(buf);
  if (frac > PRE_CROP_NO_DATA_FRAC) {
    throw new CropError(
      'NO_DATA_AT_TARGET',
      `Pre-crop ${sampleSize}×${sampleSize} sample is ${(frac * 100).toFixed(0)}% no-data`,
    );
  }
}

/**
 * Fraction of bytes in a band buffer that are at or near zero
 * (HiRISE no-data is encoded as 0; a small ≤ 2 threshold catches
 * JPEG-decode rounding artifacts on later checks). Caller decides
 * the reject threshold.
 */
function blackRatio(buf: Buffer): number {
  if (buf.length === 0) return 1;
  let zeroes = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] <= 2) zeroes++;
  }
  return zeroes / buf.length;
}

/**
 * Download a source raster to the local cache. Cache key = SHA-256
 * of the URL (the source URL is the natural cache key — different
 * URLs map to different files; same URL across runs hits the cache).
 * Extension preserved from URL for GDAL driver auto-detection.
 *
 * Streams the response body to disk via Node's pipeline (so a 200 MB
 * JP2 doesn't blow Node's heap). Idempotent — second call with the
 * same URL returns the cached path immediately.
 */
async function ensureLocalRaster(sourceUrl: string): Promise<string> {
  await fs.mkdir(RASTER_CACHE_DIR, { recursive: true });
  const ext = path.extname(new URL(sourceUrl).pathname) || '.bin';
  const hash = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16);
  const cachePath = path.join(RASTER_CACHE_DIR, `${hash}${ext}`);
  if (existsSync(cachePath)) return cachePath;
  const tmpPath = `${cachePath}.tmp`;
  // HiRISE PDS frequently terminates large-file streams mid-flight
  // (observed 30-50% failure rate on 500 MB-1 GB JP2 transfers).
  // JP2 codestream cannot be resumed from a partial download, so each
  // attempt starts from byte 0. Exponential backoff between attempts
  // gives the server a moment to recover.
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= DOWNLOAD_MAX_ATTEMPTS; attempt++) {
    const label = attempt > 1 ? ` (attempt ${attempt}/${DOWNLOAD_MAX_ATTEMPTS})` : '';
    console.log(`  downloading ${sourceUrl.slice(0, 80)}…${label}`);
    const t0 = Date.now();
    // Clean any partial bytes from the previous attempt before retrying.
    if (existsSync(tmpPath)) await fs.unlink(tmpPath);
    try {
      const res = await fetch(sourceUrl);
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }
      await pipeline(
        Readable.fromWeb(res.body as unknown as import('node:stream/web').ReadableStream),
        createWriteStream(tmpPath),
      );
      await fs.rename(tmpPath, cachePath);
      const sz = (await fs.stat(cachePath)).size;
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  downloaded ${(sz / 1024 / 1024).toFixed(1)} MB in ${elapsed}s`);
      return cachePath;
    } catch (err) {
      lastErr = err;
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `  download attempt ${attempt} failed after ${elapsed}s: ${(err as Error).message}`,
      );
      if (attempt < DOWNLOAD_MAX_ATTEMPTS) {
        const backoffMs = 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
  // All attempts exhausted — leave the cache clean for the next run.
  if (existsSync(tmpPath)) await fs.unlink(tmpPath).catch(() => {});
  throw new CropError(
    'DOWNLOAD_FAILED',
    `Failed to download ${sourceUrl} after ${DOWNLOAD_MAX_ATTEMPTS} attempts: ${(lastErr as Error)?.message ?? 'unknown'}`,
  );
}

/**
 * HiRISE Mars RDRs use the Equirectangular projection with
 * `latitude_of_origin` set to the swath's center latitude (so x and
 * y both have units of true ground metres there). GDAL's WKT-to-
 * PROJ translation handles this by applying a Y-origin shift but
 * skipping the X cos-scaling — opposite of the convention used to
 * AUTHOR the raster's geo_transform. The result: for any raster
 * with `latitude_of_origin ≠ 0`, GDAL's projected coords are wrong
 * by `+R*lat0` in Y and `1/cos(lat0)` in X.
 *
 * Compensate by parsing latitude_of_origin + the SPHEROID radius
 * from the source WKT and applying the correction here. For rasters
 * with `latitude_of_origin = 0` (Plate Carrée), both corrections
 * are no-ops and the GDAL transform passes through unchanged.
 *
 * Empirically validated against PSP_001890_1995 (Mars Pathfinder):
 * GDAL gives projected (8696721, 242627), expected (8400234, 1131341)
 * for target (19.0949°N, 326.78°E). Correction recovers (8399924,
 * 1131451) — within rounding of expected.
 */
function correctHiriseProjection(
  wkt: string,
  projX: number,
  projY: number,
): { xCorr: number; yCorr: number } {
  const lat0Match = wkt.match(/PARAMETER\["latitude_of_origin",([-0-9.]+)\]/);
  const lat0Deg = lat0Match ? parseFloat(lat0Match[1]) : 0;
  if (lat0Deg === 0) return { xCorr: projX, yCorr: projY };
  const lat0Rad = (lat0Deg * Math.PI) / 180;
  // Parse the SPHEROID semi-major axis (R) from the WKT. Mars RDRs
  // use ~3394839.8 m; fall back to that if parsing fails.
  const rMatch = wkt.match(/SPHEROID\["[^"]*",([0-9.]+)/);
  const R = rMatch ? parseFloat(rMatch[1]) : 3394839.8133163;
  return {
    xCorr: projX * Math.cos(lat0Rad),
    yCorr: projY + R * lat0Rad,
  };
}

/**
 * Affine geo-transform inverse: projected (x, y) → pixel (col, row).
 * GDAL convention:
 *   X_geo = gt[0] + col*gt[1] + row*gt[2]
 *   Y_geo = gt[3] + col*gt[4] + row*gt[5]
 * Solve the 2×2 system for (col, row).
 */
function projectedToPixel(gt: number[], xGeo: number, yGeo: number): [number, number] {
  const dx = xGeo - gt[0];
  const dy = yGeo - gt[3];
  const det = gt[1] * gt[5] - gt[2] * gt[4];
  if (Math.abs(det) < 1e-12) {
    throw new Error('Degenerate geo-transform (determinant ≈ 0)');
  }
  const col = (dx * gt[5] - dy * gt[2]) / det;
  const row = (-dx * gt[4] + dy * gt[1]) / det;
  return [col, row];
}

/**
 * Build a geographic (lat/lon) SRS that shares the source raster's
 * datum/spheroid. For Moon NAC + Mars HiRISE the datum is set in the
 * source's spatial reference; cloneGeogCS() returns the GEOGCS
 * subtree, which is the geographic SRS sharing the same celestial-
 * body datum (Moon_2000, Mars_2000, etc.). CoordinateTransformation
 * then converts lat/lon → projected coords within the same body's
 * reference frame (critical — Earth WGS84 lat/lon means nothing on
 * the Moon).
 */
function sourceGeographicSrs(projectedSrs: gdal.SpatialReference): gdal.SpatialReference {
  const geo = projectedSrs.cloneGeogCS();
  if (!geo) {
    throw new Error('Source SRS has no GEOGCS subtree — cannot derive geographic reference');
  }
  return geo;
}
