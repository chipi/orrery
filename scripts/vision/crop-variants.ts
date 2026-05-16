import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Sharp-based variant generation (PRD-018 / RFC-022 §5.2).
 *
 * For each source image + focal point, produce three pre-cropped
 * variants at the project's standard aspect ratios:
 *
 *   1:1   — mobile thumbnails / fleet-gallery rows (Capacitor wrapper
 *           picks these via MOBILE=1 build per RFC-018 §4).
 *   4:3   — gallery cards on desktop + mobile.
 *   16:9  — desktop hero crops.
 *
 * Crop anchor = vision-API focal point ({x, y} as 0..1 of source).
 * Sharp's `extract` requires absolute pixels, so we resolve the focal
 * point against the source dimensions, then compute the crop window
 * that hits the target aspect with the focal point as close to its
 * centre as possible (clamped to image bounds — focal points near the
 * edges get a window that's pushed away from the boundary by the
 * minimum needed amount).
 *
 * Cache key per variant: SHA-256 over (source bytes + focal point +
 * target aspect + sharp major version). Time-based invalidation
 * explicitly NOT a thing per RFC-022 §5.4. Cache file = the cropped
 * output, ready to copy to its destination next to the source image.
 */

export const VARIANT_RATIOS = [
  { id: '1x1', w: 1, h: 1 } as const,
  { id: '4x3', w: 4, h: 3 } as const,
  { id: '16x9', w: 16, h: 9 } as const,
];

export type VariantRatio = (typeof VARIANT_RATIOS)[number]['id'];

const SHARP_MAJOR_VERSION = sharp.versions.vips.split('.')[0] ?? '8';
const CACHE_ROOT = '.image-cache';
const VARIANT_CACHE_DIR = path.join(CACHE_ROOT, 'variants');

export interface VariantResult {
  ratio: VariantRatio;
  outputPath: string;
  width: number;
  height: number;
  cached: boolean;
  cache_key: string;
}

export interface VariantInput {
  sourcePath: string;
  sourceBytes: Buffer;
  focalPoint: { x: number; y: number };
  /**
   * Output base path *without* the .ratio.jpg suffix. e.g. passing
   * `static/images/hotspots/moon/apollo11/tier2-lroc` yields
   * `tier2-lroc.1x1.jpg`, `tier2-lroc.4x3.jpg`, `tier2-lroc.16x9.jpg`.
   */
  outputBase: string;
  /** JPEG output quality (1-100). Default 85 — matches RFC-017 §ADR-060. */
  jpegQuality?: number;
  /** Force re-generate even if cache hit. */
  forceRefresh?: boolean;
}

/**
 * Generate all three variant files for one source image. Each variant
 * is cache-keyed independently so adding a 4th ratio later doesn't
 * invalidate the 3 existing ones. Returns one VariantResult per ratio.
 */
export async function generateVariants(input: VariantInput): Promise<VariantResult[]> {
  const quality = input.jpegQuality ?? 85;
  const meta = await sharp(input.sourceBytes).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`sharp could not read dimensions for ${input.sourcePath}`);
  }
  const results: VariantResult[] = [];
  await fs.mkdir(VARIANT_CACHE_DIR, { recursive: true });
  await fs.mkdir(path.dirname(input.outputBase), { recursive: true });
  for (const ratio of VARIANT_RATIOS) {
    const result = await generateOneVariant({
      sourceBytes: input.sourceBytes,
      sourceWidth: meta.width,
      sourceHeight: meta.height,
      focalPoint: input.focalPoint,
      ratio,
      outputPath: `${input.outputBase}.${ratio.id}.jpg`,
      jpegQuality: quality,
      forceRefresh: input.forceRefresh ?? false,
    });
    results.push(result);
  }
  return results;
}

async function generateOneVariant(input: {
  sourceBytes: Buffer;
  sourceWidth: number;
  sourceHeight: number;
  focalPoint: { x: number; y: number };
  ratio: (typeof VARIANT_RATIOS)[number];
  outputPath: string;
  jpegQuality: number;
  forceRefresh: boolean;
}): Promise<VariantResult> {
  const cacheKey = computeVariantCacheKey({
    sourceBytes: input.sourceBytes,
    focalPoint: input.focalPoint,
    ratioId: input.ratio.id,
  });
  const cachePath = path.join(VARIANT_CACHE_DIR, `${cacheKey.slice(0, 16)}.${input.ratio.id}.jpg`);
  let cached = false;
  if (!input.forceRefresh) {
    try {
      // Cache hit: copy cache file → output path; skip sharp work entirely.
      const cacheBytes = await fs.readFile(cachePath);
      await fs.writeFile(input.outputPath, cacheBytes);
      cached = true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
  if (!cached) {
    const window = computeCropWindow({
      sourceWidth: input.sourceWidth,
      sourceHeight: input.sourceHeight,
      focalPoint: input.focalPoint,
      ratioW: input.ratio.w,
      ratioH: input.ratio.h,
    });
    const outputBytes = await sharp(input.sourceBytes)
      .extract({
        left: window.left,
        top: window.top,
        width: window.width,
        height: window.height,
      })
      .jpeg({ quality: input.jpegQuality, mozjpeg: true })
      .toBuffer();
    await fs.writeFile(cachePath, outputBytes);
    await fs.writeFile(input.outputPath, outputBytes);
  }
  // Read final dimensions for the manifest. Cheap — re-reads metadata only.
  const out = await sharp(input.outputPath).metadata();
  return {
    ratio: input.ratio.id,
    outputPath: input.outputPath,
    width: out.width ?? 0,
    height: out.height ?? 0,
    cached,
    cache_key: cacheKey,
  };
}

/**
 * Compute the largest crop window inside the source that hits the
 * target aspect with the focal point as close to its centre as
 * possible. Clamps to image bounds — focal points within half a
 * window of the edge get the window pushed inward by the minimum
 * necessary amount (so the focal point is no longer dead-centre but
 * is still inside the frame).
 */
export function computeCropWindow(input: {
  sourceWidth: number;
  sourceHeight: number;
  focalPoint: { x: number; y: number };
  ratioW: number;
  ratioH: number;
}): { left: number; top: number; width: number; height: number } {
  const srcAspect = input.sourceWidth / input.sourceHeight;
  const tgtAspect = input.ratioW / input.ratioH;
  let cropW: number;
  let cropH: number;
  if (tgtAspect >= srcAspect) {
    // Target wider than source → bound by source width.
    cropW = input.sourceWidth;
    cropH = Math.round(cropW / tgtAspect);
  } else {
    // Target taller than source → bound by source height.
    cropH = input.sourceHeight;
    cropW = Math.round(cropH * tgtAspect);
  }
  // Place the crop centred on the focal point, then clamp to bounds.
  const focalPxX = input.focalPoint.x * input.sourceWidth;
  const focalPxY = input.focalPoint.y * input.sourceHeight;
  let left = Math.round(focalPxX - cropW / 2);
  let top = Math.round(focalPxY - cropH / 2);
  left = Math.max(0, Math.min(input.sourceWidth - cropW, left));
  top = Math.max(0, Math.min(input.sourceHeight - cropH, top));
  return { left, top, width: cropW, height: cropH };
}

function computeVariantCacheKey(input: {
  sourceBytes: Buffer;
  focalPoint: { x: number; y: number };
  ratioId: string;
}): string {
  const h = createHash('sha256');
  h.update(input.sourceBytes);
  h.update(' ');
  h.update(`${input.focalPoint.x.toFixed(6)},${input.focalPoint.y.toFixed(6)}`);
  h.update(' ');
  h.update(input.ratioId);
  h.update(' ');
  h.update(`sharp${SHARP_MAJOR_VERSION}`);
  return h.digest('hex');
}
