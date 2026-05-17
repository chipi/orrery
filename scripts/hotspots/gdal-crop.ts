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
  /** Source raster URL — typically https://hirise-pds... or https://pdsimage2... */
  sourceUrl: string;
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

const RASTER_CACHE_DIR = '.image-cache/hotspots/raw';

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

  const localPath = await ensureLocalRaster(input.sourceUrl);
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
    // CoordinateTransformation handles all of them.
    const llSrs = sourceGeographicSrs(srcSrs);
    const transform = new gdal.CoordinateTransformation(llSrs, srcSrs);
    // GDAL convention: input is { x: longitude, y: latitude } for
    // geographic SRSes — same order as projected (x = east, y = north).
    const projected = transform.transformPoint(input.targetLon, input.targetLat);
    const [px, py] = projectedToPixel(gt, projected.x, projected.y);

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
  console.log(`  downloading ${sourceUrl.slice(0, 80)}…`);
  const t0 = Date.now();
  const res = await fetch(sourceUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${sourceUrl}: HTTP ${res.status}`);
  }
  // Write to .tmp then rename so partial downloads don't poison the
  // cache on interrupt.
  const tmpPath = `${cachePath}.tmp`;
  await pipeline(
    Readable.fromWeb(res.body as unknown as import('node:stream/web').ReadableStream),
    createWriteStream(tmpPath),
  );
  await fs.rename(tmpPath, cachePath);
  const sz = (await fs.stat(cachePath)).size;
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  downloaded ${(sz / 1024 / 1024).toFixed(1)} MB in ${elapsed}s`);
  return cachePath;
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
